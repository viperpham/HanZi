using HanZi.Server.Domain.Common;

namespace HanZi.Server.Domain.Entities;

public enum FileKind
{
    Image = 0,
    Document = 1,
    Audio = 2,
    Other = 3
}

/// <summary>
/// Tệp người dùng tải lên (ảnh / tài liệu). Nội dung nằm ở wwwroot/uploads/{StoredName},
/// metadata trong DB. File có thể đính vào Bài nộp hoặc Bài học (nullable — file rảnh = thư viện riêng).
/// </summary>
public class FileAsset : FullAuditedEntity
{
    public string FileName { get; set; } = "";     // tên gốc hiển thị
    public string StoredName { get; set; } = "";   // tên trên đĩa {guid}{ext}
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public FileKind Kind { get; set; } = FileKind.Other;

    public Guid UploaderId { get; set; }

    public Guid? LessonId { get; set; }
    public Guid? SubmissionId { get; set; }

    public User Uploader { get; set; } = null!;
}
