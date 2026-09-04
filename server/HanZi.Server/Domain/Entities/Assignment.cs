using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class Assignment : FullAuditedEntity
{
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public Guid ClassId { get; set; }
    public Guid LessonId { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? PublishAt { get; set; }
    public int DurationMin { get; set; } = 15;
    public int MaxAttempts { get; set; } = 1;
    public LatePolicy LatePolicy { get; set; } = LatePolicy.Penalty;
    public bool ShowAnswer { get; set; } = true;
    public bool Shuffle { get; set; }
    public Guid? CreatedBy { get; set; }

    /// <summary>Học viên bị loại khỏi việc nhận bài tập — chuỗi Guid ngăn cách bởi dấu phẩy, rỗng = cả lớp.</summary>
    public string? ExcludedStudentIds { get; set; }

    public ClassRoom Class { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
    public ICollection<Question> Questions { get; set; } = [];
    public ICollection<Submission> Submissions { get; set; } = [];
}
