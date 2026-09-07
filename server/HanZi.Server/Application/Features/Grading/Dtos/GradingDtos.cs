namespace HanZi.Server.Application.Features.Grading.Dtos;

using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using HanZi.Server.Application.Features.Files.Dtos;

public record AnswerSubmitDto(
    Guid QuestionId,
    [property: JsonConverter(typeof(LenientStringConverter))] string? AnswerText);

public record SubmitRequest(IReadOnlyList<AnswerSubmitDto> Answers, IReadOnlyList<Guid>? AttachmentIds = null);

public record SubmissionDetailDto(
    Guid Id, Guid AssignmentId, Guid? LessonId, Guid StudentId, string StudentName, string Status,
    DateTime? SubmittedAt, decimal AutoScore, decimal ManualScore, decimal FinalScore,
    IReadOnlyList<AnswerDetailDto> Answers,
    GradingNoteDto? Note,
    string? Title = null,
    IReadOnlyList<FileAssetDto>? Attachments = null);

public record AnswerDetailDto(
    Guid QuestionId, int OrderNo, string QuestionType, string Prompt, decimal Points,
    IReadOnlyList<string>? Options, string? CorrectAnswer, string? SampleAnswer,
    string? AnswerText, decimal? AutoScore, string? TeacherComment, string? KnowledgeTag);

/// <summary>
/// Client cũ có thể gửi câu trả lời trắc nghiệm dạng SỐ (index) trong JSON.
/// Converter này đọc số/bool về chuỗi để không vỡ request — trả lời vẫn lưu chuỗi như cũ.
/// </summary>
public class LenientStringConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => reader.TryGetInt64(out var l)
                ? l.ToString(CultureInfo.InvariantCulture)
                : reader.GetDouble().ToString(CultureInfo.InvariantCulture),
            JsonTokenType.True => "true",
            JsonTokenType.False => "false",
            JsonTokenType.Null => null,
            _ => throw new JsonException()
        };

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}

public record GradingNoteDto(
    string[] WeakTags, string? Comment, string[] Todos, DateTime? SentAt, string? Reply);

public record GradeRequest(
    decimal ManualScore,
    IReadOnlyList<AnswerGradeDto> Answers,
    string[] WeakTags, string? Comment, string[] Todos);

public record AnswerGradeDto(Guid QuestionId, decimal? AutoScore, string? Comment);

/// <summary>Gửi/cập nhật ghi chú riêng mà không đổi điểm — dùng khi áp dụng hàng loạt.</summary>
public record NoteRequest(string[] WeakTags, string? Comment, string[] Todos);
