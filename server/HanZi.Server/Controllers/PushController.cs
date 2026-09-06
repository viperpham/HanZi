using HanZi.Server.Domain.Entities;
using HanZi.Server.Infrastructure.Data;
using HanZi.Server.Infrastructure.Interceptors;
using HanZi.Server.Infrastructure.Push;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Controllers;

/// <summary>
/// Web Push: cho phép trình duyệt đăng ký/ huỷ đăng ký nhận thông báo đẩy.
/// Public key trả về cho client (ẩn danh) để subscribe với PushManager.
/// </summary>
[ApiController]
[Route("api/push")]
public class PushController(AppDbContext db, VapidKeyProvider keys, ICurrentUser currentUser) : ControllerBase
{
    public record SubscribeRequest(string Endpoint, string P256dh, string Auth);
    public record UnsubscribeRequest(string Endpoint);

    /// <summary>Khoá công khai VAPID cho client — ẩn danh vì cần trước khi đăng nhập bật thông báo.</summary>
    [HttpGet("publickey")]
    [AllowAnonymous]
    public IActionResult PublicKey()
        => Ok(new { success = true, data = keys.Get().PublicKey });

    /// <summary>Lưu (hoặc cập nhật) subscription của trình duyệt hiện tại.</summary>
    [HttpPost("subscribe")]
    [Authorize]
    public async Task<IActionResult> Subscribe(SubscribeRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Endpoint) || string.IsNullOrWhiteSpace(req.P256dh) || string.IsNullOrWhiteSpace(req.Auth))
            return BadRequest(new { success = false, error = "Thiếu endpoint / khoá mã hoá." });

        var userId = currentUser.UserId!.Value;
        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == req.Endpoint, ct);

        if (existing is null)
        {
            db.PushSubscriptions.Add(new PushSubscription
            {
                UserId = userId,
                Endpoint = req.Endpoint,
                P256dh = req.P256dh,
                Auth = req.Auth
            });
        }
        else
        {
            // Endpoint đã tồn tại (vd trình duyệt khác user cũ) — cập nhật về user hiện tại
            existing.UserId = userId;
            existing.P256dh = req.P256dh;
            existing.Auth = req.Auth;
            existing.IsDeleted = false;
            existing.DeletedAt = null;
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    /// <summary>Huỷ đăng ký khi trình duyệt tự unsubscribe hoặc user tắt thông báo.</summary>
    [HttpPost("unsubscribe")]
    [Authorize]
    public async Task<IActionResult> Unsubscribe(UnsubscribeRequest req, CancellationToken ct)
    {
        var sub = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == req.Endpoint, ct);
        if (sub is not null)
        {
            db.PushSubscriptions.Remove(sub);
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { success = true });
    }
}
