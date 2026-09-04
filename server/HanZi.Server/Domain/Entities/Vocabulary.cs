using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public class Vocabulary : FullAuditedEntity
{
    public Guid LessonId { get; set; }
    public int OrderNo { get; set; }
    public string Hanzi { get; set; } = "";
    public string Pinyin { get; set; } = "";
    public string? Hanviet { get; set; }
    public string? PartOfSpeech { get; set; }
    public string MeaningVi { get; set; } = "";
    public string? Emoji { get; set; }
    public string? ExampleZh { get; set; }
    public string? ExamplePinyin { get; set; }
    public string? ExampleVi { get; set; }
    public string? AudioUrl { get; set; }

    /// <summary>Từ này có xuất hiện trong phần Khởi động (thẻ lật) không.</summary>
    public bool InWarmup { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
