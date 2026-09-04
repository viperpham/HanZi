using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>
/// Câu trả lời của học viên cho 1 câu hỏi — tách bảng riêng thay JSONB,
/// chấm điểm server-side bằng truy vấn quan hệ chuẩn.
/// </summary>
public class SubmissionAnswer : FullAuditedEntity
{
    public Guid SubmissionId { get; set; }
    public Guid QuestionId { get; set; }

    /// <summary>Nội dung trả lời (text dùng chung mọi dạng: index option, thứ tự, cặp nối, đoạn viết…)</summary>
    public string? AnswerText { get; set; }

    /// <summary>Điểm tự động của câu này (null = chưa chấm / chấm tay).</summary>
    public decimal? AutoScore { get; set; }

    /// <summary>Nhận xét riêng của giáo viên cho câu này.</summary>
    public string? TeacherComment { get; set; }

    public Submission Submission { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
