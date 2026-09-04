namespace HanZi.Server.Application.Features.Assignments.Dtos;

public record AssignmentListDto(
    Guid Id, string Title, string? Description, Guid ClassId, string? ClassName,
    Guid LessonId, DateTime DueAt, DateTime? PublishAt, int DurationMin, int MaxAttempts,
    string LatePolicy, string? CreatedByName, int QuestionCount);

public record AssignmentDetailDto(
    Guid Id, string Title, string? Description, Guid ClassId, Guid LessonId,
    DateTime DueAt, DateTime? PublishAt, int DurationMin, int MaxAttempts, string LatePolicy,
    bool ShowAnswer, bool Shuffle,
    IReadOnlyList<QuestionDto> Questions);

public record QuestionDto(
    Guid Id, int OrderNo, string Type, string Prompt, decimal Points,
    IReadOnlyList<string>? Options, string? Answer, string? SampleAnswer);

public record QuestionUpsertDto(
    string Type, string Prompt, decimal Points,
    IReadOnlyList<string>? Options, string? Answer, string? SampleAnswer);

public record AssignmentCreateRequest(
    string Title, string? Description, Guid ClassId, Guid LessonId,
    DateTime DueAt, DateTime? PublishAt, int DurationMin, int MaxAttempts, string LatePolicy,
    bool ShowAnswer, bool Shuffle, IReadOnlyList<QuestionUpsertDto> Questions);

public record SubmissionListItemDto(
    Guid Id, Guid StudentId, string StudentName, string Status,
    DateTime? SubmittedAt, decimal AutoScore, decimal ManualScore, decimal FinalScore,
    bool NoteSent);
