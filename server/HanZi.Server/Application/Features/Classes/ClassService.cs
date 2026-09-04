using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Application.Features.Classes;

using HanZi.Server.Application.Features.Classes.Dtos;

public interface IClassService
{
    Task<Result<IReadOnlyList<ClassListDto>>> ListAsync(Guid? teacherId, Guid? studentId, CancellationToken ct = default);
    Task<Result<ClassDetailDto>> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<ClassListDto>> CreateAsync(ClassCreateRequest req, Guid teacherId, CancellationToken ct = default);
    Task<Result> EnrollAsync(Guid classId, IReadOnlyList<Guid> studentIds, CancellationToken ct = default);
    Task<Result> RemoveStudentAsync(Guid classId, Guid studentId, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result> JoinAsync(Guid studentId, string code, CancellationToken ct = default);
    Task<Result> ApproveEnrollmentAsync(Guid classId, Guid studentId, bool approve, CancellationToken ct = default);
    Task<Result<IReadOnlyList<AttendanceDayDto>>> GetAttendanceAsync(Guid classId, DateTime date, CancellationToken ct = default);
    Task<Result> SaveAttendanceAsync(Guid classId, DateTime date, IReadOnlyList<AttendanceMarkDto> marks, Guid actorId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<AttendanceMineDto>>> MyAttendanceAsync(Guid classId, Guid studentId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<AttendanceSummaryDto>>> GetAttendanceSummaryAsync(Guid classId, CancellationToken ct = default);
    /// <summary>Grid tiến độ theo bài: số phần đã học của từng học viên × từng bài học.</summary>
    Task<Result<LessonProgressDto>> LessonProgressAsync(Guid classId, CancellationToken ct = default);
    /// <summary>Cập nhật cấu hình lớp.</summary>
    Task<Result> UpdateAsync(Guid id, ClassUpdateRequest req, CancellationToken ct = default);
}

public class ClassService(
    IRepository<ClassRoom> classes,
    IRepository<Enrollment> enrollments,
    IRepository<Assignment> assignments,
    IRepository<User> users,
    IRepository<Attendance> attendances,
    IRepository<HanZi.Server.Domain.Entities.Progress> progresses,
    IRepository<Notification> notifications,
    IRepository<ActivityLog> activityLogs,
    IUnitOfWork uow) : IClassService
{
    public async Task<Result<IReadOnlyList<ClassListDto>>> ListAsync(Guid? teacherId, Guid? studentId, CancellationToken ct = default)
    {
        var spec = new Specification<ClassRoom>().Include("Enrollments").Include("Curriculum").Order(c => c.CreatedAt);
        if (teacherId is not null) spec.Where(c => c.TeacherId == teacherId);

        var list = await classes.ListAsync(spec, ct);

        if (studentId is not null)
            list = list.Where(c => c.Enrollments.Any(e => e.StudentId == studentId && !e.IsDeleted && e.Status == EnrollmentStatus.Approved)).ToList();

        // tên giáo viên: 1 truy vấn cho toàn bộ danh sách (tránh N+1)
        var teacherIds = list.Select(c => c.TeacherId).Distinct().ToList();
        var teachers = teacherIds.Count > 0
            ? await users.ListAsync(new Specification<User>().Where(u => teacherIds.Contains(u.Id)), ct)
            : [];

        var result = list.Select(c => new ClassListDto(
            c.Id, c.Code, c.Name, c.CurriculumId, c.Curriculum.NameVi,
            c.TeacherId, teachers.FirstOrDefault(t => t.Id == c.TeacherId)?.FullName,
            c.Schedule, c.Room, c.Status.ToString(),
            c.Enrollments.Count(e => !e.IsDeleted))).ToList();

        return Result<IReadOnlyList<ClassListDto>>.Ok(result);
    }

    public async Task<Result<ClassDetailDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var c = await classes.FirstOrDefaultAsync(
            new Specification<ClassRoom>()
                .Include("Enrollments.Student")
                .Include("Curriculum")
                .Include("Assignments")
                .Where(x => x.Id == id)
                .Split(), ct);
        if (c is null) return Result<ClassDetailDto>.Fail("Không tìm thấy lớp.", "NOT_FOUND");

        var teacher = await users.GetByIdAsync(c.TeacherId, ct);
        var assignments = c.Assignments.Where(a => !a.IsDeleted).ToList();

        return Result<ClassDetailDto>.Ok(new ClassDetailDto(
            c.Id, c.Code, c.Name, c.CurriculumId, c.Curriculum.NameVi,
            c.TeacherId, teacher?.FullName ?? "", c.Schedule, c.Room, c.Status.ToString(),
            c.Enrollments.Where(e => !e.IsDeleted)
                .Select(e => new StudentDto(e.StudentId, e.Student.FullName, e.Student.Email, e.JoinedAt, e.Student.Locked, e.Status.ToString()))
                .ToList(),
            assignments.Select(a => new AssignmentBriefDto(a.Id, a.Title, a.DueAt, 0)).ToList()));
    }

    public async Task<Result<ClassListDto>> CreateAsync(ClassCreateRequest req, Guid teacherId, CancellationToken ct = default)
    {
        var c = new ClassRoom
        {
            Code = "L" + Random.Shared.Next(1000, 9999),
            Name = req.Name,
            CurriculumId = req.CurriculumId,
            TeacherId = teacherId,
            Schedule = req.Schedule,
            Room = req.Room,
            Status = ClassStatus.Upcoming
        };
        await classes.AddAsync(c, ct);
        await uow.SaveChangesAsync(ct);
        return Result<ClassListDto>.Ok(new ClassListDto(
            c.Id, c.Code, c.Name, c.CurriculumId, null, teacherId, null, c.Schedule, c.Room,
            c.Status.ToString(), 0));
    }

    public async Task<Result> EnrollAsync(Guid classId, IReadOnlyList<Guid> studentIds, CancellationToken ct = default)
    {
        var existing = await enrollments.ListAsync(
            new Specification<Enrollment>().Where(e => e.ClassId == classId), ct);

        var newIds = studentIds
            .Where(sid => !existing.Any(e => e.StudentId == sid))
            .Distinct().ToList();

        if (newIds.Count > 0)
        {
            var c = await classes.GetByIdAsync(classId, ct);
            await enrollments.AddRangeAsync(newIds.Select(sid => new Enrollment
            {
                ClassId = classId,
                StudentId = sid
            }), ct);

            // thông báo cho từng học viên vừa được thêm vào lớp
            await notifications.AddRangeAsync(newIds.Select(sid => new Notification
            {
                UserId = sid,
                Body = $"🏫 Bạn đã được thêm vào lớp {c?.Name ?? ""} — mã lớp {c?.Code ?? ""}.",
                Link = $"/my-class/{classId}"
            }), ct);
        }

        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var c = await classes.GetByIdAsync(id, ct);
        if (c is null) return Result.Fail("Không tìm thấy lớp.", "NOT_FOUND");
        classes.SoftDelete(c);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result> RemoveStudentAsync(Guid classId, Guid studentId, CancellationToken ct = default)
    {
        var e = await enrollments.FirstOrDefaultAsync(
            new Specification<Enrollment>().Where(x => x.ClassId == classId && x.StudentId == studentId), ct);
        if (e is null) return Result.Fail("Học viên không thuộc lớp này.", "NOT_FOUND");
        enrollments.SoftDelete(e);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    /// <summary>Học viên tự tham gia lớp bằng mã lớp — tạo enrollment chờ giáo viên duyệt.</summary>
    public async Task<Result> JoinAsync(Guid studentId, string code, CancellationToken ct = default)
    {
        var c = await classes.FirstOrDefaultAsync(
            new Specification<ClassRoom>().Where(x => x.Code == code.Trim().ToUpperInvariant()), ct);
        if (c is null) return Result.Fail("Không tìm thấy lớp với mã này.", "NOT_FOUND");
        if (c.Status == ClassStatus.Ended) return Result.Fail("Lớp này đã kết thúc.");

        var existing = await enrollments.ListAsync(
            new Specification<Enrollment>().Where(e => e.ClassId == c.Id && e.StudentId == studentId), ct);
        if (existing.Any(e => e.Status == EnrollmentStatus.Approved))
            return Result.Fail("Bạn đã thuộc lớp này rồi.");
        if (existing.Any(e => e.Status == EnrollmentStatus.Pending && !e.IsDeleted))
            return Result.Fail("Yêu cầu tham gia của bạn đang chờ giáo viên duyệt.");

        // từng bị từ chối hoặc đã xoá mềm → tạo bản ghi mới
        await enrollments.AddAsync(new Enrollment
        {
            ClassId = c.Id,
            StudentId = studentId,
            Status = EnrollmentStatus.Pending
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result> ApproveEnrollmentAsync(Guid classId, Guid studentId, bool approve, CancellationToken ct = default)
    {
        var e = await enrollments.FirstOrDefaultAsync(
            new Specification<Enrollment>()
                .Where(x => x.ClassId == classId && x.StudentId == studentId)
                .Track(), ct);
        if (e is null) return Result.Fail("Không tìm thấy yêu cầu tham gia.", "NOT_FOUND");
        e.Status = approve ? EnrollmentStatus.Approved : EnrollmentStatus.Rejected;
        enrollments.Update(e);

        if (approve)
        {
            var c = await classes.GetByIdAsync(classId, ct);
            await notifications.AddAsync(new Notification
            {
                UserId = studentId,
                Body = $"✅ Yêu cầu tham gia lớp {c?.Name ?? ""} đã được duyệt.",
                Link = $"/my-class/{classId}"
            }, ct);
        }

        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result<IReadOnlyList<AttendanceDayDto>>> GetAttendanceAsync(Guid classId, DateTime date, CancellationToken ct = default)
    {
        var day = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc); // cột timestamptz chỉ nhận UTC
        var records = await attendances.ListAsync(
            new Specification<Attendance>().Where(a => a.ClassId == classId && a.Date == day), ct);

        var c = await classes.FirstOrDefaultAsync(
            new Specification<ClassRoom>().Include("Enrollments.Student").Where(x => x.Id == classId), ct);
        if (c is null) return Result<IReadOnlyList<AttendanceDayDto>>.Fail("Không tìm thấy lớp.", "NOT_FOUND");

        var result = c.Enrollments
            .Where(e => !e.IsDeleted && e.Status == EnrollmentStatus.Approved)
            .Select(e => new AttendanceDayDto(
                e.StudentId, e.Student.FullName,
                records.FirstOrDefault(r => r.StudentId == e.StudentId)?.Status.ToString()))
            .OrderBy(d => d.FullName)
            .ToList();
        return Result<IReadOnlyList<AttendanceDayDto>>.Ok(result);
    }

    public async Task<Result> SaveAttendanceAsync(Guid classId, DateTime date, IReadOnlyList<AttendanceMarkDto> marks, Guid actorId, CancellationToken ct = default)
    {
        var day = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var existing = await attendances.ListAsync(
            new Specification<Attendance>().Where(a => a.ClassId == classId && a.Date == day).Track(), ct);

        foreach (var m in marks)
        {
            if (!Enum.TryParse<AttendanceStatus>(m.Status, true, out var status))
                return Result.Fail($"Trạng thái điểm danh không hợp lệ: {m.Status}");

            var rec = existing.FirstOrDefault(x => x.StudentId == m.StudentId);
            if (rec is not null)
            {
                rec.Status = status;
                attendances.Update(rec);
            }
            else
            {
                await attendances.AddAsync(new Attendance
                {
                    ClassId = classId,
                    StudentId = m.StudentId,
                    Date = day,
                    Status = status
                }, ct);
            }
        }

        await activityLogs.AddAsync(new ActivityLog
        {
            ActorId = actorId, Entity = "Attendance", EntityId = classId.ToString(),
            Action = $"Điểm danh lớp ngày {date:dd/MM/yyyy}"
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    /// <summary>Lịch điểm danh của chính học viên trong một lớp.</summary>
    public async Task<Result<IReadOnlyList<AttendanceMineDto>>> MyAttendanceAsync(Guid classId, Guid studentId, CancellationToken ct = default)
    {
        var records = await attendances.ListAsync(
            new Specification<Attendance>()
                .Where(a => a.ClassId == classId && a.StudentId == studentId)
                .Order(a => a.Date), ct);

        return Result<IReadOnlyList<AttendanceMineDto>>.Ok(records
            .Select(r => new AttendanceMineDto(r.Date, r.Status.ToString()))
            .ToList());
    }

    /// <summary>Thống kê điểm danh cả lớp: số buổi có mặt / muộn / vắng theo từng học viên.</summary>
    public async Task<Result<IReadOnlyList<AttendanceSummaryDto>>> GetAttendanceSummaryAsync(Guid classId, CancellationToken ct = default)
    {
        var records = await attendances.ListAsync(
            new Specification<Attendance>().Where(a => a.ClassId == classId), ct);

        var c = await classes.FirstOrDefaultAsync(
            new Specification<ClassRoom>().Include("Enrollments.Student").Where(x => x.Id == classId), ct);
        if (c is null) return Result<IReadOnlyList<AttendanceSummaryDto>>.Fail("Không tìm thấy lớp.", "NOT_FOUND");

        var result = c.Enrollments
            .Where(e => !e.IsDeleted && e.Status == EnrollmentStatus.Approved)
            .Select(e => new AttendanceSummaryDto(
                e.StudentId, e.Student.FullName,
                records.Count(r => r.StudentId == e.StudentId && r.Status == AttendanceStatus.Present),
                records.Count(r => r.StudentId == e.StudentId && r.Status == AttendanceStatus.Late),
                records.Count(r => r.StudentId == e.StudentId && r.Status == AttendanceStatus.Absent)))
            .OrderBy(s => s.FullName)
            .ToList();
        return Result<IReadOnlyList<AttendanceSummaryDto>>.Ok(result);
    }

    public async Task<Result<LessonProgressDto>> LessonProgressAsync(Guid classId, CancellationToken ct = default)
    {
        var c = await classes.FirstOrDefaultAsync(
            new Specification<ClassRoom>()
                .Include("Enrollments.Student")
                .Include("Curriculum.Lessons")
                .Where(x => x.Id == classId), ct);
        if (c is null) return Result<LessonProgressDto>.Fail("Không tìm thấy lớp.", "NOT_FOUND");

        var lessons = c.Curriculum.Lessons
            .Where(l => !l.IsDeleted).OrderBy(l => l.OrderNo).ToList();
        var approved = c.Enrollments
            .Where(e => !e.IsDeleted && e.Status == EnrollmentStatus.Approved)
            .OrderBy(e => e.Student.FullName).ToList();

        var lessonDtos = lessons.Select(l => new LessonProgressCellDto(l.Id, l.OrderNo, l.TitleZh, 0)).ToList();

        var studentIds = approved.Select(e => e.StudentId).ToList();
        var lessonIds = lessons.Select(l => l.Id).ToList();
        var rows = (studentIds.Count > 0 && lessonIds.Count > 0)
            ? await progresses.ListAsync(
                new Specification<HanZi.Server.Domain.Entities.Progress>()
                    .Where(p => studentIds.Contains(p.StudentId) && lessonIds.Contains(p.LessonId)), ct)
            : [];

        var studentRows = approved.Select(e => new LessonProgressRowDto(
            e.StudentId, e.Student.FullName,
            lessons.Select(l => new LessonProgressCellDto(
                l.Id, l.OrderNo, l.TitleZh,
                rows.FirstOrDefault(r => r.StudentId == e.StudentId && r.LessonId == l.Id)?.CurrentPart ?? 0))
                .ToList())).ToList();

        return Result<LessonProgressDto>.Ok(new LessonProgressDto(c.Id, c.Name, lessonDtos, studentRows));
    }

    public async Task<Result> UpdateAsync(Guid id, ClassUpdateRequest req, CancellationToken ct = default)
    {
        var c = await classes.GetByIdAsync(id, ct);
        if (c is null) return Result.Fail("Không tìm thấy lớp.", "NOT_FOUND");
        if (!Enum.TryParse<ClassStatus>(req.Status, true, out var status))
            return Result.Fail($"Trạng thái lớp không hợp lệ: {req.Status}");

        c.Name = req.Name.Trim();
        c.Schedule = req.Schedule?.Trim();
        c.Room = req.Room?.Trim();
        c.Status = status;
        classes.Update(c);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
