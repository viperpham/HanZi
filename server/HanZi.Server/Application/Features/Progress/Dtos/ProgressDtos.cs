namespace HanZi.Server.Application.Features.Progress.Dtos;

public record ProgressDto(Guid LessonId, int CurrentPart, DateTime UpdatedAt);

public record ProgressUpsertRequest(Guid LessonId, int CurrentPart, int FlippedCount);
