using HanZi.Server.Infrastructure.Data;

namespace HanZi.Server.Infrastructure.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

/// <summary>
/// Unit of Work — 1 điểm commit duy nhất cho 1 request.
/// Mọi service gọi UoW.SaveChangesAsync; nhiều thay đổi (entity + con) commit cùng transaction.
/// </summary>
public class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
