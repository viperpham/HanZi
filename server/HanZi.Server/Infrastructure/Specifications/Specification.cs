using System.Linq.Expressions;
using HanZi.Server.Domain.Common;

namespace HanZi.Server.Infrastructure.Specifications;

/// <summary>
/// Specification pattern — đóng gói query (Where/Include/Order/Paging) thành đối tượng,
/// tái sử dụng và áp đúng 1 chỗ. Chống N+1: mọi Include được khai báo tường minh ở đây.
/// </summary>
public class Specification<T> where T : FullAuditedEntity
{
    public List<Expression<Func<T, bool>>> Criteria { get; } = [];
    public List<string> IncludeStrings { get; } = [];
    public Expression<Func<T, object>>? OrderBy { get; private set; }
    public Expression<Func<T, object>>? OrderByDesc { get; private set; }
    public int? Take { get; private set; }
    public int? Skip { get; private set; }
    public bool AsSplitQuery { get; private set; }
    public bool AsNoTracking { get; private set; } = true;

    /// <summary>Bỏ global filter IsDeleted — dùng khi cần đọc dữ liệu lịch sử (bài nộp trỏ tới câu hỏi cũ đã thay thế).</summary>
    public bool IncludeDeleted { get; private set; }

    public Specification() { }

    public Specification<T> IgnoreFilters()
    {
        IncludeDeleted = true;
        return this;
    }

    public Specification<T> Where(Expression<Func<T, bool>> criteria)
    {
        Criteria.Add(criteria);
        return this;
    }

    /// <summary>Include bằng chuỗi property ("GrammarPoints.Drills") — single query hoặc split query.</summary>
    public Specification<T> Include(string path)
    {
        IncludeStrings.Add(path);
        return this;
    }

    public Specification<T> Order(Expression<Func<T, object>> key)
    {
        OrderBy = key;
        return this;
    }

    public Specification<T> OrderDesc(Expression<Func<T, object>> key)
    {
        OrderByDesc = key;
        return this;
    }

    public Specification<T> Page(int page, int pageSize)
    {
        Skip = (page - 1) * pageSize;
        Take = pageSize;
        return this;
    }

    public Specification<T> TakeN(int n)
    {
        Take = n;
        return this;
    }

    /// <summary>
    /// Dùng khi Include nhiều collection con (grammar → examples + drills + mistakes)
    /// để tránh cartesian explosion. EF tách thành các SELECT riêng — không N+1 (vẫn cố định số query).
    /// </summary>
    public Specification<T> Split()
    {
        AsSplitQuery = true;
        return this;
    }

    public Specification<T> Track()
    {
        AsNoTracking = false;
        return this;
    }
}
