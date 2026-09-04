using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Application.Features.Dashboard;

using HanZi.Server.Application.Features.Dashboard.Dtos;

public interface IDashboardService
{
    Task<Result<StudentHomeDto>> StudentHomeAsync(Guid studentId, CancellationToken ct = default);
    Task<Result<TeacherHomeDto>> TeacherHomeAsync(Guid teacherId, CancellationToken ct = default);
    Task<Result<AdminHomeDto>> AdminHomeAsync(CancellationToken ct = default);
    Task<Result<IReadOnlyList<AdminActivityDto>>> ActivityLogAsync(int take, CancellationToken ct = default);
}

public class DashboardService(AppDbContext db) : IDashboardService
{
    public async Task<Result<StudentHomeDto>> StudentHomeAsync(Guid studentId, CancellationToken ct = default)
    {
        var classIds = await db.Enrollments
            .Where(e => e.StudentId == studentId)
            .Select(e => e.ClassId)
            .ToListAsync(ct);

        var progresses = await db.Progresses
            .Include(p => p.Lesson)
            .Where(p => p.StudentId == studentId)
            .ToListAsync(ct);

        var gradedScores = await db.Submissions
            .Where(s => s.StudentId == studentId && s.Status == SubmissionStatus.Graded)
            .Select(s => s.FinalScore)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var assignmentIds = await db.Assignments
            .Where(a => classIds.Contains(a.ClassId) && a.DueAt >= now)
            .OrderBy(a => a.DueAt)
            .Select(a => new { a.Id, a.Title, a.ClassId, a.Class.Name, a.DueAt })
            .ToListAsync(ct);

        var submittedIds = await db.Submissions
            .Where(s => s.StudentId == studentId)
            .Select(s => s.AssignmentId)
            .ToListAsync(ct);

        var upcoming = assignmentIds
            .Where(a => !submittedIds.Contains(a.Id))
            .Take(5)
            .Select(a => new UpcomingAssignmentDto(a.Id, a.Title, a.ClassId, a.Name, a.DueAt))
            .ToList();

        // Tiến độ theo từng lớp: số bài đã chạm của giáo trình / tổng số bài
        var classes = await db.Classes
            .Include(c => c.Curriculum)
            .ThenInclude(c => c.Lessons)
            .Include(c => c.Teacher)
            .Where(c => classIds.Contains(c.Id))
            .ToListAsync(ct);

        var lessonIdsByCurriculum = classes.ToDictionary(
            c => c.Id,
            c => c.Curriculum.Lessons.Select(l => l.Id).ToList());

        var classDtos = classes.Select(c =>
        {
            var lessonIds = lessonIdsByCurriculum[c.Id];
            var studied = progresses.Count(p => lessonIds.Contains(p.LessonId));
            return new StudentClassDto(
                c.Id, c.Name, c.Teacher.FullName, c.Schedule, c.Room,
                c.Curriculum.NameVi, lessonIds.Count, studied,
                lessonIds.Count > 0 ? studied * 100 / lessonIds.Count : 0);
        }).ToList();

        var last = progresses.OrderByDescending(p => p.UpdatedAt).FirstOrDefault();

        return Result<StudentHomeDto>.Ok(new StudentHomeDto(
            upcoming.Count,
            progresses.Count(p => p.CurrentPart >= 5),
            gradedScores.Count > 0 ? Math.Round(gradedScores.Average(), 1) : 0,
            StreakDays(progresses.Select(p => p.UpdatedAt)),
            last is null ? null : new ContinueLearningDto(last.LessonId, last.Lesson.TitleZh, last.Lesson.TitleVi, last.CurrentPart),
            upcoming,
            classDtos));
    }

