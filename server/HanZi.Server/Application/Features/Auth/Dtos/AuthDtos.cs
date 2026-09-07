namespace HanZi.Server.Application.Features.Auth.Dtos;

/// <summary>Account chấp nhận username hoặc email.</summary>
public record LoginRequest(string Account, string Password);

public record RefreshRequest(string RefreshToken);

public record ForgotPasswordRequest(string Email);

public record ForgotPasswordResponse(string Code);

public record ResetPasswordRequest(string Email, string Code, string NewPassword);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    UserInfo User);

public record UserInfo(
    Guid Id,
    string Username,
    string FullName,
    string Email,
    string Role);
