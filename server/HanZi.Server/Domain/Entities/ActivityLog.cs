using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public class ActivityLog : FullAuditedEntity
{
    public Guid? ActorId { get; set; }
    public string Action { get; set; } = "";
    public string? Entity { get; set; }
    public string? EntityId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
