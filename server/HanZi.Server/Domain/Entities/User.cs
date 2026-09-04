using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class User : FullAuditedEntity
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.Student;
    public bool Locked { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Refresh token hiện hành — revoke khi logout, xoay vòng khi refresh.</summary>
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }

    public ICollection<Enrollment> Enrollments { get; set; } = [];
}
