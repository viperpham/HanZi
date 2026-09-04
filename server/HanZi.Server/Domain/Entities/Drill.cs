using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>Bài luyện nhanh gắn với một điểm ngữ pháp.</summary>
public class Drill : FullAuditedEntity
{
    public Guid GrammarPointId { get; set; }
    public int OrderNo { get; set; }
    public string Question { get; set; } = "";
    public int AnswerIndex { get; set; }

    public GrammarPoint GrammarPoint { get; set; } = null!;
    public ICollection<DrillOption> Options { get; set; } = [];
}
