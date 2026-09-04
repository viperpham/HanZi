using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using HanZi.Server.Infrastructure.Data;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Infrastructure.Repositories;

public interface IRepository<T> where T : FullAuditedEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Specification<T> spec, CancellationToken ct = default);
    Task<IReadOnlyList<T>> ListAsync(Specification<T> spec, CancellationToken ct = default);
    Task<PagedResult<T>> PagedAsync(Specification<T> spec, CancellationToken ct = default);
    Task<int> CountAsync(Specification<T> spec, CancellationToken ct = default);
    Task<bool> AnyAsync(Specification<T> spec, CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default);
    void Update(T entity);
    /// <summary>Xoá mềm — interceptor sẽ chuyển thành UPDATE is_deleted = true.</summary>
    void SoftDelete(T entity);
    void SoftDeleteRange(IEnumerable<T> entities);
}

public class EfRepository<T>(AppDbContext db) : IRepository<T> where T : FullAuditedEntity
{
    protected readonly DbSet<T> Set = db.Set<T>();

    public Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Set.FirstOrDefaultAsync(e => e.Id == id, ct);

    public Task<T?> FirstOrDefaultAsync(Specification<T> spec, CancellationToken ct = default) =>
        SpecificationEvaluator.Apply(Set.AsQueryable(), spec).FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<T>> ListAsync(Specification<T> spec, CancellationToken ct = default) =>
        await SpecificationEvaluator.Apply(Set.AsQueryable(), spec).ToListAsync(ct);

    public async Task<PagedResult<T>> PagedAsync(Specification<T> spec, CancellationToken ct = default)
    {
        var total = await CountAsync(spec, ct);
        var items = await ListAsync(spec, ct);
        return new PagedResult<T> { Items = items, Total = total, Page = (spec.Skip!.Value / spec.Take.Value) + 1, PageSize = spec.Take.Value };
    }

    public Task<int> CountAsync(Specification<T> spec, CancellationToken ct = default)
    {
        var query = Set.AsQueryable();
        foreach (var c in spec.Criteria) query = query.Where(c);
        return query.CountAsync(ct);
    }

    public Task<bool> AnyAsync(Specification<T> spec, CancellationToken ct = default)
    {
        var query = Set.AsQueryable();
        foreach (var c in spec.Criteria) query = query.Where(c);
        return query.AnyAsync(ct);
    }

    public async Task AddAsync(T entity, CancellationToken ct = default) => await Set.AddAsync(entity, ct);
    public async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default) => await Set.AddRangeAsync(entities, ct);
    public void Update(T entity) => Set.Update(entity);
    public void SoftDelete(T entity) => Set.Remove(entity); // interceptor chuyển thành UPDATE is_deleted
    public void SoftDeleteRange(IEnumerable<T> entities) => Set.RemoveRange(entities);
}
