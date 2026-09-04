using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

/// <summary>Bảng so sánh "sai thường gặp / đúng" cho lỗi người Việt hay mắc.</summary>
public class CommonMistake : FullAuditedEntity
{
    public Guid GrammarPointId { get; set; }
    public string WrongText { get; set; } = "";
    public string RightText { get; set; } = "";
    public string? Note { get; set; }

    public GrammarPoint GrammarPoint { get; set; } = null!;
}
