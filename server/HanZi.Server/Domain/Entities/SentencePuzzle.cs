using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>Câu sắp xếp trong phần Ôn tập của bài học — học viên bấm các thẻ từ để ghép câu.</summary>
public class SentencePuzzle : FullAuditedEntity
{
    public Guid LessonId { get; set; }
    public int OrderNo { get; set; }

    /// <summary>Câu tiếng Trung hoàn chỉnh — các từ cách nhau bằng dấu cách.</summary>
    public string Sentence { get; set; } = "";
    public string? Pinyin { get; set; }
    public string MeaningVi { get; set; } = "";

    public Lesson Lesson { get; set; } = null!;
}