    public async Task<Result<TeacherHomeDto>> TeacherHomeAsync(Guid teacherId, CancellationToken ct = default)
    {
        var classIds = await db.Classes
            .Where(c => c.TeacherId == teacherId)
            .Select(c => c.Id)
            .ToListAsync(ct);

        var pendings = await db.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Where(s => classIds.Contains(s.Assignment.ClassId) && s.Status == SubmissionStatus.Submitted)
            .OrderBy(s => s.SubmittedAt)
            .ToListAsync(ct);

        var allSubs = await db.Submissions
            .Include(s => s.Assignment)
            .Where(s => classIds.Contains(s.Assignment.ClassId) && s.Status != SubmissionStatus.Doing)
            .ToListAsync(ct);

        var onTime = allSubs.Count(s => s.SubmittedAt <= s.Assignment.DueAt);

        var from = DateTime.UtcNow.Date.AddDays(-6);
        var last7 = allSubs
            .Where(s => s.SubmittedAt >= from)
            .GroupBy(s => s.SubmittedAt!.Value.Date)
            .Select(g => new DailySubmitDto(g.Key.ToString("dd/MM"), g.Count()))
            .OrderBy(d => d.Date)
            .ToList();

        return Result<TeacherHomeDto>.Ok(new TeacherHomeDto(
            pendings.Count,
            classIds.Count,
            await db.Curriculums.CountAsync(c => c.TeacherId == teacherId, ct),
            allSubs.Count > 0 ? Math.Round(onTime * 100m / allSubs.Count, 0) : 0,
            pendings.Take(5).Select(s => new TeacherPendingDto(
                s.Id, s.AssignmentId, s.Assignment.Title, s.Student.FullName, s.SubmittedAt ?? DateTime.UtcNow)).ToList(),
            last7));
    }

    public async Task<Result<AdminHomeDto>> AdminHomeAsync(CancellationToken ct = default)
    {
        var pendingGrading = await db.Submissions.CountAsync(s => s.Status == SubmissionStatus.Submitted, ct);

        var activities = await db.ActivityLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        var actorIds = activities.Where(a => a.ActorId is not null).Select(a => a.ActorId!.Value).Distinct().ToList();
        var actors = actorIds.Count > 0
            ? await db.Users.Where(u => actorIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct)
            : [];

        return Result<AdminHomeDto>.Ok(new AdminHomeDto(
            await db.Users.CountAsync(u => u.Role == UserRole.Student, ct),
            await db.Users.CountAsync(u => u.Role == UserRole.Teacher, ct),
            await db.Users.CountAsync(u => u.Role == UserRole.Admin, ct),
            await db.Users.CountAsync(u => u.Locked, ct),
            await db.Curriculums.CountAsync(ct),
            await db.Classes.CountAsync(ct),
            pendingGrading,
            activities.Select(a => new AdminActivityDto(
                a.Id, a.ActorId is null ? null : actors.GetValueOrDefault(a.ActorId.Value),
                a.Action, a.Entity, a.CreatedAt)).ToList()));
    }

    public async Task<Result<IReadOnlyList<AdminActivityDto>>> ActivityLogAsync(int take, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var activities = await db.ActivityLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

        var actorIds = activities.Where(a => a.ActorId is not null).Select(a => a.ActorId!.Value).Distinct().ToList();
        var actors = actorIds.Count > 0
            ? await db.Users.Where(u => actorIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct)
            : [];

        return Result<IReadOnlyList<AdminActivityDto>>.Ok(activities.Select(a => new AdminActivityDto(
            a.Id, a.ActorId is null ? null : actors.GetValueOrDefault(a.ActorId.Value),
            a.Action, a.Entity, a.CreatedAt)).ToList());
    }

    /// <summary>Chuỗi ngày học liên tiếp (tính tới hôm nay hoặc hôm qua).</summary>
    private static int StreakDays(IEnumerable<DateTime> dates)
    {
        var days = dates.Select(d => d.Date).Distinct().OrderByDescending(d => d).ToList();
        if (days.Count == 0) return 0;
        var today = DateTime.UtcNow.Date;
        if (days[0] < today.AddDays(-1)) return 0;

        var streak = 1;
        for (var i = 1; i < days.Count; i++)
        {
            if ((days[i - 1] - days[i]).Days != 1) break;
            streak++;
        }
        return streak;
    }
}
