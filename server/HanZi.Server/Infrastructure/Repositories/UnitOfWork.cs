using HanZi.Server.Domain.Entities;
using HanZi.Server.Infrastructure.Data;
using HanZi.Server.Infrastructure.Push;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Infrastructure.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

/// <summary>
/// Unit of Work — 1 điểm commit duy nhất cho 1 request.
/// Mọi service gọi UoW.SaveChangesAsync; nhiều thay đổi (entity + con) commit cùng transaction.
/// Các Notification vừa thêm (bắt TRƯỚC khi save) được đẩy Web Push sau khi commit.
/// </summary>
public class UnitOfWork(AppDbContext db, PushDispatcher? push) : IUnitOfWork
{
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // Bắt notification mới TRƯỚC khi save (state Added sẽ biến mất sau khi commit)
        var newNotis = db.ChangeTracker.Entries<Notification>()
            .Where(e => e.State == EntityState.Added)
            .Select(e => e.Entity)
            .ToList();

        var count = await db.SaveChangesAsync(ct);

        if (push is not null && newNotis.Count > 0)
        {
            try { await push.DispatchNewNotificationsAsync(newNotis, ct); }
            catch (Exception ex) { Serilog.Log.Error(ex, "Web Push dispatch lỗi (đã nuốt, không ảnh hưởng request)"); }
        }
        return count;
    }
}
