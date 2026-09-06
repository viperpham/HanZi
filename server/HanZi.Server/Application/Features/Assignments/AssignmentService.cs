using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Application.Features.Assignments;

using HanZi.Server.Application.Features.Assignments.Dtos;

public interface IAssignmentService
{
    Task<Result<IReadOnlyList<AssignmentListDto>>> ListByClassAsync(Guid classId, CancellationToken ct = default);
    Task<Result<AssignmentDetailDto>> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<AssignmentDetailDto>> CreateAsync(AssignmentCreateRequest req, Guid actorId, CancellationToken ct = default);
    Task<Result<AssignmentDetailDto>> UpdateAsync(Guid id, AssignmentCreateRequest req, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SubmissionListItemDto>>> ListSubmissionsAsync(Guid assignmentId, CancellationToken ct = default);
    /// <summary>Nhắc học viên chưa nộp bài — gửi thông báo cho từng em.</summary>
    Task<Result<int>> RemindPendingAsync(Guid assignmentId, Guid actorId, CancellationToken ct = default);
    /// <summary>Thống kê bài nộp của một bài tập: đếm trạng thái + câu sai nhiều nhất.</summary>
    Task<Result<AssignmentStatsDto>> StatsAsync(Guid assignmentId, CancellationToken ct = default);
}

public class AssignmentService(
    ICurrentUser currentUser,
    IRepository<Assignment> assignments,
    IRepository<Question> questions,
    IRepository<QuestionOption> options,
    IRepository<Submission> submissions,
    IRepository<SubmissionAnswer> submissionAnswers,
    IRepository<User> users,
    IRepository<Enrollment> enrollments,
    IRepository<Notification> notifications,
    IRepository<ActivityLog> activityLogs,
    IUnitOfWork uow) : IAssignmentService
{
    public async Task<Result<IReadOnlyList<AssignmentListDto>>> ListByClassAsync(Guid classId, CancellationToken ct = default)
    {
        var list = await assignments.ListAsync(
            new Specification<Assignment>()
                .Where(a => a.ClassId == classId)
                .Include("Questions")
                .Order(a => a.DueAt), ct);

        // học viên chỉ thấy bài đã đến giờ giao (giao ngay hoặc hẹn giờ)
        if (currentUser.Role == UserRole.Student)
            list = list.Where(a => a.PublishAt is null || a.PublishAt <= DateTime.UtcNow).ToList();

        // loại các bài mà học viên bị loại khỏi nhận
        var myId = currentUser.UserId;
        if (currentUser.Role == UserRole.Student && myId is not null)
            list = list.Where(a => !IsExcluded(a, myId.Value)).ToList();

        return Result<IReadOnlyList<AssignmentListDto>>.Ok(list.Select(a => new AssignmentListDto(
            a.Id, a.Title, a.Description, a.ClassId, null, a.LessonId, a.DueAt, a.PublishAt,
            a.DurationMin, a.MaxAttempts, a.LatePolicy.ToString(), null,
            a.Questions.Count(q => !q.IsDeleted))).ToList());
    }

    public async Task<Result<AssignmentDetailDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var a = await assignments.FirstOrDefaultAsync(
            new Specification<Assignment>()
                .Include("Questions.Options")
                .Where(x => x.Id == id)
                .Split(), ct);
        if (a is null) return Result<AssignmentDetailDto>.Fail("Không tìm thấy bài tập.", "NOT_FOUND");
        var isStudent = currentUser.Role == UserRole.Student;
        return Result<AssignmentDetailDto>.Ok(ToDetail(a, hideAnswers: isStudent));
    }

