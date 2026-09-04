using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;
using Mapster;

namespace HanZi.Server.Application.Features.Curriculums;

using HanZi.Server.Application.Features.Curriculums.Dtos;

public interface ICurriculumService
{
    Task<Result<PagedResult<CurriculumListDto>>> ListAsync(string? level, string? status, int page, int pageSize, CancellationToken ct = default);
    Task<Result<CurriculumDetailDto>> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<CurriculumDetailDto>> CreateAsync(CurriculumUpsertRequest req, Guid actorId, CancellationToken ct = default);
    Task<Result<CurriculumDetailDto>> UpdateAsync(Guid id, CurriculumUpsertRequest req, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}

public class CurriculumService(IRepository<Curriculum> repo, IRepository<User> teachersRepo, IUnitOfWork uow) : ICurriculumService
{
    public async Task<Result<PagedResult<CurriculumListDto>>> ListAsync(string? level, string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var spec = new Specification<Curriculum>()
            .Include("Lessons")
            .Order(c => c.CreatedAt);

        if (!string.IsNullOrWhiteSpace(level)) spec.Where(c => c.Level == level);
        if (Enum.TryParse<LessonStatus>(status, true, out var st)) spec.Where(c => c.Status == st);

        var paged = await repo.PagedAsync(spec.Page(page, pageSize), ct);

        // Tên giáo viên phụ trách: 1 truy vấn cho cả trang (tránh N+1)
        var teacherIds = paged.Items.Where(c => c.TeacherId is not null).Select(c => c.TeacherId!.Value).Distinct().ToList();
        var teachers = teacherIds.Count > 0
            ? await teachersRepo.ListAsync(new Specification<User>().Where(u => teacherIds.Contains(u.Id)), ct)
            : [];

        var items = paged.Items.Select(c => new CurriculumListDto(
            c.Id, c.Code, c.NameVi, c.NameZh, c.Level, c.Description,
            c.CoverEmoji, c.CoverColor, c.TeacherId,
            c.TeacherId is null ? null : teachers.FirstOrDefault(t => t.Id == c.TeacherId)?.FullName,
            c.Status.ToString(),
            c.Lessons.Count(l => !l.IsDeleted))).ToList();

        return Result<PagedResult<CurriculumListDto>>.Ok(new PagedResult<CurriculumListDto>
        {
            Items = items, Total = paged.Total, Page = paged.Page, PageSize = paged.PageSize
        });
    }

    public async Task<Result<CurriculumDetailDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var c = await repo.FirstOrDefaultAsync(
            new Specification<Curriculum>().Include("Lessons").Where(x => x.Id == id), ct);
        if (c is null) return Result<CurriculumDetailDto>.Fail("Không tìm thấy giáo trình.", "NOT_FOUND");
        return Result<CurriculumDetailDto>.Ok(ToDetail(c));
    }

    public async Task<Result<CurriculumDetailDto>> CreateAsync(CurriculumUpsertRequest req, Guid actorId, CancellationToken ct = default)
    {
        if (await repo.AnyAsync(new Specification<Curriculum>().Where(x => x.Code == req.Code), ct))
            return Result<CurriculumDetailDto>.Fail($"Mã giáo trình '{req.Code}' đã tồn tại.", "DUPLICATE");

        var status = LessonStatus.Draft;
        if (!string.IsNullOrWhiteSpace(req.Status) && !Enum.TryParse<LessonStatus>(req.Status, true, out status))
            return Result<CurriculumDetailDto>.Fail("Trạng thái không hợp lệ (Draft | Published | Archived).");

        var c = new Curriculum
        {
            Code = req.Code.Trim().ToUpperInvariant(),
            NameVi = req.NameVi,
            NameZh = req.NameZh,
            Level = req.Level,
            Description = req.Description,
            CoverEmoji = req.CoverEmoji ?? "📕",
            CoverColor = req.CoverColor ?? "#dc2626",
            TeacherId = req.TeacherId,
            Status = status
        };
        await repo.AddAsync(c, ct);
        await uow.SaveChangesAsync(ct);
        return Result<CurriculumDetailDto>.Ok(ToDetail(c));
    }

    public async Task<Result<CurriculumDetailDto>> UpdateAsync(Guid id, CurriculumUpsertRequest req, CancellationToken ct = default)
    {
        var c = await repo.GetByIdAsync(id, ct);
        if (c is null) return Result<CurriculumDetailDto>.Fail("Không tìm thấy giáo trình.", "NOT_FOUND");

        c.Code = req.Code.Trim().ToUpperInvariant();
        c.NameVi = req.NameVi;
        c.NameZh = req.NameZh;
        c.Level = req.Level;
        c.Description = req.Description;
        c.CoverEmoji = req.CoverEmoji ?? c.CoverEmoji;
        c.CoverColor = req.CoverColor ?? c.CoverColor;
        if (req.TeacherId is not null) c.TeacherId = req.TeacherId;
        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!Enum.TryParse<LessonStatus>(req.Status, true, out var st))
                return Result<CurriculumDetailDto>.Fail("Trạng thái không hợp lệ (Draft | Published | Archived).");
            c.Status = st;
        }
        repo.Update(c);
        await uow.SaveChangesAsync(ct);
        return Result<CurriculumDetailDto>.Ok(ToDetail(c));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var c = await repo.GetByIdAsync(id, ct);
        if (c is null) return Result.Fail("Không tìm thấy giáo trình.", "NOT_FOUND");
        repo.SoftDelete(c); // interceptor chuyển thành UPDATE is_deleted = true
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    private static CurriculumDetailDto ToDetail(Curriculum c) => new(
        c.Id, c.Code, c.NameVi, c.NameZh, c.Level, c.Description,
        c.CoverEmoji, c.CoverColor, c.TeacherId, c.Status.ToString(),
        c.Lessons.Where(l => !l.IsDeleted).OrderBy(l => l.OrderNo)
            .Select(l => new LessonBriefDto(l.Id, l.OrderNo, l.TitleVi, l.TitleZh, l.Status.ToString(), 0))
            .ToList());
}
