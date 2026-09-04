using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public class GrammarExample : FullAuditedEntity
{
    public Guid GrammarPointId { get; set; }
    public int OrderNo { get; set; }
    public string Zh { get; set; } = "";
    public string? Pinyin { get; set; }
    public string Vi { get; set; } = "";
    public string? AudioUrl { get; set; }

    public GrammarPoint GrammarPoint { get; set; } = null!;
}
