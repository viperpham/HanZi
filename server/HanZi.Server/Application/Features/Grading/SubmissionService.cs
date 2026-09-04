using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Interceptors;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Application.Features.Grading;

using HanZi.Server.Application.Features.Grading.Dtos;

public interface ISubmissionService
{
    /// <summary>Học viên nộp bài — hệ thống tự chấm các dạng MCQ/Fill/Order/Match.</summary>
    Task<Result<SubmissionDetailDto>> SubmitAsync(Guid assignmentId, Guid studentId, SubmitRequest req, CancellationToken ct = default);
    /// <summary>Lưu nháp định kỳ — mất mạng không mất bài.</summary>
    Task<Result<SubmissionDetailDto>> DraftAsync(Guid assignmentId, Guid studentId, SubmitRequest req, CancellationToken ct = default);
    Task<Result<SubmissionDetailDto>> GetForStudentAsync(Guid submissionId, Guid studentId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SubmissionDetailDto>>> ListOwnAsync(Guid studentId, CancellationToken ct = default);
    Task<Result> ReplyNoteAsync(Guid submissionId, Guid studentId, string reply, CancellationToken ct = default);
}

public interface IGradingService
{
    Task<Result<SubmissionDetailDto>> GetForTeacherAsync(Guid submissionId, CancellationToken ct = default);
    Task<Result<SubmissionDetailDto>> GradeAsync(Guid submissionId, GradeRequest req, CancellationToken ct = default);
    /// <summary>Gửi/cập nhật ghi chú riêng cho học viên — không đổi điểm, không đổi trạng thái.</summary>
    Task<Result> SendNoteAsync(Guid submissionId, NoteRequest req, CancellationToken ct = default);
}

public class SubmissionService(
    IRepository<Submission> submissions,
    IRepository<Assignment> assignments,
    IRepository<ClassRoom> classes,
    IRepository<Question> questions,
    IRepository<SubmissionAnswer> answers,
    IRepository<Notification> notifications,
    IRepository<User> users,
    IRepository<ActivityLog> activityLogs,
    IUnitOfWork uow) : ISubmissionService
{
    public async Task<Result<SubmissionDetailDto>> SubmitAsync(Guid assignmentId, Guid studentId, SubmitRequest req, CancellationToken ct = default)
    {
        var a = await assignments.FirstOrDefaultAsync(
            new Specification<Assignment>()
                .Include("Questions.Options")
                .Where(x => x.Id == assignmentId)
                .Split(), ct);
        if (a is null) return Result<SubmissionDetailDto>.Fail("Không tìm thấy bài tập.", "NOT_FOUND");

        var sub = await submissions.FirstOrDefaultAsync(
            new Specification<Submission>()
                .Where(s => s.AssignmentId == assignmentId && s.StudentId == studentId)
                .Track(), ct);

        if (sub is { Status: SubmissionStatus.Submitted or SubmissionStatus.Graded })
            return Result<SubmissionDetailDto>.Fail("Bài này đã nộp rồi.", "ALREADY_SUBMITTED");

        var now = DateTime.UtcNow;
        var late = now > a.DueAt;
        if (late && a.LatePolicy == LatePolicy.Block)
            return Result<SubmissionDetailDto>.Fail("Đã quá hạn nộp bài.", "LATE_BLOCKED");

        var isNew = sub is null;
        sub ??= new Submission { AssignmentId = assignmentId, StudentId = studentId };

        // ẩn bảng đáp án cũ (nếu có nháp)
        var oldAnswers = await answers.ListAsync(
            new Specification<SubmissionAnswer>().Where(x => x.SubmissionId == sub.Id), ct);
        answers.SoftDeleteRange(oldAnswers);

        decimal autoPoints = 0, totalPoints = 0;
        var gradedAll = true;

        foreach (var q in a.Questions.Where(q => !q.IsDeleted))
        {
            totalPoints += q.Points;
            var given = req.Answers.FirstOrDefault(x => x.QuestionId == q.Id)?.AnswerText;
            decimal? score = null;

            if (given is not null && q.Type.IsAutoGraded())
            {
                var correct = q.Type switch
                {
                    QuestionType.MultipleChoice => given == q.Answer,
                    QuestionType.Fill => string.Equals(given.Trim(), q.Answer, StringComparison.OrdinalIgnoreCase),
                    QuestionType.Order => given.Replace(" ", "") == q.Answer,
                    QuestionType.Match => given.Replace(" ", "") == q.Answer,
                    _ => false
                };
                score = correct ? q.Points : 0;
                autoPoints += score.Value;
            }
            if (!q.Type.IsAutoGraded()) gradedAll = false;

            await answers.AddAsync(new SubmissionAnswer
            {
                SubmissionId = sub.Id, QuestionId = q.Id, AnswerText = given, AutoScore = score
            }, ct);
        }

        sub.AutoScore = totalPoints > 0 ? Math.Round(autoPoints / totalPoints * 10, 1) : 0;
        sub.SubmittedAt = now;
        sub.Status = gradedAll ? SubmissionStatus.Graded : SubmissionStatus.Submitted;
        sub.FinalScore = late && a.LatePolicy == LatePolicy.Penalty
            ? Math.Max(0, sub.AutoScore - 1)
            : sub.AutoScore;

        if (isNew) await submissions.AddAsync(sub, ct); else submissions.Update(sub);

        // thông báo cho giáo viên phụ trách lớp
        var cls = await classes.FirstOrDefaultAsync(
            new Specification<ClassRoom>().Where(c => c.Id == a.ClassId), ct);
        if (cls is not null)
        {
            var student = await users.GetByIdAsync(studentId, ct);
            await notifications.AddAsync(new Notification
            {
                UserId = cls.TeacherId,
                Body = $"{student?.FullName ?? "Học viên"} đã nộp bài tập {a.Title}.",
                Link = $"/grading?assignmentId={a.Id}"
            }, ct);
        }
        await activityLogs.AddAsync(new ActivityLog { ActorId = studentId, Entity = "Submission", EntityId = sub.Id.ToString(), Action = $"Nộp bài tập {a.Title}" }, ct);

        await uow.SaveChangesAsync(ct);
        return await GetForStudentAsync(sub.Id, studentId, ct);
    }

    public async Task<Result<SubmissionDetailDto>> DraftAsync(Guid assignmentId, Guid studentId, SubmitRequest req, CancellationToken ct = default)
    {
        var sub = await submissions.FirstOrDefaultAsync(
            new Specification<Submission>()
                .Where(x => x.AssignmentId == assignmentId && x.StudentId == studentId)
                .Track(), ct);
        if (sub is { Status: SubmissionStatus.Submitted or SubmissionStatus.Graded })
            return Result<SubmissionDetailDto>.Fail("Bài này đã nộp rồi.", "ALREADY_SUBMITTED");

        var isNew = sub is null;
        sub ??= new Submission { AssignmentId = assignmentId, StudentId = studentId };

        var oldAnswers = await answers.ListAsync(
            new Specification<SubmissionAnswer>().Where(x => x.SubmissionId == sub.Id), ct);
        answers.SoftDeleteRange(oldAnswers);

        foreach (var q in req.Answers)
        {
            await answers.AddAsync(new SubmissionAnswer
            {
                SubmissionId = sub.Id, QuestionId = q.QuestionId, AnswerText = q.AnswerText
            }, ct);
        }

        sub.Status = SubmissionStatus.Doing;
        sub.DraftSavedAt = DateTime.UtcNow;
        if (isNew) await submissions.AddAsync(sub, ct); else submissions.Update(sub);
        await uow.SaveChangesAsync(ct);

        return await GetForStudentAsync(sub.Id, studentId, ct);
    }

    public async Task<Result<SubmissionDetailDto>> GetForStudentAsync(Guid submissionId, Guid studentId, CancellationToken ct = default)
    {
        var dto = await BuildDetailAsync(submissionId, ct);
        if (dto is null) return Result<SubmissionDetailDto>.Fail("Không tìm thấy bài nộp.", "NOT_FOUND");
        if (dto.StudentId != studentId) return Result<SubmissionDetailDto>.Fail("Không có quyền xem bài này.", "FORBIDDEN");
        return Result<SubmissionDetailDto>.Ok(dto);
    }

    public async Task<Result<IReadOnlyList<SubmissionDetailDto>>> ListOwnAsync(Guid studentId, CancellationToken ct = default)
    {
        var subs = await submissions.ListAsync(
            new Specification<Submission>()
                .Where(s => s.StudentId == studentId)
                .Order(s => s.SubmittedAt), ct);
        var list = new List<SubmissionDetailDto>();
        foreach (var s in subs)
        {
            var dto = await BuildDetailAsync(s.Id, ct);
            if (dto is not null) list.Add(dto);
        }
        return Result<IReadOnlyList<SubmissionDetailDto>>.Ok(list);
    }

    public async Task<Result> ReplyNoteAsync(Guid submissionId, Guid studentId, string reply, CancellationToken ct = default)
    {
        var sub = await submissions.FirstOrDefaultAsync(
            new Specification<Submission>()
                .Include("GradingNote")
                .Where(s => s.Id == submissionId && s.StudentId == studentId)
                .Track(), ct);
        if (sub is null) return Result.Fail("Không tìm thấy bài nộp.", "NOT_FOUND");
        if (sub.GradingNote is null || sub.GradingNote.IsDeleted)
            return Result.Fail("Chưa có ghi chú của giáo viên.", "NOT_FOUND");

        sub.GradingNote.Reply = reply;
        sub.GradingNote.RepliedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    /// <summary>
    /// Đọc chi tiết bài nộp: số truy vấn cố định (2) — không phụ thuộc số câu hỏi.
    /// </summary>
    internal async Task<SubmissionDetailDto?> BuildDetailAsync(Guid submissionId, CancellationToken ct)
    {
        var sub = await submissions.FirstOrDefaultAsync(
            new Specification<Submission>()
                .Include("Student")
                .Include("GradingNote")
                .Where(s => s.Id == submissionId)
                .Track(), ct);
        if (sub is null) return null;

        // LessonId của bài tập — dùng cho link "học lại mục" từ ghi chú của giáo viên
        var assignment = await assignments.GetByIdAsync(sub.AssignmentId, ct);

        var answersList = await answers.ListAsync(
            new Specification<SubmissionAnswer>().Where(x => x.SubmissionId == submissionId), ct);
        var qIds = answersList.Select(a => a.QuestionId).ToList();
        // IgnoreFilters: bài nộp có thể trỏ tới câu hỏi cũ đã bị thay thế khi sửa đề —
        // vẫn phải đọc được để xem lại/chấm bài lịch sử
        var qList = qIds.Count > 0
            ? await questions.ListAsync(
                new Specification<Question>().IgnoreFilters().Include("Options").Where(q => qIds.Contains(q.Id)).Order(q => q.OrderNo).Split(), ct)
            : [];

        return new SubmissionDetailDto(
            sub.Id, sub.AssignmentId, assignment?.LessonId, sub.StudentId, sub.Student.FullName, sub.Status.ToString(),
            sub.SubmittedAt, sub.AutoScore, sub.ManualScore, sub.FinalScore,
            qList.Select(q =>
            {
                var ans = answersList.FirstOrDefault(x => x.QuestionId == q.Id);
                return new AnswerDetailDto(
                    q.Id, q.OrderNo, q.Type.ToString(), q.Prompt, q.Points,
                    q.Options?.Where(o => !o.IsDeleted).OrderBy(o => o.OrderNo).Select(o => o.Text).ToList(),
                    q.Answer, q.SampleAnswer,
                    ans?.AnswerText, ans?.AutoScore, ans?.TeacherComment, q.KnowledgeTag);
            }).ToList(),
            sub.GradingNote is { IsDeleted: false } n
                ? new GradingNoteDto(n.WeakTags, n.Comment, n.Todos, n.SentAt, n.Reply)
                : null);
    }
}

public class GradingService(
    IRepository<GradingNote> noteRepo,
    IRepository<Submission> submissions,
    IRepository<Assignment> assignments,
    IRepository<Notification> notifications,
    IRepository<ActivityLog> activityLogs,
    ISubmissionService submissionService,
    IUnitOfWork uow,
    ICurrentUser currentUser) : IGradingService
{
    public async Task<Result<SubmissionDetailDto>> GetForTeacherAsync(Guid submissionId, CancellationToken ct = default)
    {
        // BuildDetail là internal của SubmissionService — expose qua interface wrapper
        var dto = await GetDetailAsync(submissionId, ct);
        if (dto is null) return Result<SubmissionDetailDto>.Fail("Không tìm thấy bài nộp.", "NOT_FOUND");
        return Result<SubmissionDetailDto>.Ok(dto);
    }

    public async Task<Result<SubmissionDetailDto>> GradeAsync(Guid submissionId, GradeRequest req, CancellationToken ct = default)
    {
        var sub = await submissions.FirstOrDefaultAsync(
            new Specification<Submission>()
                .Include("Answers")
                .Include("GradingNote")
                .Include("Student")
                .Where(s => s.Id == submissionId)
                .Track()
                .Split(), ct);
        if (sub is null) return Result<SubmissionDetailDto>.Fail("Không tìm thấy bài nộp.", "NOT_FOUND");
        if (sub.Status == SubmissionStatus.Doing) return Result<SubmissionDetailDto>.Fail("Học viên chưa nộp bài.", "NOT_SUBMITTED");

        var old = sub.Answers.Where(x => !x.IsDeleted).ToList();

        // áp điểm chấm tay + nhận xét từng câu
        foreach (var g in req.Answers)
        {
            var ans = old.FirstOrDefault(x => x.QuestionId == g.QuestionId);
            if (ans is null) continue;
            if (g.AutoScore is not null) ans.AutoScore = g.AutoScore;
            ans.TeacherComment = g.Comment;
        }

        // điểm cuối = trung bình điểm tự động + điểm chấm tay của giáo viên
        sub.ManualScore = req.ManualScore;
        sub.FinalScore = Math.Round((sub.AutoScore + req.ManualScore) / 2, 1);
        sub.Status = SubmissionStatus.Graded;
        sub.GradedAt = DateTime.UtcNow;

        // ghi chú riêng — PHẢI AddAsync tường minh (Guid đã sinh sẵn → EF sẽ tưởng là UPDATE)
        if (sub.GradingNote is null || sub.GradingNote.IsDeleted)
        {
            var note = new GradingNote
            {
                SubmissionId = sub.Id,
                WeakTags = req.WeakTags,
                Comment = req.Comment,
                Todos = req.Todos,
                SentAt = DateTime.UtcNow
            };
            await noteRepo.AddAsync(note, ct);
            sub.GradingNote = note;
        }
        else
        {
            sub.GradingNote.WeakTags = req.WeakTags;
            sub.GradingNote.Comment = req.Comment;
            sub.GradingNote.Todos = req.Todos;
            sub.GradingNote.SentAt = DateTime.UtcNow;
        }

        await uow.SaveChangesAsync(ct);

        // thông báo cho học viên
        var asgTitle = (await assignments.GetByIdAsync(sub.AssignmentId, ct))?.Title ?? "";
        await notifications.AddAsync(new Notification
        {
            UserId = sub.StudentId,
            Body = $"📩 Bài tập {asgTitle} đã được chấm: {sub.FinalScore:0.#}/10 — có ghi chú riêng của giáo viên.",
            Link = "/results"
        }, ct);
        await activityLogs.AddAsync(new ActivityLog { ActorId = currentUser.UserId, Entity = "Submission", EntityId = sub.Id.ToString(), Action = $"Chấm bài và gửi ghi chú cho {sub.Student.FullName}" }, ct);
        await uow.SaveChangesAsync(ct);

        return Result<SubmissionDetailDto>.Ok(await GetDetailAsync(submissionId, ct)!);
    }

    private async Task<SubmissionDetailDto?> GetDetailAsync(Guid id, CancellationToken ct)
    {
        // GradingService dùng lại builder của SubmissionService qua internal
        return await ((SubmissionService)submissionService).BuildDetailAsync(id, ct);
    }

    public async Task<Result> SendNoteAsync(Guid submissionId, NoteRequest req, CancellationToken ct = default)
    {
        var sub = await submissions.FirstOrDefaultAsync(
            new Specification<Submission>()
                .Include("GradingNote")
                .Where(s => s.Id == submissionId)
                .Track(), ct);
        if (sub is null) return Result.Fail("Không tìm thấy bài nộp.", "NOT_FOUND");
        if (sub.Status == SubmissionStatus.Doing) return Result.Fail("Học viên chưa nộp bài.", "NOT_SUBMITTED");

        if (sub.GradingNote is null || sub.GradingNote.IsDeleted)
        {
            var note = new GradingNote
            {
                SubmissionId = sub.Id,
                WeakTags = req.WeakTags,
                Comment = req.Comment,
                Todos = req.Todos,
                SentAt = DateTime.UtcNow
            };
            await noteRepo.AddAsync(note, ct);
            sub.GradingNote = note;
        }
        else
        {
            sub.GradingNote.WeakTags = req.WeakTags;
            sub.GradingNote.Comment = req.Comment;
            sub.GradingNote.Todos = req.Todos;
            sub.GradingNote.SentAt = DateTime.UtcNow;
        }
        await uow.SaveChangesAsync(ct);

        await notifications.AddAsync(new Notification
        {
            UserId = sub.StudentId,
            Body = "✉️ Giáo viên vừa gửi ghi chú riêng cho bạn.",
            Link = "/results"
        }, ct);
        await activityLogs.AddAsync(new ActivityLog
        {
            ActorId = currentUser.UserId, Entity = "Submission", EntityId = sub.Id.ToString(),
            Action = $"Gửi ghi chú riêng cho {sub.Student.FullName}"
        }, ct);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
