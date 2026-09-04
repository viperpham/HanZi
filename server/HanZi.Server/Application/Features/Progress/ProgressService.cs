using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;

namespace HanZi.Server.Application.Features.Progress;

using HanZi.Server.Application.Features.Progress.Dtos;

public interface IProgressService
{
    Task<Result<IReadOnlyList<ProgressDto>>> GetMyAsync(Guid studentId, CancellationToken ct = default);
    Task<Result<ProgressDto>> UpsertAsync(Guid studentId, ProgressUpsertRequest req, CancellationToken ct = default);
}

public class ProgressService(IRepository<global::HanZi.Server.Domain.Entities.Progress> repo, IUnitOfWork uow) : IProgressService
{
    public async Task<Result<IReadOnlyList<ProgressDto>>> GetMyAsync(Guid studentId, CancellationToken ct = default)
    {
        var list = await repo.ListAsync(
            new Specification<global::HanZi.Server.Domain.Entities.Progress>().Where(p => p.StudentId == studentId), ct);
        return Result<IReadOnlyList<ProgressDto>>.Ok(list
            .Select(p => new ProgressDto(p.LessonId, p.CurrentPart, p.UpdatedAt)).ToList());
    }

    public async Task<Result<ProgressDto>> UpsertAsync(Guid studentId, ProgressUpsertRequest req, CancellationToken ct = default)
    {
        var part = Math.Clamp(req.CurrentPart, 1, 5);
        var p = await repo.FirstOrDefaultAsync(
            new Specification<global::HanZi.Server.Domain.Entities.Progress>()
                .Where(x => x.StudentId == studentId && x.LessonId == req.LessonId)
                .Track(), ct);

        if (p is null)
        {
            p = new global::HanZi.Server.Domain.Entities.Progress { StudentId = studentId, LessonId = req.LessonId, CurrentPart = part, FlippedCount = req.FlippedCount };
            await repo.AddAsync(p, ct);
        }
        else
        {
            // tiến độ chỉ tiến, không lùi
            p.CurrentPart = Math.Max(p.CurrentPart, part);
            p.FlippedCount = req.FlippedCount;
            p.UpdatedAt = DateTime.UtcNow;
            repo.Update(p);
        }

        await uow.SaveChangesAsync(ct);
        return Result<ProgressDto>.Ok(new ProgressDto(p.LessonId, p.CurrentPart, p.UpdatedAt));
    }
}
