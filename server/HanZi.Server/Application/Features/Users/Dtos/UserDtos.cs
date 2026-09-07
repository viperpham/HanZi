namespace HanZi.Server.Application.Features.Users.Dtos;

public record UserListDto(Guid Id, string Username, string FullName, string Email, string? Phone, string Role, bool Locked, DateTime? LastLoginAt);

public record UserCreateRequest(string Username, string FullName, string Email, string Password, string Role);

public record UserUpdateRequest(string? Username, string? FullName, string? Email, string? Phone, string? Role, bool? Locked, string? NewPassword);