    public async Task<Result<AssignmentDetailDto>> CreateAsync(AssignmentCreateRequest req, Guid actorId, CancellationToken ct = default)
    {
        if (!Enum.TryParse<LatePolicy>(req.LatePolicy, true, out var latePolicy))
            return Result<AssignmentDetailDto>.Fail("LatePolicy không hợp lệ (Penalty | Block).");

        var a = new Assignment
        {
            Title = req.Title,
            Description = req.Description,
            ClassId = req.ClassId,
            LessonId = req.LessonId,
            DueAt = req.DueAt.ToUniversalTime(),
            PublishAt = req.PublishAt?.ToUniversalTime(),
            DurationMin = req.DurationMin,
            MaxAttempts = req.MaxAttempts,
            LatePolicy = latePolicy,
            ShowAnswer = req.ShowAnswer,
            Shuffle = req.Shuffle,
            ExcludedStudentIds = string.IsNullOrWhiteSpace(req.ExcludedStudentIds) ? null : req.ExcludedStudentIds,
            CreatedBy = actorId
        };
        await assignments.AddAsync(a, ct);

        var addResult = await AddQuestionsAsync(a.Id, req.Questions, ct);
        if (!addResult.Success) return Result<AssignmentDetailDto>.Fail(addResult.Error!);

        await activityLogs.AddAsync(new ActivityLog { ActorId = actorId, Entity = "Assignment", EntityId = a.Id.ToString(), Action = $"Giao bài tập {a.Title}" }, ct);

        // thông báo cho học viên đã duyệt của lớp — chỉ khi bài đã đến giờ giao
        if (a.PublishAt is null || a.PublishAt <= DateTime.UtcNow)
            await NotifyClassAsync(a, ct);

        // Save SAU khi thêm thông báo — nếu không notification sẽ không được commit
        await uow.SaveChangesAsync(ct);

        return await GetByIdAsync(a.Id, ct);
    }

    /// <summary>Gửi thông báo "bài tập mới" tới các học viên đã duyệt của lớp (trừ bị loại).</summary>
    private async Task NotifyClassAsync(Assignment a, CancellationToken ct)
    {
        var studentIds = await enrollments.ListAsync(
            new Specification<Enrollment>()
                .Where(e => e.ClassId == a.ClassId && !e.IsDeleted && e.Status == EnrollmentStatus.Approved), ct);

        await notifications.AddRangeAsync(studentIds
            .Where(e => !IsExcluded(a, e.StudentId))
            .Select(e => new Notification
        {
            UserId = e.StudentId,
            Body = $"📖 Bài tập mới: {a.Title} — hạn nộp {a.DueAt.ToLocalTime():dd/MM/yyyy HH:mm}.",
            Link = $"/do/{a.Id}"
        }), ct);
    }

