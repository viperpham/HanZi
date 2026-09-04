using HanZi.Server.Application.Features.Progress;
using HanZi.Server.Application.Features.Progress.Dtos;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/progress")]
[Authorize]
public class ProgressController(IProgressService service, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
        => (await service.GetMyAsync(currentUser.UserId!.Value, ct)).ToActionResult();

    /// <summary>Học viên cập nhật tiến độ học bài (chỉ tiến không lùi).</summary>
    [HttpPost("upsert")]
    public async Task<IActionResult> Upsert(ProgressUpsertRequest req, CancellationToken ct)
        => (await service.UpsertAsync(currentUser.UserId!.Value, req, ct)).ToActionResult();
}
