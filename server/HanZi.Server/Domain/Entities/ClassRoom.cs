using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class ClassRoom : FullAuditedEntity
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public Guid CurriculumId { get; set; }
    public Guid TeacherId { get; set; }
    public string? Schedule { get; set; }
    public string? Room { get; set; }
    public ClassStatus Status { get; set; } = ClassStatus.Upcoming;

    public Curriculum Curriculum { get; set; } = null!;
    public User Teacher { get; set; } = null!;
    public ICollection<Enrollment> Enrollments { get; set; } = [];
    public ICollection<Assignment> Assignments { get; set; } = [];
}
