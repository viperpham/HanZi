using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public class Notification : FullAuditedEntity
{
    public Guid UserId { get; set; }
    public string Body { get; set; } = "";
    public string? Link { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
