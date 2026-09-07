using HanZi.Server.Application.Features.Files;
using HanZi.Server.Application.Features.Files.Dtos;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

/// <summary>
/// Thư viện tệp: upload (multipart), list, xoá, gắn vào bài học.
/// File lưu tại wwwroot/uploads/{guid}{ext} — phục vụ tĩnh qua /uploads/...
/// </summary>
[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController(IFileService service) : ControllerBase
{
    private const long MaxUploadBytes = 26 * 1024 * 1024; // 25MB + dư dưỡng cho multipart

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
        => (await service.ListMineAsync(ct)).ToActionResult();

    [HttpGet("lesson/{lessonId:guid}")]
    public async Task<IActionResult> ForLesson(Guid lessonId, CancellationToken ct)
        => (await service.ListForLessonAsync(lessonId, ct)).ToActionResult();

    /// <summary>
    /// Xem/tải file có kiểm quyền (thẻ img dùng ?access_token=...):
    /// chủ sở hữu + Admin luôn được; file gắn bài học thì mọi người đăng nhập; file đính bài nộp thì GV lớp được.
    /// </summary>
    [HttpGet("{id:guid}/raw")]
    public async Task<IActionResult> Raw(Guid id, CancellationToken ct)
    {
        var res = await service.RawAsync(id, ct);
        if (!res.Success)
            return StatusCode(res.ErrorCode == "FORBIDDEN" ? 403 : 404, new { success = false, error = res.Error });
        var (stream, contentType, fileName) = res.Value!;
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{Uri.EscapeDataString(fileName)}\"";
        return File(stream, contentType);
    }

    [HttpPost]
    [RequestSizeLimit(MaxUploadBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, error = "Chưa chọn tệp." });
        if (file.FileName.Contains('/') || file.FileName.Contains('\\') || file.FileName.Contains(".."))
            return BadRequest(new { success = false, error = "Tên tệp không hợp lệ." });

        var res = await service.UploadAsync(file.OpenReadStream(), file.FileName, file.ContentType, file.Length, ct);
        return res.ToActionResult();
    }

    public record AttachLessonRequest(Guid LessonId, IReadOnlyList<Guid> FileIds);

    [HttpPost("attach-lesson")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> AttachLesson(AttachLessonRequest req, CancellationToken ct)
        => (await service.AttachToLessonAsync(req.LessonId, req.FileIds, ct)).ToActionResult();

    public record DetachRequest(Guid Id);

    [HttpPost("detach-lesson")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DetachLesson(DetachRequest req, CancellationToken ct)
        => (await service.DetachFromLessonAsync(req.Id, ct)).ToActionResult();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await service.DeleteAsync(id, ct)).ToActionResult();
}
