using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class Submission : FullAuditedEntity
{
    public Guid AssignmentId { get; set; }
    public Guid StudentId { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Doing;
    public DateTime? DraftSavedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? GradedAt { get; set; }
    public decimal AutoScore { get; set; }
    public decimal ManualScore { get; set; }
    public decimal FinalScore { get; set; }

    public Assignment Assignment { get; set; } = null!;
    public User Student { get; set; } = null!;
    public ICollection<SubmissionAnswer> Answers { get; set; } = [];
    public GradingNote? GradingNote { get; set; }
}
