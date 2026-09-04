using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class Lesson : FullAuditedEntity
{
    public Guid CurriculumId { get; set; }
    public int OrderNo { get; set; }
    public string TitleVi { get; set; } = "";
    public string TitleZh { get; set; } = "";
    public string? Description { get; set; }
    public LessonStatus Status { get; set; } = LessonStatus.Draft;

    public Curriculum Curriculum { get; set; } = null!;
    public ICollection<Vocabulary> Vocabularies { get; set; } = [];
    public ICollection<GrammarPoint> GrammarPoints { get; set; } = [];
    public ICollection<DialogueLine> DialogueLines { get; set; } = [];
}
