using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class DialogueLine : FullAuditedEntity
{
    public Guid LessonId { get; set; }
    public int OrderNo { get; set; }
    public Speaker Speaker { get; set; } = Speaker.A;
    public string Zh { get; set; } = "";
    public string? Pinyin { get; set; }
    public string Vi { get; set; } = "";
    public string? AudioUrl { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
