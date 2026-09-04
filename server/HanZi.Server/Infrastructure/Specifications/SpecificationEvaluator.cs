using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Infrastructure.Specifications;

public static class SpecificationEvaluator
{
    public static IQueryable<T> Apply<T>(IQueryable<T> query, Specification<T> spec) where T : FullAuditedEntity
    {
        foreach (var c in spec.Criteria) query = query.Where(c);

        if (spec.IncludeDeleted) query = query.IgnoreQueryFilters();

        query = spec.AsNoTracking ? query.AsNoTracking() : query.AsTracking();

        foreach (var inc in spec.IncludeStrings) query = query.Include(inc);

        if (spec.OrderBy is not null) query = query.OrderBy(spec.OrderBy);
        else if (spec.OrderByDesc is not null) query = query.OrderByDescending(spec.OrderByDesc);

        if (spec.AsSplitQuery) query = query.AsSplitQuery();
        if (spec.Skip is > 0) query = query.Skip(spec.Skip.Value);
        if (spec.Take is > 0) query = query.Take(spec.Take.Value);

        return query;
    }
}
