using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>Lựa chọn của câu trắc nghiệm — thay cho JSONB.</summary>
public class QuestionOption : FullAuditedEntity
{
    public Guid QuestionId { get; set; }
    public int OrderNo { get; set; }
    public string Text { get; set; } = "";

    public Question Question { get; set; } = null!;
}
