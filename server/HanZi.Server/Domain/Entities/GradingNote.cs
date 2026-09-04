using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>Ghi chú riêng của giáo viên — 1-1 với bài nộp, chỉ học viên đó nhìn thấy.</summary>
public class GradingNote : FullAuditedEntity
{
    public Guid SubmissionId { get; set; }
    public string[] WeakTags { get; set; } = [];
    public string? Comment { get; set; }
    public string[] Todos { get; set; } = [];
    public DateTime? SentAt { get; set; }

    /// <summary>Học viên trả lời lại giáo viên.</summary>
    public string? Reply { get; set; }
    public DateTime? RepliedAt { get; set; }

    public Submission Submission { get; set; } = null!;
}
