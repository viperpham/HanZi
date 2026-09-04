namespace HanZi.Server.Application.Features.Auth.Dtos;

public record LoginRequest(string Email, string Password);

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
    string FullName,
    string Email,
    string Role);
