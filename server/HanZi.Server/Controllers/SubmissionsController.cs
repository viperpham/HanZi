using HanZi.Server.Application.Features.Grading;
using HanZi.Server.Application.Features.Grading.Dtos;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/submissions")]
[Authorize]
public class SubmissionsController(ISubmissionService service, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Học viên nộp bài (tự chấm các dạng tự động).</summary>
    [HttpPost("assignments/{assignmentId:guid}/submit")]
    public async Task<IActionResult> Submit(Guid assignmentId, SubmitRequest req, CancellationToken ct)
        => (await service.SubmitAsync(assignmentId, currentUser.UserId!.Value, req, ct)).ToActionResult();

    /// <summary>Lưu nháp định kỳ.</summary>
    [HttpPost("assignments/{assignmentId:guid}/draft")]
    public async Task<IActionResult> Draft(Guid assignmentId, SubmitRequest req, CancellationToken ct)
        => (await service.DraftAsync(assignmentId, currentUser.UserId!.Value, req, ct)).ToActionResult();

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
        => (await service.ListOwnAsync(currentUser.UserId!.Value, ct)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => (await service.GetForStudentAsync(id, currentUser.UserId!.Value, ct)).ToActionResult();

    /// <summary>Học viên trả lời lại ghi chú của giáo viên.</summary>
    [HttpPost("{id:guid}/reply")]
    public async Task<IActionResult> Reply(Guid id, [FromBody] string reply, CancellationToken ct)
        => (await service.ReplyNoteAsync(id, currentUser.UserId!.Value, reply, ct)).ToActionResult();
}

[ApiController]
[Route("api/grading")]
[Authorize(Roles = "Teacher,Admin")]
public class GradingController(IGradingService service) : ControllerBase
{
    [HttpGet("submissions/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => (await service.GetForTeacherAsync(id, ct)).ToActionResult();

    /// <summary>Chấm bài: điểm chấm tay + nhận xét từng câu + ghi chú riêng cho học viên.</summary>
    [HttpPost("submissions/{id:guid}/grade")]
    public async Task<IActionResult> Grade(Guid id, GradeRequest req, CancellationToken ct)
        => (await service.GradeAsync(id, req, ct)).ToActionResult();
}
