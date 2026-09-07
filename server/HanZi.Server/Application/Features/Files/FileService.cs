using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Interceptors;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Application.Features.Files;

using HanZi.Server.Application.Features.Files.Dtos;

public interface IFileService
{
    Task<Result<FileAssetDto>> UploadAsync(Stream content, string fileName, string? contentType, long length, CancellationToken ct = default);
    Task<Result<IReadOnlyList<FileAssetDto>>> ListMineAsync(CancellationToken ct = default);
    Task<Result<IReadOnlyList<FileAssetDto>>> ListForLessonAsync(Guid lessonId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<FileAssetDto>>> ListForSubmissionAsync(Guid submissionId, CancellationToken ct = default);
    /// <summary>Gắn file (đã tải, còn sở hữu) vào bài học — giáo viên/quản trị.</summary>
    Task<Result<IReadOnlyList<FileAssetDto>>> AttachToLessonAsync(Guid lessonId, IReadOnlyList<Guid> fileIds, CancellationToken ct = default);
    /// <summary>Gỡ file khỏi bài học (file vẫn nằm trong thư viện của người tải lên).</summary>
    Task<Result> DetachFromLessonAsync(Guid id, CancellationToken ct = default);
    /// <summary>Kiểm quyền xem: chủ sở hữu / Admin / file gắn bài học (mọi người đăng nhập) / file đính bài nộp (chủ + GV lớp + Admin).</summary>
    Task<bool> CanViewAsync(FileAsset asset, CancellationToken ct = default);
    /// <summary>Mở file để stream về client — đã kiểm quyền.</summary>
    Task<Result<(Stream Stream, string ContentType, string FileName)>> RawAsync(Guid id, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}

public class FileService(
    IRepository<FileAsset> repo,
    IRepository<Lesson> lessons,
    IRepository<Submission> submissions,
    IRepository<Assignment> assignments,
    IRepository<ClassRoom> classes,
    IUnitOfWork uow,
    IWebHostEnvironment env,
    ICurrentUser currentUser,
    ILogger<FileService> logger) : IFileService
{
    // Ảnh ≤ 10MB, tài liệu ≤ 25MB
    private static readonly Dictionary<string, (FileKind Kind, long MaxBytes)> _allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = (FileKind.Image, 10 * 1024 * 1024),
        [".jpeg"] = (FileKind.Image, 10 * 1024 * 1024),
        [".jfif"] = (FileKind.Image, 10 * 1024 * 1024),
        [".png"] = (FileKind.Image, 10 * 1024 * 1024),
        [".webp"] = (FileKind.Image, 10 * 1024 * 1024),
        [".gif"] = (FileKind.Image, 10 * 1024 * 1024),
        [".bmp"] = (FileKind.Image, 10 * 1024 * 1024),
        [".pdf"] = (FileKind.Document, 25 * 1024 * 1024),
        [".doc"] = (FileKind.Document, 25 * 1024 * 1024),
        [".docx"] = (FileKind.Document, 25 * 1024 * 1024),
        [".xls"] = (FileKind.Document, 25 * 1024 * 1024),
        [".xlsx"] = (FileKind.Document, 25 * 1024 * 1024),
        [".ppt"] = (FileKind.Document, 25 * 1024 * 1024),
        [".pptx"] = (FileKind.Document, 25 * 1024 * 1024),
        [".txt"] = (FileKind.Document, 25 * 1024 * 1024),
        [".zip"] = (FileKind.Document, 25 * 1024 * 1024),
        [".rar"] = (FileKind.Document, 25 * 1024 * 1024),
    };

    public async Task<Result<FileAssetDto>> UploadAsync(Stream content, string fileName, string? contentType, long length, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(fileName);
        if (!_allowed.TryGetValue(ext, out var rule))
            return Result<FileAssetDto>.Fail("Định dạng tệp không được hỗ trợ (ảnh: jpg/png/webp/gif; tài liệu: pdf/doc/xls/ppt/txt/zip/rar).");

        if (length > rule.MaxBytes)
            return Result<FileAssetDto>.Fail($"Tệp quá lớn — giới hạn {rule.MaxBytes / 1024 / 1024}MB cho {ext.ToUpperInvariant()}.");

        var stored = Directory.CreateDirectory(Path.Combine(env.ContentRootPath, "UploadsData"));
        var storedName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";

        try
        {
            await using var fs = File.Create(Path.Combine(stored.FullName, storedName));
            await content.CopyToAsync(fs, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lưu file upload thất bại: {File}", fileName);
            return Result<FileAssetDto>.Fail("Không lưu được tệp — thử lại sau.");
        }

        var asset = new FileAsset
        {
            FileName = Path.GetFileName(fileName).Trim(),
            StoredName = storedName,
            ContentType = contentType ?? "",
            SizeBytes = length,
            Kind = rule.Kind,
            UploaderId = currentUser.UserId!.Value
        };
        await repo.AddAsync(asset, ct);
        await uow.SaveChangesAsync(ct);

        return Result<FileAssetDto>.Ok(ToDto(asset));
    }

    public async Task<Result<IReadOnlyList<FileAssetDto>>> ListMineAsync(CancellationToken ct = default)
    {
        var list = await repo.ListAsync(
            new Specification<FileAsset>()
                .Where(f => f.UploaderId == currentUser.UserId!.Value)
                .OrderDesc(f => f.CreatedAt)
                .TakeN(100), ct);
        return Result<IReadOnlyList<FileAssetDto>>.Ok(list.Select(ToDto).ToList());
    }

    public async Task<Result<IReadOnlyList<FileAssetDto>>> ListForLessonAsync(Guid lessonId, CancellationToken ct = default)
    {
        var list = await repo.ListAsync(
            new Specification<FileAsset>()
                .Where(f => f.LessonId == lessonId)
                .OrderDesc(f => f.CreatedAt), ct);
        return Result<IReadOnlyList<FileAssetDto>>.Ok(list.Select(ToDto).ToList());
    }

    public async Task<Result<IReadOnlyList<FileAssetDto>>> ListForSubmissionAsync(Guid submissionId, CancellationToken ct = default)
    {
        var list = await repo.ListAsync(
            new Specification<FileAsset>()
                .Where(f => f.SubmissionId == submissionId)
                .OrderDesc(f => f.CreatedAt), ct);
        return Result<IReadOnlyList<FileAssetDto>>.Ok(list.Select(ToDto).ToList());
    }

    public async Task<Result<IReadOnlyList<FileAssetDto>>> AttachToLessonAsync(Guid lessonId, IReadOnlyList<Guid> fileIds, CancellationToken ct = default)
    {
        if (fileIds.Count == 0) return Result<IReadOnlyList<FileAssetDto>>.Fail("Chưa chọn tệp nào.");
        var lesson = await lessons.GetByIdAsync(lessonId, ct);
        if (lesson is null) return Result<IReadOnlyList<FileAssetDto>>.Fail("Không tìm thấy bài học.", "NOT_FOUND");

        var files = await repo.ListAsync(
            new Specification<FileAsset>()
                .Where(f => fileIds.Contains(f.Id)
                    && (f.UploaderId == currentUser.UserId!.Value || currentUser.Role == UserRole.Admin))
                .Track(), ct);
        foreach (var f in files) f.LessonId = lessonId;
        await uow.SaveChangesAsync(ct);

        return Result<IReadOnlyList<FileAssetDto>>.Ok(files.Select(ToDto).ToList());
    }

    public async Task<Result> DetachFromLessonAsync(Guid id, CancellationToken ct = default)
    {
        var asset = await repo.GetByIdAsync(id, ct);
        if (asset is null) return Result.Fail("Không tìm thấy tệp.", "NOT_FOUND");
        asset.LessonId = null;
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<bool> CanViewAsync(FileAsset asset, CancellationToken ct = default)
    {
        var me = currentUser.UserId;
        if (me is null) return false;
        if (currentUser.Role == UserRole.Admin || asset.UploaderId == me.Value) return true;

        // file gắn bài học — mọi người đăng nhập đều xem (tài liệu phục vụ học tập)
        if (asset.LessonId is not null) return true;

        // file đính bài nộp — giáo viên phụ trách lớp được xem bài của học viên
        if (asset.SubmissionId is not null && currentUser.Role == UserRole.Teacher)
        {
            var sub = await submissions.FirstOrDefaultAsync(
                new Specification<Submission>().Where(s => s.Id == asset.SubmissionId), ct);
            if (sub is null) return false;
            var a = await assignments.GetByIdAsync(sub.AssignmentId, ct);
            if (a is null) return false;
            var cls = await classes.GetByIdAsync(a.ClassId, ct);
            return cls is not null && cls.TeacherId == me.Value;
        }

        return false;
    }

    public async Task<Result<(Stream Stream, string ContentType, string FileName)>> RawAsync(Guid id, CancellationToken ct = default)
    {
        var asset = await repo.GetByIdAsync(id, ct);
        if (asset is null) return Result<(Stream, string, string)>.Fail("Không tìm thấy tệp.", "NOT_FOUND");

        if (!await CanViewAsync(asset, ct))
            return Result<(Stream, string, string)>.Fail("Bạn không có quyền xem tệp này.", "FORBIDDEN");

        var path = Path.Combine(env.ContentRootPath, "UploadsData", asset.StoredName);
        if (!File.Exists(path))
            return Result<(Stream, string, string)>.Fail("Tệp không còn trên máy chủ.", "NOT_FOUND");

        var stream = File.OpenRead(path);
        var contentType = string.IsNullOrWhiteSpace(asset.ContentType) || asset.ContentType == "application/octet-stream"
            ? GuessContentType(Path.GetExtension(asset.StoredName))
            : asset.ContentType;
        return Result<(Stream, string, string)>.Ok((stream, contentType, asset.FileName));
    }

    private static string GuessContentType(string ext) => ext.ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" or ".jfif" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".gif" => "image/gif",
        ".bmp" => "image/bmp",
        ".pdf" => "application/pdf",
        ".txt" => "text/plain; charset=utf-8",
        ".zip" => "application/zip",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls" => "application/vnd.ms-excel",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt" => "application/vnd.ms-powerpoint",
        ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        _ => "application/octet-stream"
    };

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var asset = await repo.GetByIdAsync(id, ct);
        if (asset is null) return Result.Fail("Không tìm thấy tệp.", "NOT_FOUND");

        // chỉ chủ sở hữu hoặc Admin được xoá
        if (asset.UploaderId != currentUser.UserId!.Value && currentUser.Role != UserRole.Admin)
            return Result.Fail("Bạn không có quyền xoá tệp này.", "FORBIDDEN");

        repo.SoftDelete(asset);
        await uow.SaveChangesAsync(ct);

        // xoá file vật lý (best effort)
        try { File.Delete(Path.Combine(env.ContentRootPath, "UploadsData", asset.StoredName)); }
        catch (Exception ex) { logger.LogWarning(ex, "Xoá file vật lý lỗi: {Stored}", asset.StoredName); }

        return Result.Ok();
    }

    public static FileAssetDto ToDto(FileAsset f) => new(
        f.Id, f.FileName, f.StoredName, $"/api/files/{f.Id}/raw",
        f.Kind.ToString(), f.SizeBytes, f.ContentType, f.CreatedAt);
}