    public async Task<Result<AssignmentDetailDto>> UpdateAsync(Guid id, AssignmentCreateRequest req, CancellationToken ct = default)
    {
        if (!Enum.TryParse<LatePolicy>(req.LatePolicy, true, out var latePolicy))
            return Result<AssignmentDetailDto>.Fail("LatePolicy không hợp lệ (Penalty | Block).");

        var a = await assignments.FirstOrDefaultAsync(
            new Specification<Assignment>()
                .Include("Questions.Options")
                .Where(x => x.Id == id)
                .Track()
                .Split(), ct);
        if (a is null) return Result<AssignmentDetailDto>.Fail("Không tìm thấy bài tập.", "NOT_FOUND");

        a.Title = req.Title;
        a.Description = req.Description;
        a.ClassId = req.ClassId;
        a.LessonId = req.LessonId;
        a.DueAt = req.DueAt.ToUniversalTime();
        a.PublishAt = req.PublishAt?.ToUniversalTime();
        a.DurationMin = req.DurationMin;
        a.MaxAttempts = req.MaxAttempts;
        a.LatePolicy = latePolicy;
        a.ShowAnswer = req.ShowAnswer;
        a.Shuffle = req.Shuffle;
        a.ExcludedStudentIds = string.IsNullOrWhiteSpace(req.ExcludedStudentIds) ? null : req.ExcludedStudentIds;

        // Chỉ thay đổi câu hỏi khi client gửi danh sách mới; rỗng = giữ nguyên
        if (req.Questions is { Count: > 0 })
        {
            foreach (var q in a.Questions.Where(q => !q.IsDeleted))
            {
                foreach (var o in q.Options.Where(o => !o.IsDeleted))
                    options.SoftDelete(o);
                questions.SoftDelete(q);
            }

            var addResult = await AddQuestionsAsync(a.Id, req.Questions, ct);
            if (!addResult.Success) return Result<AssignmentDetailDto>.Fail(addResult.Error!);
        }

        await activityLogs.AddAsync(new ActivityLog { Entity = "Assignment", EntityId = a.Id.ToString(), Action = $"Cập nhật bài tập {a.Title}" }, ct);
        await uow.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    private async Task<Result> AddQuestionsAsync(Guid assignmentId, IReadOnlyList<QuestionUpsertDto> reqQuestions, CancellationToken ct)
    {
        var order = 0;
        foreach (var q in reqQuestions)
        {
            if (!Enum.TryParse<QuestionType>(q.Type, true, out var type))
                return Result.Fail($"Dạng câu hỏi không hợp lệ: {q.Type}");

            var question = new Question
            {
                AssignmentId = assignmentId,
                OrderNo = ++order,
                Type = type,
                Prompt = q.Prompt,
                Points = q.Points,
                Answer = type.IsAutoGraded() ? q.Answer : null,
                SampleAnswer = q.SampleAnswer,
                KnowledgeTag = q.KnowledgeTag
            };
            await questions.AddAsync(question, ct);

            if (type == QuestionType.MultipleChoice && q.Options is { Count: > 0 })
                await options.AddRangeAsync(q.Options.Select((t, i) => new QuestionOption
                {
                    QuestionId = question.Id, OrderNo = i + 1, Text = t
                }), ct);
        }

        return Result.Ok();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var a = await assignments.GetByIdAsync(id, ct);
        if (a is null) return Result.Fail("Không tìm thấy bài tập.", "NOT_FOUND");
        assignments.SoftDelete(a);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result<IReadOnlyList<SubmissionListItemDto>>> ListSubmissionsAsync(Guid assignmentId, CancellationToken ct = default)
    {
        var subs = await submissions.ListAsync(
            new Specification<Submission>()
                .Where(s => s.AssignmentId == assignmentId)
                .Include("Student")
                .Include("GradingNote")
                .Order(s => s.SubmittedAt), ct);

        var studentIds = subs.Select(s => s.StudentId).Distinct().ToList();
        var students = studentIds.Count > 0
            ? await users.ListAsync(new Specification<User>().Where(u => studentIds.Contains(u.Id)), ct)
            : [];

        return Result<IReadOnlyList<SubmissionListItemDto>>.Ok(subs.Select(s => new SubmissionListItemDto(
            s.Id, s.StudentId,
            students.FirstOrDefault(u => u.Id == s.StudentId)?.FullName ?? "?",
            s.Status.ToString(), s.SubmittedAt, s.AutoScore, s.ManualScore, s.FinalScore,
            s.GradingNote?.SentAt is not null)).ToList());
    }

    public async Task<Result<int>> RemindPendingAsync(Guid assignmentId, Guid actorId, CancellationToken ct = default)
    {
        var a = await assignments.FirstOrDefaultAsync(
            new Specification<Assignment>().Include("Class").Where(x => x.Id == assignmentId), ct);
        if (a is null) return Result<int>.Fail("Không tìm thấy bài tập.", "NOT_FOUND");

        // học viên đã duyệt của lớp
        var approved = await enrollments.ListAsync(
            new Specification<Enrollment>()
                .Where(e => e.ClassId == a.ClassId && !e.IsDeleted && e.Status == EnrollmentStatus.Approved), ct);

        var subs = await submissions.ListAsync(
            new Specification<Submission>().Where(s => s.AssignmentId == assignmentId), ct);

        // chưa nộp = chưa có bài nộp hoặc đang làm dở（trừ học viên bị loại）
        var pending = approved
            .Where(e => !IsExcluded(a, e.StudentId) &&
                        !subs.Any(s => s.StudentId == e.StudentId && s.Status != SubmissionStatus.Doing))
            .ToList();

        if (pending.Count > 0)
        {
            await notifications.AddRangeAsync(pending.Select(e => new Notification
            {
                UserId = e.StudentId,
                Body = $"🔔 Nhắc nộp bài: {a.Title} — hạn nộp {a.DueAt.ToLocalTime():dd/MM/yyyy HH:mm}.",
                Link = $"/do/{a.Id}"
            }), ct);
            await activityLogs.AddAsync(new ActivityLog
            {
                ActorId = actorId, Entity = "Assignment", EntityId = a.Id.ToString(),
                Action = $"Nhắc {pending.Count} học viên nộp bài {a.Title}"
            }, ct);
            await uow.SaveChangesAsync(ct);
        }

        return Result<int>.Ok(pending.Count);
    }

    public async Task<Result<AssignmentStatsDto>> StatsAsync(Guid assignmentId, CancellationToken ct = default)
    {
        var a = await assignments.FirstOrDefaultAsync(
            new Specification<Assignment>()
                .Include("Class.Enrollments")
                .Include("Questions")
                .Where(x => x.Id == assignmentId)
                .Split(), ct);
        if (a is null) return Result<AssignmentStatsDto>.Fail("Không tìm thấy bài tập.", "NOT_FOUND");

        var students = a.Class.Enrollments
            .Where(e => !e.IsDeleted && e.Status == EnrollmentStatus.Approved && !IsExcluded(a, e.StudentId))
            .ToList();

        var subs = await submissions.ListAsync(
            new Specification<Submission>()
                .Where(s => s.AssignmentId == assignmentId)
                .Include("Answers"), ct);

        var nSubmitted = subs.Count(s => s.Status != SubmissionStatus.Doing);
        var nLate = subs.Count(s => s.Status != SubmissionStatus.Doing && s.SubmittedAt > a.DueAt);
        var nNotSubmitted = students.Count - nSubmitted;
        var nPending = subs.Count(s => s.Status == SubmissionStatus.Submitted);

        // câu sai nhiều nhất: đếm theo đáp án sai của các bài đã nộp
        var subIds = subs.Where(s => s.Status != SubmissionStatus.Doing).Select(s => s.Id).ToList();
        var autoQuestions = a.Questions
            .Where(q => !q.IsDeleted && q.Type.IsAutoGraded())
            .OrderBy(q => q.OrderNo).ToList();

        var wrongCount = new Dictionary<Guid, int>();
        if (subIds.Count > 0)
        {
            var allAnswers = await submissionAnswers.ListAsync(
                new Specification<SubmissionAnswer>().IgnoreFilters().Where(x => subIds.Contains(x.SubmissionId)), ct);
            foreach (var ans in allAnswers)
            {
                var q = autoQuestions.FirstOrDefault(x => x.Id == ans.QuestionId);
                if (q is null || ans.AnswerText is null) continue;
                var correct = q.Type switch
                {
                    QuestionType.MultipleChoice => ans.AnswerText == q.Answer,
                    QuestionType.Fill => string.Equals(ans.AnswerText.Trim(), q.Answer, StringComparison.OrdinalIgnoreCase),
                    QuestionType.Order => ans.AnswerText.Replace(" ", "") == q.Answer,
                    QuestionType.Match => ans.AnswerText.Replace(" ", "") == q.Answer,
                    _ => false
                };
                if (!correct) wrongCount[q.Id] = wrongCount.GetValueOrDefault(q.Id) + 1;
            }
        }

        var topWrong = wrongCount.OrderByDescending(kv => kv.Value).Take(2)
            .Select(kv =>
            {
                var q = autoQuestions.First(x => x.Id == kv.Key);
                return new WrongQuestionDto(q.OrderNo, q.Prompt, kv.Value);
            }).ToList();

        return Result<AssignmentStatsDto>.Ok(new AssignmentStatsDto(
            students.Count, nSubmitted, nLate, nNotSubmitted, nPending, topWrong));
    }

    /// <summary>Học viên có bị loại khỏi bài tập hay không.</summary>
    private static bool IsExcluded(Assignment a, Guid studentId) =>
        (a.ExcludedStudentIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(x => Guid.TryParse(x, out var g) && g == studentId);

    private static AssignmentDetailDto ToDetail(Assignment a, bool hideAnswers = false) => new(
        a.Id, a.Title, a.Description, a.ClassId, a.LessonId, a.DueAt, a.PublishAt,
        a.DurationMin, a.MaxAttempts, a.LatePolicy.ToString(), a.ShowAnswer, a.Shuffle,
        a.ExcludedStudentIds,
        a.Questions.Where(q => !q.IsDeleted).OrderBy(q => q.OrderNo)
            .Select(q => new QuestionDto(
                q.Id, q.OrderNo, q.Type.ToString(), q.Prompt, q.Points,
                q.Options?.Where(o => !o.IsDeleted).OrderBy(o => o.OrderNo).Select(o => o.Text).ToList(),
                hideAnswers ? null : q.Answer, hideAnswers ? null : q.SampleAnswer, q.KnowledgeTag)).ToList());
}
