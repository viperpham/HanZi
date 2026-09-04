using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using Microsoft.IdentityModel.Tokens;

namespace HanZi.Server.Infrastructure.Auth;

public interface ITokenService
{
    /// <summary>Tạo access token JWT (15 phút) chứa id + tên + vai trò.</summary>
    string CreateAccessToken(User user);

    /// <summary>Tạo refresh token ngẫu nhiên (lưu DB, 30 ngày) — có thể revoke.</summary>
    string CreateRefreshToken();

    DateTime RefreshTokenExpiry(JwtSettings settings);
}

public class JwtTokenService(JwtSettings settings) : ITokenService
{
    public string CreateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(settings.AccessTokenMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public DateTime RefreshTokenExpiry(JwtSettings s) =>
        DateTime.UtcNow.AddDays(s.RefreshTokenDays);
}

public static class PasswordHasher
{
    /// <summary>Hash bằng BCrypt — salt tự sinh, so sánh dùng Verify.</summary>
    public static string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);

    public static bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

public static class RoleExtensions
{
    public static string ToRoleString(this UserRole role) => role.ToString();
}
