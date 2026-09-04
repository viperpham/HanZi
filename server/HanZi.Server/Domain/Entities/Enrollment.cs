using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

/// <summary>Học viên thuộc lớp (bảng trung gian n-n).</summary>
public class Enrollment : FullAuditedEntity
{
    public Guid ClassId { get; set; }
    public Guid StudentId { get; set; }

    /// <summary>Thêm trực tiếp bởi giáo viên = Approved; tự tham gia bằng mã lớp = Pending chờ duyệt.</summary>
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Approved;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public ClassRoom Class { get; set; } = null!;
    public User Student { get; set; } = null!;
}
