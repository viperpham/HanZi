using HanZi.Server.Application.Features.Notifications;
using HanZi.Server.Application.Features.Notifications.Dtos;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(INotificationService service, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
        => (await service.ListMineAsync(currentUser.UserId!.Value, ct)).ToActionResult();

    [HttpPost("read")]
    public async Task<IActionResult> MarkRead(MarkReadRequest req, CancellationToken ct)
        => (await service.MarkReadAsync(currentUser.UserId!.Value, req.Id, ct)).ToActionResult();

    /// <summary>Đánh dấu tất cả thông báo là đã đọc.</summary>
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
        => (await service.MarkAllReadAsync(currentUser.UserId!.Value, ct)).ToActionResult();
}
