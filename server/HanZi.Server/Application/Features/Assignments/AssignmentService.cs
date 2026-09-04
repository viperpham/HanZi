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
}

public class AssignmentService(
    ICurrentUser currentUser,
    IRepository<Assignment> assignments,
    IRepository<Question> questions,
    IRepository<QuestionOption> options,
    IRepository<Submission> submissions,
    IRepository<User> users,
    IRepository<Enrollment> enrollments,
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
            CreatedBy = actorId
        };
        await assignments.AddAsync(a, ct);

        var addResult = await AddQuestionsAsync(a.Id, req.Questions, ct);
        if (!addResult.Success) return Result<AssignmentDetailDto>.Fail(addResult.Error!);

        await activityLogs.AddAsync(new ActivityLog { ActorId = actorId, Entity = "Assignment", EntityId = a.Id.ToString(), Action = $"Giao bài tập {a.Title}" }, ct);
        await uow.SaveChangesAsync(ct);
        return await GetByIdAsync(a.Id, ct);
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
                SampleAnswer = q.SampleAnswer
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

    private static AssignmentDetailDto ToDetail(Assignment a, bool hideAnswers = false) => new(
        a.Id, a.Title, a.Description, a.ClassId, a.LessonId, a.DueAt, a.PublishAt,
        a.DurationMin, a.MaxAttempts, a.LatePolicy.ToString(), a.ShowAnswer, a.Shuffle,
        a.Questions.Where(q => !q.IsDeleted).OrderBy(q => q.OrderNo)
            .Select(q => new QuestionDto(
                q.Id, q.OrderNo, q.Type.ToString(), q.Prompt, q.Points,
                q.Options?.Where(o => !o.IsDeleted).OrderBy(o => o.OrderNo).Select(o => o.Text).ToList(),
                hideAnswers ? null : q.Answer, hideAnswers ? null : q.SampleAnswer)).ToList());
}
