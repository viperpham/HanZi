namespace HanZi.Server.Application.Features.Grading.Dtos;

public record AnswerSubmitDto(Guid QuestionId, string? AnswerText);

public record SubmitRequest(IReadOnlyList<AnswerSubmitDto> Answers);

public record SubmissionDetailDto(
    Guid Id, Guid AssignmentId, Guid StudentId, string StudentName, string Status,
    DateTime? SubmittedAt, decimal AutoScore, decimal ManualScore, decimal FinalScore,
    IReadOnlyList<AnswerDetailDto> Answers,
    GradingNoteDto? Note);

public record AnswerDetailDto(
    Guid QuestionId, int OrderNo, string QuestionType, string Prompt, decimal Points,
    IReadOnlyList<string>? Options, string? CorrectAnswer, string? SampleAnswer,
    string? AnswerText, decimal? AutoScore, string? TeacherComment);

public record GradingNoteDto(
    string[] WeakTags, string? Comment, string[] Todos, DateTime? SentAt, string? Reply);

public record GradeRequest(
    decimal ManualScore,
    IReadOnlyList<AnswerGradeDto> Answers,
    string[] WeakTags, string? Comment, string[] Todos);

public record AnswerGradeDto(Guid QuestionId, decimal? AutoScore, string? Comment);
