using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public class GrammarPoint : FullAuditedEntity
{
    public Guid LessonId { get; set; }
    public int OrderNo { get; set; }
    public string Title { get; set; } = "";
    public string? Formula { get; set; }
    public string? Explanation { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public ICollection<GrammarExample> Examples { get; set; } = [];
    public ICollection<CommonMistake> Mistakes { get; set; } = [];
    public ICollection<Drill> Drills { get; set; } = [];
}
