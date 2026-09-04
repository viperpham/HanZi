using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Application.Features.Notifications;

using HanZi.Server.Application.Features.Notifications.Dtos;

public interface INotificationService
{
    Task<Result<IReadOnlyList<NotificationDto>>> ListMineAsync(Guid userId, CancellationToken ct = default);
    Task<Result> MarkReadAsync(Guid userId, Guid id, CancellationToken ct = default);
    /// <summary>Đánh dấu toàn bộ thông báo của người dùng là đã đọc.</summary>
    Task<Result> MarkAllReadAsync(Guid userId, CancellationToken ct = default);
}

public class NotificationService(IRepository<Notification> repo, IUnitOfWork uow) : INotificationService
{
    public async Task<Result<IReadOnlyList<NotificationDto>>> ListMineAsync(Guid userId, CancellationToken ct = default)
    {
        var list = await repo.ListAsync(
            new Specification<Notification>()
                .Where(n => n.UserId == userId)
                .OrderDesc(n => n.CreatedAt)
                .TakeN(50), ct);

        return Result<IReadOnlyList<NotificationDto>>.Ok(list
            .Select(n => new NotificationDto(n.Id, n.Body, n.Link, n.CreatedAt, n.ReadAt is not null))
            .ToList());
    }

    public async Task<Result> MarkReadAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var n = await repo.FirstOrDefaultAsync(
            new Specification<Notification>().Where(x => x.Id == id && x.UserId == userId), ct);
        if (n is null) return Result.Fail("Không tìm thấy thông báo.", "NOT_FOUND");
        n.ReadAt = DateTime.UtcNow;
        repo.Update(n);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result> MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        var unread = await repo.ListAsync(
            new Specification<Notification>()
                .Where(x => x.UserId == userId && x.ReadAt == null)
                .Track(), ct);
        foreach (var n in unread)
        {
            n.ReadAt = DateTime.UtcNow;
            repo.Update(n);
        }
        if (unread.Count > 0) await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
