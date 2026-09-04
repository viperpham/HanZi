using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public class DrillOption : FullAuditedEntity
{
    public Guid DrillId { get; set; }
    public int OrderNo { get; set; }
    public string Text { get; set; } = "";

    public Drill Drill { get; set; } = null!;
}
