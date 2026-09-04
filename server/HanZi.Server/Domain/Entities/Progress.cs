using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>Tiến độ học bài của học viên — 1 bản ghi / học viên / bài học.</summary>
public class Progress : FullAuditedEntity
{
    public Guid StudentId { get; set; }
    public Guid LessonId { get; set; }

    /// <summary>Phần đang học (1..5). Lớn nhất = đã học hết.</summary>
    public int CurrentPart { get; set; } = 1;
    public int FlippedCount { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Student { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
