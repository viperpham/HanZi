namespace HanZi.Server.Application.Features.Notifications.Dtos;

public record NotificationDto(Guid Id, string Body, string? Link, DateTime CreatedAt, bool Read);

public record MarkReadRequest(Guid Id);
