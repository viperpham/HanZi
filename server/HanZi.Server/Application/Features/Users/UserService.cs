using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;
using Mapster;

namespace HanZi.Server.Application.Features.Users;

using HanZi.Server.Application.Features.Users.Dtos;
using HanZi.Server.Application.Features.Auth.Dtos;

public interface IUserService
{
    Task<Result<IReadOnlyList<UserListDto>>> ListAsync(string? role, CancellationToken ct = default);
    Task<Result<UserListDto>> CreateAsync(UserCreateRequest req, Guid actorId, CancellationToken ct = default);
    Task<Result<UserListDto>> UpdateAsync(Guid id, UserUpdateRequest req, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, Guid actorId, CancellationToken ct = default);
    /// <summary>Đăng nhập với vai trò này — Admin nhận phiên với tư cách người dùng đích (refresh cũ bị thu hồi).</summary>
    Task<Result<AuthResponse>> LoginAsAsync(Guid id, CancellationToken ct = default);
}

public class UserService(IRepository<User> repo, ITokenService tokens, JwtSettings jwtSettings, IUnitOfWork uow) : IUserService
{
    public async Task<Result<IReadOnlyList<UserListDto>>> ListAsync(string? role, CancellationToken ct = default)
    {
        var spec = new Specification<User>().Order(u => u.CreatedAt);
        if (Enum.TryParse<UserRole>(role, true, out var r)) spec.Where(u => u.Role == r);

        var list = await repo.ListAsync(spec, ct);
        return Result<IReadOnlyList<UserListDto>>.Ok(list
            .Adapt<List<UserListDto>>());
    }

    public async Task<Result<UserListDto>> CreateAsync(UserCreateRequest req, Guid actorId, CancellationToken ct = default)
    {
        if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
            return Result<UserListDto>.Fail("Vai trò không hợp lệ (Student | Teacher | Admin).");

        var email = req.Email.Trim().ToLowerInvariant();
        if (await repo.AnyAsync(new Specification<User>().Where(u => u.Email == email), ct))
            return Result<UserListDto>.Fail("Email này đã có tài khoản.", "DUPLICATE");

        var user = new User
        {
            FullName = req.FullName,
            Email = email,
            PasswordHash = PasswordHasher.Hash(req.Password),
            Role = role
        };
        await repo.AddAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        return Result<UserListDto>.Ok(user.Adapt<UserListDto>());
    }

    public async Task<Result<UserListDto>> UpdateAsync(Guid id, UserUpdateRequest req, CancellationToken ct = default)
    {
        var user = await repo.GetByIdAsync(id, ct);
        if (user is null) return Result<UserListDto>.Fail("Không tìm thấy người dùng.", "NOT_FOUND");

        if (req.FullName is not null) user.FullName = req.FullName;

        if (req.Email is not null)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var duplicated = await repo.AnyAsync(
                new Specification<User>().Where(u => u.Email == email && u.Id != id), ct);
            if (duplicated) return Result<UserListDto>.Fail("Email này đã có người dùng khác sử dụng.", "DUPLICATE");
            user.Email = email;
        }
        if (req.Phone is not null) user.Phone = req.Phone.Trim();

        if (req.Role is not null)
        {
            if (!Enum.TryParse<UserRole>(req.Role, true, out var r))
                return Result<UserListDto>.Fail("Vai trò không hợp lệ.");
            user.Role = r;
        }
        if (req.Locked is not null) user.Locked = req.Locked.Value;
        if (!string.IsNullOrWhiteSpace(req.NewPassword))
            user.PasswordHash = PasswordHasher.Hash(req.NewPassword);

        repo.Update(user);
        await uow.SaveChangesAsync(ct);
        return Result<UserListDto>.Ok(user.Adapt<UserListDto>());
    }

    public async Task<Result> DeleteAsync(Guid id, Guid actorId, CancellationToken ct = default)
    {
        if (id == actorId) return Result.Fail("Không thể xoá chính mình.");
        var user = await repo.GetByIdAsync(id, ct);
        if (user is null) return Result.Fail("Không tìm thấy người dùng.", "NOT_FOUND");
        repo.SoftDelete(user);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result<AuthResponse>> LoginAsAsync(Guid id, CancellationToken ct = default)
    {
        var user = await repo.GetByIdAsync(id, ct);
        if (user is null) return Result<AuthResponse>.Fail("Không tìm thấy người dùng.", "NOT_FOUND");
        if (user.Locked) return Result<AuthResponse>.Fail("Tài khoản đang bị khoá.", "LOCKED");

        // Mở phiên với tư cách người dùng đích = một lần đăng nhập mới: refresh cũ bị thu hồi
        user.RefreshToken = tokens.CreateRefreshToken();
        user.RefreshTokenExpiresAt = tokens.RefreshTokenExpiry(jwtSettings);
        repo.Update(user);
        await uow.SaveChangesAsync(ct);

        return Result<AuthResponse>.Ok(new AuthResponse(
            tokens.CreateAccessToken(user),
            user.RefreshToken,
            DateTime.UtcNow.AddMinutes(jwtSettings.AccessTokenMinutes),
            new UserInfo(user.Id, user.FullName, user.Email, user.Role.ToString())));
    }
}
