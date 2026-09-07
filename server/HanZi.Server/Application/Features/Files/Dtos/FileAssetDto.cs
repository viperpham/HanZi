namespace HanZi.Server.Application.Features.Files.Dtos;

public record FileAssetDto(
    Guid Id, string FileName, string StoredName, string Url,
    string Kind, long SizeBytes, string? ContentType, DateTime CreatedAt);
