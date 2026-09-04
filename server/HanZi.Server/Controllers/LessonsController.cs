using HanZi.Server.Application.Features.Lessons;
using HanZi.Server.Application.Features.Lessons.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/lessons")]
[Authorize]
public class LessonsController(ILessonService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListByCurriculum([FromQuery] Guid curriculumId, CancellationToken ct)
        => (await service.ListByCurriculumAsync(curriculumId, ct)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetFull(Guid id, CancellationToken ct)
        => (await service.GetFullAsync(id, ct)).ToActionResult();

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Create(LessonUpsertRequest req, CancellationToken ct)
        => (await service.CreateAsync(req, ct)).ToActionResult();

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Update(Guid id, LessonUpsertRequest req, CancellationToken ct)
        => (await service.UpdateAsync(id, req, ct)).ToActionResult();

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await service.DeleteAsync(id, ct)).ToActionResult();

    /// <summary>Sinh/bù file âm thanh cho các từ, ví dụ, hội thoại chưa có audio.</summary>
    [HttpPost("{id:guid}/audio")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> GenerateAudio(Guid id, CancellationToken ct)
        => (await service.GenerateAudioAsync(id, ct)).ToActionResult();
}
