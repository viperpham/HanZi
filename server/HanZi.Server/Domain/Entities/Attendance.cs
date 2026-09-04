using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

/// <summary>Điểm danh học viên trong lớp — 1 bản ghi / học viên / lớp / ngày.</summary>
public class Attendance : FullAuditedEntity
{
    public Guid ClassId { get; set; }
    public Guid StudentId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;

    public ClassRoom Class { get; set; } = null!;
    public User Student { get; set; } = null!;
}
