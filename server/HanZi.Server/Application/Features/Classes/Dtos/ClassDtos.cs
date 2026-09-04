namespace HanZi.Server.Application.Features.Classes.Dtos;

public record ClassListDto(
    Guid Id, string Code, string Name, Guid CurriculumId, string? CurriculumName,
    Guid TeacherId, string? TeacherName, string? Schedule, string? Room,
    string Status, int StudentCount);

public record ClassDetailDto(
    Guid Id, string Code, string Name, Guid CurriculumId, string CurriculumName,
    Guid TeacherId, string TeacherName, string? Schedule, string? Room, string Status,
    IReadOnlyList<StudentDto> Students,
    IReadOnlyList<AssignmentBriefDto> Assignments);

public record StudentDto(Guid Id, string FullName, string Email, DateTime JoinedAt, bool Locked, string Status);

public record AssignmentBriefDto(Guid Id, string Title, DateTime DueAt, int SubmittedCount);

public record ClassCreateRequest(string Name, Guid CurriculumId, string? Schedule, string? Room);

public record JoinRequest(string Code);

public record AttendanceMarkDto(Guid StudentId, string Status);

public record AttendanceDayDto(Guid StudentId, string FullName, string? Status);

public record AttendanceSaveRequest(DateTime Date, IReadOnlyList<AttendanceMarkDto> Marks);

public record AttendanceMineDto(DateTime Date, string Status);

public record AttendanceSummaryDto(Guid StudentId, string FullName, int Present, int Late, int Absent);
