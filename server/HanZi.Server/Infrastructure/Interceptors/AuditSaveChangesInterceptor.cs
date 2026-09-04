using System.Security.Claims;
using HanZi.Server.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HanZi.Server.Infrastructure.Interceptors;

// ICurrentUser ở đây để Controllers dùng chung 1 using

public interface ICurrentUser
{
    Guid? UserId { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
}

/// <summary>Đọc danh tính từ JWT claims (HttpContext).</summary>
public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var v = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public UserRole? Role
    {
        get
        {
            var v = Principal?.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(v, out var r) ? r : null;
        }
    }

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
}

/// <summary>
/// Một interceptor gánh 2 việc:
/// 1. AUDIT — tự điền CreatedAt/By, UpdatedAt/By, DeletedAt/By
/// 2. SOFT DELETE — mọi DELETE của entity có ISoftDelete chuyển thành UPDATE is_deleted = true.
///    Không code nào trong hệ thống xoá cứng được dữ liệu audit.
/// </summary>
public class AuditSaveChangesInterceptor(ICurrentUser currentUser) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        if (eventData.Context is not null) Apply(eventData.Context.ChangeTracker);
        return base.SavingChangesAsync(eventData, result, ct);
    }

    private void Apply(Microsoft.EntityFrameworkCore.ChangeTracking.ChangeTracker tracker)
    {
        var now = DateTime.UtcNow;
        var userId = currentUser.UserId;

        foreach (var entry in tracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            switch (entry.State)
            {
                case EntityState.Added when entry.Entity is Domain.Common.AuditableEntity added:
                    added.CreatedAt = now;
                    added.CreatedBy = userId;
                    break;

                case EntityState.Modified when entry.Entity is Domain.Common.AuditableEntity updated:
                    updated.UpdatedAt = now;
                    updated.UpdatedBy = userId;
                    break;

                case EntityState.Deleted when entry.Entity is Domain.Common.ISoftDelete soft:
                    // CHẶN xoá cứng → chuyển thành xoá mềm
                    entry.State = EntityState.Modified;
                    soft.IsDeleted = true;
                    if (entry.Entity is Domain.Common.FullAuditedEntity fa)
                    {
                        fa.DeletedAt = now;
                        fa.DeletedBy = userId;
                    }
                    break;
            }
        }
    }
}
