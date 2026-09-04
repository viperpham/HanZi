using HanZi.Server.Application.Features.Assignments;
using HanZi.Server.Application.Features.Assignments.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController(IAssignmentService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListByClass([FromQuery] Guid classId, CancellationToken ct)
        => (await service.ListByClassAsync(classId, ct)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => (await service.GetByIdAsync(id, ct)).ToActionResult();

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Create(AssignmentCreateRequest req, CancellationToken ct)
    {
        // CreatedBy lấy từ token — controller đọc claims
        var uidClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        _ = Guid.TryParse(uidClaim, out var actorId);
        return (await service.CreateAsync(req, actorId, ct)).ToActionResult();
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Update(Guid id, AssignmentCreateRequest req, CancellationToken ct)
        => (await service.UpdateAsync(id, req, ct)).ToActionResult();

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await service.DeleteAsync(id, ct)).ToActionResult();

    [HttpGet("{id:guid}/submissions")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> ListSubmissions(Guid id, CancellationToken ct)
        => (await service.ListSubmissionsAsync(id, ct)).ToActionResult();
}
