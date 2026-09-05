namespace HanZi.Server.Application.Features.Grading.Dtos;

public record AnswerSubmitDto(Guid QuestionId, string? AnswerText);

public record SubmitRequest(IReadOnlyList<AnswerSubmitDto> Answers);

public record SubmissionDetailDto(
    Guid Id, Guid AssignmentId, Guid? LessonId, Guid StudentId, string StudentName, string Status,
    DateTime? SubmittedAt, decimal AutoScore, decimal ManualScore, decimal FinalScore,
    IReadOnlyList<AnswerDetailDto> Answers,
    GradingNoteDto? Note,
    string? Title = null);

public record AnswerDetailDto(
    Guid QuestionId, int OrderNo, string QuestionType, string Prompt, decimal Points,
    IReadOnlyList<string>? Options, string? CorrectAnswer, string? SampleAnswer,
    string? AnswerText, decimal? AutoScore, string? TeacherComment, string? KnowledgeTag);

public record GradingNoteDto(
    string[] WeakTags, string? Comment, string[] Todos, DateTime? SentAt, string? Reply);

public record GradeRequest(
    decimal ManualScore,
    IReadOnlyList<AnswerGradeDto> Answers,
    string[] WeakTags, string? Comment, string[] Todos);

public record AnswerGradeDto(Guid QuestionId, decimal? AutoScore, string? Comment);

/// <summary>Gửi/cập nhật ghi chú riêng mà không đổi điểm — dùng khi áp dụng hàng loạt.</summary>
public record NoteRequest(string[] WeakTags, string? Comment, string[] Todos);
