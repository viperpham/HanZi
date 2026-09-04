using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Enums;

namespace HanZi.Server.Domain.Entities;

public class Question : FullAuditedEntity
{
    public Guid AssignmentId { get; set; }
    public int OrderNo { get; set; }
    public QuestionType Type { get; set; } = QuestionType.MultipleChoice;
    public string Prompt { get; set; } = "";
    public decimal Points { get; set; } = 1;

    /// <summary>Đáp án cho dạng tự chấm: index option / text / thứ tự "3-1-0-2" / cặp nối "0-0,1-1".</summary>
    public string? Answer { get; set; }
    public string? SampleAnswer { get; set; }

    /// <summary>Mảng kiến thức gắn với câu hỏi (VD: Từ vựng, Ngữ pháp Bài 1) — dùng thống kê điểm theo mảng.</summary>
    public string? KnowledgeTag { get; set; }

    public Assignment Assignment { get; set; } = null!;
    public ICollection<QuestionOption> Options { get; set; } = [];
}
