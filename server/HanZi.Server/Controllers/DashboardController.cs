using HanZi.Server.Application.Features.Dashboard;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(IDashboardService service, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("student")]
    public async Task<IActionResult> Student(CancellationToken ct)
        => (await service.StudentHomeAsync(currentUser.UserId!.Value, ct)).ToActionResult();

    [HttpGet("teacher")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Teacher(CancellationToken ct)
        => (await service.TeacherHomeAsync(currentUser.UserId!.Value, ct)).ToActionResult();

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Admin(CancellationToken ct)
        => (await service.AdminHomeAsync(ct)).ToActionResult();

    [HttpGet("activity-log")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ActivityLog([FromQuery] int take = 50, CancellationToken ct = default)
        => (await service.ActivityLogAsync(take, ct)).ToActionResult();
}
