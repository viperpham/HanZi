using HanZi.Server.Application.Features.Auth;
using HanZi.Server.Application.Features.Auth.Dtos;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth, ICurrentUser currentUser) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
        => (await auth.LoginAsync(req, ct)).ToActionResult();

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(RefreshRequest req, CancellationToken ct)
        => (await auth.RefreshAsync(req, ct)).ToActionResult();

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest req, CancellationToken ct)
        => (await auth.ForgotPasswordAsync(req, ct)).ToActionResult();

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req, CancellationToken ct)
        => (await auth.ResetPasswordAsync(req, ct)).ToActionResult();

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (currentUser.UserId is { } id) await auth.LogoutAsync(id, ct);
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var uid = currentUser.UserId!.Value;
        return Ok(new { success = true, data = new { id = uid, currentUser.Role } });
    }
}
