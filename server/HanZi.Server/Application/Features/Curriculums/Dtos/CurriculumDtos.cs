namespace HanZi.Server.Application.Features.Curriculums.Dtos;

public record CurriculumListDto(
    Guid Id, string Code, string NameVi, string NameZh, string Level,
    string? Description, string? CoverEmoji, string? CoverColor,
    Guid? TeacherId, string? TeacherName, string Status, int LessonCount);

public record CurriculumDetailDto(
    Guid Id, string Code, string NameVi, string NameZh, string Level,
    string? Description, string? CoverEmoji, string? CoverColor,
    Guid? TeacherId, string Status,
    IReadOnlyList<LessonBriefDto> Lessons);

public record LessonBriefDto(Guid Id, int OrderNo, string TitleVi, string TitleZh, string Status, int VocabCount);

public record CurriculumUpsertRequest(
    string Code, string NameVi, string NameZh, string Level,
    string? Description, string? CoverEmoji, string? CoverColor,
    Guid? TeacherId, string? Status);
