using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class Curriculum : FullAuditedEntity
{
    public string Code { get; set; } = "";
    public string NameVi { get; set; } = "";
    public string NameZh { get; set; } = "";
    public string Level { get; set; } = "HSK1";
    public string? Description { get; set; }
    public string? CoverEmoji { get; set; }
    public string? CoverColor { get; set; }
    public Guid? TeacherId { get; set; }
    public LessonStatus Status { get; set; } = LessonStatus.Draft;

    public User? Teacher { get; set; }
    public ICollection<Lesson> Lessons { get; set; } = [];
}
