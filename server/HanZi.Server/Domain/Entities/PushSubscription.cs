using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>
/// Đăng ký nhận Web Push của 1 trình duyệt (endpoint + khoá mã hoá).
/// Mỗi user có thể có nhiều thiết bị — endpoint là khoá duy nhất.
/// </summary>
public class PushSubscription : FullAuditedEntity
{
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
    public DateTime? LastUsedAt { get; set; }

    public User User { get; set; } = null!;
}
