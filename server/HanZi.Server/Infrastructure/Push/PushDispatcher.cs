using System.Net;
using System.Text;
using System.Text.Json;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Hubs;
using HanZi.Server.Infrastructure.Data;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using DomainPushSubscription = HanZi.Server.Domain.Entities.PushSubscription;

namespace HanZi.Server.Infrastructure.Push;

/// <summary>
/// Phát thông báo vừa tạo: SignalR realtime cho tab đang mở + Web Push cho thiết bị offline.
/// Được UnitOfWork gọi sau khi commit — mọi service tạo thông báo đều tự động được đẩy.
/// Subscription push hết hạn (404/410) sẽ bị xoá mềm.
/// </summary>
public class PushDispatcher(AppDbContext db, VapidKeyProvider keys, PushServiceClient client,
    IHubContext<NotificationHub> hub, IOptions<PushOptions> options, ILogger<PushDispatcher> logger)
{
    /// <summary>Gửi push cho các thông báo mới tạo. Gọi SAU SaveChangesAsync.</summary>
    public async Task DispatchNewNotificationsAsync(IReadOnlyList<Notification> notifications, CancellationToken ct = default)
    {
        // Realtime in-web: đẩy ngay qua SignalR tới mọi tab đang mở của user
        foreach (var group in notifications.GroupBy(n => n.UserId))
        {
            foreach (var n in group)
            {
                try
                {
                    await hub.Clients.User(group.Key.ToString()).SendAsync("notification", new
                    {
                        body = n.Body,
                        link = n.Link
                    }, ct);
                }
                catch (Exception ex) { logger.LogWarning(ex, "SignalR đẩy notification thất bại tới {UserId}", group.Key); }
            }
        }

        var (publicKey, privateKey) = keys.Get();
        var authentication = new VapidAuthentication(publicKey, privateKey) { Subject = options.Value.Subject };


        var dirty = false;
        foreach (var group in notifications.GroupBy(n => n.UserId))
        {
            var subs = await db.PushSubscriptions
                .Where(s => s.UserId == group.Key)
                .ToListAsync(ct);
            if (subs.Count == 0) continue;

            foreach (var n in group)
            {
                var payload = JsonSerializer.Serialize(new
                {
                    body = n.Body.Length > 300 ? n.Body[..300] + "…" : n.Body,
                    link = n.Link
                });
                dirty |= await SendToDevicesAsync(subs, payload, authentication, ct);
            }
        }

        if (dirty) await db.SaveChangesAsync(ct);
    }

    /// <returns>true nếu có subscription bị cập nhật/xoá (cần SaveChanges).</returns>
    private async Task<bool> SendToDevicesAsync(List<DomainPushSubscription> subs, string payload,
        VapidAuthentication authentication, CancellationToken ct)
    {
        var message = new PushMessage(new StringContent(payload, Encoding.UTF8, "application/json"))
        {
            Urgency = PushMessageUrgency.Normal,
            TimeToLive = 86400
        };
        var now = DateTime.UtcNow;
        var dirty = false;
        foreach (var sub in subs)
        {
            var prefix = sub.Endpoint[..Math.Min(60, sub.Endpoint.Length)];
            try
            {
                await client.RequestPushMessageDeliveryAsync(new Lib.Net.Http.WebPush.PushSubscription
                {
                    Endpoint = sub.Endpoint,
                    Keys = new Dictionary<string, string> { ["p256dh"] = sub.P256dh, ["auth"] = sub.Auth }
                }, message, authentication, ct);
                sub.LastUsedAt = now;
                dirty = true;
                logger.LogInformation("Web Push đã gửi tới {EndpointPrefix}…", prefix);
            }
            catch (PushServiceClientException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
            {
                sub.IsDeleted = true;
                sub.DeletedAt = now;
                dirty = true;
                logger.LogInformation("Web Push subscription hết hạn (HTTP {Code}) — xoá {EndpointPrefix}…", (int)ex.StatusCode, prefix);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Web Push gửi thất bại tới {EndpointPrefix}…", prefix);
            }
        }
        return dirty;
    }
}
