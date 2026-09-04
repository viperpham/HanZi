using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Data;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Application.Features.Auth;

using HanZi.Server.Application.Features.Auth.Dtos;

public interface IAuthService
{
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<Result<AuthResponse>> RefreshAsync(RefreshRequest request, CancellationToken ct = default);
    Task<Result> LogoutAsync(Guid userId, CancellationToken ct = default);
    Task<Result<ForgotPasswordResponse>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);
    Task<Result> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
}

public class AuthService(
    AppDbContext db,
    IRepository<User> users,
    IUnitOfWork uow,
    ITokenService tokens,
    JwtSettings jwtSettings,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
            return Result<AuthResponse>.Fail("Email hoặc mật khẩu không đúng.", "BAD_CREDENTIALS");
        if (user.Locked)
            return Result<AuthResponse>.Fail("Tài khoản đã bị khóa. Liên hệ quản trị viên.", "LOCKED");

        user.LastLoginAt = DateTime.UtcNow;
        user.RefreshToken = tokens.CreateRefreshToken();
        user.RefreshTokenExpiresAt = tokens.RefreshTokenExpiry(jwtSettings);
        db.ActivityLogs.Add(new ActivityLog { ActorId = user.Id, Action = "Đăng nhập hệ thống" });
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("User {Email} đăng nhập", user.Email);
        return Result<AuthResponse>.Ok(new AuthResponse(
            tokens.CreateAccessToken(user),
            user.RefreshToken,
            DateTime.UtcNow.AddMinutes(jwtSettings.AccessTokenMinutes),
            new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString())));
    }

    public async Task<Result<AuthResponse>> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var user = await users.FirstOrDefaultAsync(
            new Specification<User>().Where(u => u.RefreshToken == request.RefreshToken).Track(), ct);

        if (user is null || user.RefreshTokenExpiresAt is null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
            return Result<AuthResponse>.Fail("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "INVALID_REFRESH");

        // xoay vòng refresh token (mỗi lần dùng 1 token mới)
        user.RefreshToken = tokens.CreateRefreshToken();
        user.RefreshTokenExpiresAt = tokens.RefreshTokenExpiry(jwtSettings);
        await uow.SaveChangesAsync(ct);

        return Result<AuthResponse>.Ok(new AuthResponse(
            tokens.CreateAccessToken(user),
            user.RefreshToken,
            DateTime.UtcNow.AddMinutes(jwtSettings.AccessTokenMinutes),
            new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString())));
    }

    public async Task<Result> LogoutAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return Result.Fail("Không tìm thấy tài khoản.");
        user.RefreshToken = null;
        user.RefreshTokenExpiresAt = null;
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    /// <summary>Mã xác nhận 6 số, hiệu lực 10 phút — lưu trong bộ nhớ.</summary>
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (string Code, DateTime Expires)> ResetCodes = new();

    public async Task<Result<ForgotPasswordResponse>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);
        if (user is null)
            return Result<ForgotPasswordResponse>.Fail("Không tìm thấy tài khoản với email này.", "NOT_FOUND");

        var code = Random.Shared.Next(100000, 1000000).ToString();
        ResetCodes[email] = (code, DateTime.UtcNow.AddMinutes(10));

        // Chưa có cổng email/Zalo — mã tạm ghi ra log và trả về cho client (dev)
        logger.LogInformation("Mã đặt lại mật khẩu cho {Email}: {Code}", email, code);
        return Result<ForgotPasswordResponse>.Ok(new ForgotPasswordResponse(code));
    }

    public async Task<Result> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);
        if (user is null) return Result.Fail("Không tìm thấy tài khoản.", "NOT_FOUND");
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return Result.Fail("Mật khẩu mới cần ít nhất 6 ký tự.");

        if (!ResetCodes.TryGetValue(email, out var entry)
            || entry.Expires < DateTime.UtcNow
            || entry.Code != request.Code.Trim())
            return Result.Fail("Mã xác nhận không đúng hoặc đã hết hạn.", "BAD_CODE");

        user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
        user.RefreshToken = null;
        user.RefreshTokenExpiresAt = null;
        ResetCodes.TryRemove(email, out _);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("User {Email} đã đặt lại mật khẩu", email);
        return Result.Ok();
    }
}
