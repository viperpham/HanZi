using HanZi.Server.Application.Features.Classes;
using HanZi.Server.Application.Features.Classes.Dtos;
using HanZi.Server.Infrastructure.Auth;
using HanZi.Server.Infrastructure.Interceptors;
using HanZi.Server.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

[ApiController]
[Route("api/classes")]
[Authorize]
public class ClassesController(IClassService service, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? teacherId, [FromQuery] Guid? studentId, CancellationToken ct)
    {
        // học viên chỉ được xem lớp của mình; giáo viên/quản trị xem theo teacherId truyền vào
        var filterTeacher = currentUser.Role == UserRole.Student ? null : teacherId;
        var filterStudent = currentUser.Role == UserRole.Student ? currentUser.UserId : studentId;
        return (await service.ListAsync(filterTeacher, filterStudent, ct)).ToActionResult();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => (await service.GetByIdAsync(id, ct)).ToActionResult();

    [HttpPost]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Create(ClassCreateRequest req, CancellationToken ct)
        => (await service.CreateAsync(req, currentUser.UserId ?? Guid.Empty, ct)).ToActionResult();

    [HttpPost("{id:guid}/students")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Enroll(Guid id, [FromBody] Guid[] studentIds, CancellationToken ct)
        => (await service.EnrollAsync(id, studentIds, ct)).ToActionResult();

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await service.DeleteAsync(id, ct)).ToActionResult();

    [HttpDelete("{id:guid}/students/{studentId:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> RemoveStudent(Guid id, Guid studentId, CancellationToken ct)
        => (await service.RemoveStudentAsync(id, studentId, ct)).ToActionResult();

    /// <summary>Học viên tự tham gia lớp bằng mã lớp — chờ giáo viên duyệt.</summary>
    [HttpPost("join")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> Join(JoinRequest req, CancellationToken ct)
        => (await service.JoinAsync(currentUser.UserId!.Value, req.Code, ct)).ToActionResult();

    [HttpPost("{id:guid}/students/{studentId:guid}/approve")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> ApproveEnrollment(Guid id, Guid studentId, [FromBody] bool approve, CancellationToken ct)
        => (await service.ApproveEnrollmentAsync(id, studentId, approve, ct)).ToActionResult();

    [HttpGet("{id:guid}/attendance")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> GetAttendance(Guid id, [FromQuery] DateTime date, CancellationToken ct)
        => (await service.GetAttendanceAsync(id, date, ct)).ToActionResult();

    [HttpPost("{id:guid}/attendance")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> SaveAttendance(Guid id, AttendanceSaveRequest req, CancellationToken ct)
        => (await service.SaveAttendanceAsync(id, req.Date, req.Marks, currentUser.UserId ?? Guid.Empty, ct)).ToActionResult();

    /// <summary>Lịch điểm danh của chính học viên trong lớp.</summary>
    [HttpGet("{id:guid}/attendance/mine")]
    [Authorize]
    public async Task<IActionResult> MyAttendance(Guid id, CancellationToken ct)
        => (await service.MyAttendanceAsync(id, currentUser.UserId!.Value, ct)).ToActionResult();

    /// <summary>Thống kê điểm danh cả lớp theo học viên.</summary>
    [HttpGet("{id:guid}/attendance/summary")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> AttendanceSummary(Guid id, CancellationToken ct)
        => (await service.GetAttendanceSummaryAsync(id, ct)).ToActionResult();
}
