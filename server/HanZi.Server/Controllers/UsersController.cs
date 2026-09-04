using HanZi.Server.Application.Features.Users;
using HanZi.Server.Application.Features.Users.Dtos;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin,Teacher")]
public class UsersController(IUserService service, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? role, CancellationToken ct)
        => (await service.ListAsync(role, ct)).ToActionResult();

    /// <summary>Tạo tài khoản đăng nhập thật (mật khẩu do admin đặt, mặc định 123456 ở client).</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(UserCreateRequest req, CancellationToken ct)
        => (await service.CreateAsync(req, currentUser.UserId ?? Guid.Empty, ct)).ToActionResult();

    /// <summary>Đổi vai trò / khoá-mở khoá / đặt lại mật khẩu.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, UserUpdateRequest req, CancellationToken ct)
        => (await service.UpdateAsync(id, req, ct)).ToActionResult();

    /// <summary>Xoá mềm tài khoản (có thể khôi phục).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await service.DeleteAsync(id, currentUser.UserId ?? Guid.Empty, ct)).ToActionResult();

    /// <summary>Đăng nhập với vai trò này — Admin mở phiên với tư cách người dùng đích.</summary>
    [HttpPost("{id:guid}/login-as")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> LoginAs(Guid id, CancellationToken ct)
        => (await service.LoginAsAsync(id, ct)).ToActionResult();
}
