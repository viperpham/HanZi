namespace HanZi.Server.Application.Features.Dashboard.Dtos;

public record ContinueLearningDto(Guid LessonId, string TitleZh, string TitleVi, int CurrentPart);

public record UpcomingAssignmentDto(
    Guid AssignmentId, string Title, Guid ClassId, string ClassName, DateTime DueAt);

public record StudentClassDto(
    Guid Id, string Name, string TeacherName, string? Schedule, string? Room,
    string CurriculumName, int LessonCount, int LessonsStudied, int ProgressPercent);

public record StudentHomeDto(
    int AssignmentsPending, int LessonsStudied, decimal AvgScore, int StreakDays,
    ContinueLearningDto? Continue, IReadOnlyList<UpcomingAssignmentDto> Upcoming,
    IReadOnlyList<StudentClassDto> Classes);

public record TeacherPendingDto(Guid SubmissionId, Guid AssignmentId, string AssignmentTitle, string StudentName, DateTime SubmittedAt);

public record DailySubmitDto(string Date, int Count);

public record TeacherHomeDto(
    int PendingGrading, int ClassesCount, int CurriculumsCount, decimal OnTimeRate,
    IReadOnlyList<TeacherPendingDto> PendingList, IReadOnlyList<DailySubmitDto> Last7Days);

public record AdminActivityDto(Guid Id, string? ActorName, string Action, string? Entity, DateTime CreatedAt);

public record AdminHomeDto(
    int Students, int Teachers, int Admins, int Locked,
    int Curriculums, int Classes, int PendingGrading,
    IReadOnlyList<AdminActivityDto> Activities);
