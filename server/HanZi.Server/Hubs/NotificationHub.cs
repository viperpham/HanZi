using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HanZi.Server.Hubs;

/// <summary>
/// Hub realtime: server đẩy sự kiện "notification" tới đúng user (theo NameIdentifier = UserId).
/// Client kết nối bằng JWT (access_token trên query string khi negotiate).
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    // Không cần method nào — chỉ server → client
}
