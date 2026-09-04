using HanZi.Server.Domain.Common;
using HanZi.Server.Domain.Entities;
using HanZi.Server.Domain.Enums;
using HanZi.Server.Infrastructure.Repositories;
using HanZi.Server.Infrastructure.Specifications;
using HanZi.Server.Infrastructure.Tts;
using Microsoft.EntityFrameworkCore;

namespace HanZi.Server.Application.Features.Lessons;

using HanZi.Server.Application.Features.Lessons.Dtos;
using HanZi.Server.Application.Features.Curriculums.Dtos;

public interface ILessonService
{
    Task<Result<IReadOnlyList<LessonBriefDto>>> ListByCurriculumAsync(Guid curriculumId, CancellationToken ct = default);
    Task<Result<LessonFullDto>> GetFullAsync(Guid id, CancellationToken ct = default);
    Task<Result<LessonFullDto>> CreateAsync(LessonUpsertRequest req, CancellationToken ct = default);
    Task<Result<LessonFullDto>> UpdateAsync(Guid id, LessonUpsertRequest req, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
    /// <summary>Sinh/bù file âm thanh cho toàn bộ từ, ví dụ, hội thoại còn thiếu của bài học.</summary>
    Task<Result<int>> GenerateAudioAsync(Guid id, CancellationToken ct = default);
    /// <summary>Đổi thứ tự bài học — hoán đổi OrderNo với bài khác trong cùng giáo trình.</summary>
    Task<Result> ReorderAsync(Guid id, int direction, CancellationToken ct = default);
}

public class LessonService(
    IRepository<Lesson> lessons,
    IRepository<Vocabulary> vocabRepo,
    IRepository<GrammarPoint> grammarRepo,
    IRepository<GrammarExample> exampleRepo,
    IRepository<CommonMistake> mistakeRepo,
    IRepository<Drill> drillRepo,
    IRepository<DrillOption> drillOptionRepo,
    IRepository<DialogueLine> dialogueRepo,
    IRepository<SentencePuzzle> puzzleRepo,
    IAudioService audio,
    IUnitOfWork uow) : ILessonService
{
    // ===== Đọc: 1 query chính + 4 query con cố định (split query) — KHÔNG N+1 =====
    public async Task<Result<IReadOnlyList<LessonBriefDto>>> ListByCurriculumAsync(Guid curriculumId, CancellationToken ct = default)
    {
        var list = await lessons.ListAsync(
            new Specification<Lesson>()
                .Where(l => l.CurriculumId == curriculumId)
                .Include("Vocabularies")
                .Order(l => l.OrderNo), ct);

        return Result<IReadOnlyList<LessonBriefDto>>.Ok(list.Select(l => new LessonBriefDto(
            l.Id, l.OrderNo, l.TitleVi, l.TitleZh, l.Status.ToString(),
            l.Vocabularies.Count(v => !v.IsDeleted))).ToList());
    }

    public async Task<Result<LessonFullDto>> GetFullAsync(Guid id, CancellationToken ct = default)
    {
        var lesson = await lessons.ListAsync(
            new Specification<Lesson>().Where(l => l.Id == id).Track(), ct) is { Count: > 0 } l ? l[0] : null;

        if (lesson is null) return Result<LessonFullDto>.Fail("Không tìm thấy bài học.", "NOT_FOUND");

        // 4 truy vấn con cố định — số query KHÔNG phụ thuộc số ngữ pháp/từ
        var vocab = await vocabRepo.ListAsync(new Specification<Vocabulary>().Where(v => v.LessonId == id).Order(v => v.OrderNo), ct);
        var gps = await grammarRepo.ListAsync(new Specification<GrammarPoint>().Where(g => g.LessonId == id).Order(g => g.OrderNo), ct);
        var gpIds = gps.Select(g => g.Id).ToList();
        var examples = gpIds.Count > 0
            ? await exampleRepo.ListAsync(new Specification<GrammarExample>().Where(e => gpIds.Contains(e.GrammarPointId)).Order(e => e.OrderNo), ct)
            : [];
        var mistakes = gpIds.Count > 0
            ? await mistakeRepo.ListAsync(new Specification<CommonMistake>().Where(m => gpIds.Contains(m.GrammarPointId)), ct)
            : [];
        var drills = gpIds.Count > 0
            ? await drillRepo.ListAsync(new Specification<Drill>().Where(d => gpIds.Contains(d.GrammarPointId)).Order(d => d.OrderNo), ct)
            : [];
        var drillIds = drills.Select(d => d.Id).ToList();
        var drillOpts = drillIds.Count > 0
            ? await drillOptionRepo.ListAsync(new Specification<DrillOption>().Where(o => drillIds.Contains(o.DrillId)).Order(o => o.OrderNo), ct)
            : [];
        var dialogues = await dialogueRepo.ListAsync(new Specification<DialogueLine>().Where(d => d.LessonId == id).Order(d => d.OrderNo), ct);
        var puzzles = await puzzleRepo.ListAsync(new Specification<SentencePuzzle>().Where(p => p.LessonId == id).Order(p => p.OrderNo), ct);

        return Result<LessonFullDto>.Ok(ToFull(lesson, vocab, gps, examples, mistakes, drills, drillOpts, dialogues, puzzles));
    }

    // ===== Ghi: tạo / cập nhật (thay thế nội dung con = xoá mềm cũ + thêm mới) =====
    public async Task<Result<LessonFullDto>> CreateAsync(LessonUpsertRequest req, CancellationToken ct = default)
    {
        var lesson = new Lesson
        {
            CurriculumId = req.CurriculumId,
            OrderNo = req.OrderNo,
            TitleVi = req.TitleVi,
            TitleZh = req.TitleZh,
            Description = req.Description,
            Status = LessonStatus.Published
        };
        await lessons.AddAsync(lesson, ct);
        await ApplyChildrenAsync(lesson, req, ct);
        await uow.SaveChangesAsync(ct);
        return await GetFullAsync(lesson.Id, ct);
    }

    public async Task<Result<LessonFullDto>> UpdateAsync(Guid id, LessonUpsertRequest req, CancellationToken ct = default)
    {
        var lesson = await lessons.GetByIdAsync(id, ct);
        if (lesson is null) return Result<LessonFullDto>.Fail("Không tìm thấy bài học.", "NOT_FOUND");

        lesson.OrderNo = req.OrderNo;
        lesson.TitleVi = req.TitleVi;
        lesson.TitleZh = req.TitleZh;
        lesson.Description = req.Description;
        lessons.Update(lesson);

        await ApplyChildrenAsync(lesson, req, ct);
        await uow.SaveChangesAsync(ct);
        return await GetFullAsync(id, ct);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var lesson = await lessons.GetByIdAsync(id, ct);
        if (lesson is null) return Result.Fail("Không tìm thấy bài học.", "NOT_FOUND");
        lessons.SoftDelete(lesson);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    public async Task<Result> ReorderAsync(Guid id, int direction, CancellationToken ct = default)
    {
        var lesson = await lessons.GetByIdAsync(id, ct);
        if (lesson is null) return Result.Fail("Không tìm thấy bài học.", "NOT_FOUND");

        var siblings = (await lessons.ListAsync(
            new Specification<Lesson>()
                .Where(l => l.CurriculumId == lesson.CurriculumId && !l.IsDeleted)
                .Order(l => l.OrderNo), ct)).ToList();

        var idx = siblings.FindIndex(l => l.Id == id);
        var j = idx + (direction < 0 ? -1 : 1);
        if (idx < 0 || j < 0 || j >= siblings.Count)
            return Result.Fail("Bài học đã ở đầu/cuối danh sách.", "OUT_OF_RANGE");

        (siblings[idx].OrderNo, siblings[j].OrderNo) = (siblings[j].OrderNo, siblings[idx].OrderNo);
        lessons.Update(siblings[idx]);
        lessons.Update(siblings[j]);
        await uow.SaveChangesAsync(ct);
        return Result.Ok();
    }

    private async Task ApplyChildrenAsync(Lesson lesson, LessonUpsertRequest req, CancellationToken ct)
    {
        // Ẩn nội dung cũ (xoá mềm) — lịch sử còn trong DB
        var oldVocab = await vocabRepo.ListAsync(new Specification<Vocabulary>().Where(v => v.LessonId == lesson.Id), ct);
        vocabRepo.SoftDeleteRange(oldVocab);
        var oldGps = await grammarRepo.ListAsync(new Specification<GrammarPoint>().Where(g => g.LessonId == lesson.Id), ct);
        grammarRepo.SoftDeleteRange(oldGps);
        var gpIds = oldGps.Select(g => g.Id).ToList();
        if (gpIds.Count > 0)
        {
            exampleRepo.SoftDeleteRange(await exampleRepo.ListAsync(new Specification<GrammarExample>().Where(e => gpIds.Contains(e.GrammarPointId)), ct));
            mistakeRepo.SoftDeleteRange(await mistakeRepo.ListAsync(new Specification<CommonMistake>().Where(m => gpIds.Contains(m.GrammarPointId)), ct));
            var oldDrills = await drillRepo.ListAsync(new Specification<Drill>().Where(d => gpIds.Contains(d.GrammarPointId)), ct);
            var dIds = oldDrills.Select(d => d.Id).ToList();
            if (dIds.Count > 0)
                drillOptionRepo.SoftDeleteRange(await drillOptionRepo.ListAsync(new Specification<DrillOption>().Where(o => dIds.Contains(o.DrillId)), ct));
            drillRepo.SoftDeleteRange(oldDrills);
        }
        var oldDlg = await dialogueRepo.ListAsync(new Specification<DialogueLine>().Where(d => d.LessonId == lesson.Id), ct);
        dialogueRepo.SoftDeleteRange(oldDlg);
        if (req.SentencePuzzles is not null)
        {
            var oldPuzzles = await puzzleRepo.ListAsync(new Specification<SentencePuzzle>().Where(p => p.LessonId == lesson.Id), ct);
            puzzleRepo.SoftDeleteRange(oldPuzzles);
        }

        // Thêm nội dung mới
        if (req.Vocabularies is not null)
        {
            var newVocab = req.Vocabularies.Select(v => new Vocabulary
            {
                LessonId = lesson.Id,
                OrderNo = v.OrderNo,
                Hanzi = v.Hanzi,
                Pinyin = v.Pinyin,
                Hanviet = v.Hanviet,
                PartOfSpeech = v.PartOfSpeech,
                MeaningVi = v.MeaningVi,
                Emoji = v.Emoji,
                ExampleZh = v.ExampleZh,
                ExamplePinyin = v.ExamplePinyin,
                ExampleVi = v.ExampleVi,
                InWarmup = v.InWarmup
            }).ToList();
            foreach (var v in newVocab)
                v.AudioUrl = await audio.GenerateAsync(v.Hanzi, ct);
            await vocabRepo.AddRangeAsync(newVocab, ct);
        }

        if (req.GrammarPoints is not null)
            foreach (var g in req.GrammarPoints)
            {
                var gp = new GrammarPoint
                {
                    LessonId = lesson.Id, OrderNo = g.OrderNo,
                    Title = g.Title, Formula = g.Formula, Explanation = g.Explanation
                };
                await grammarRepo.AddAsync(gp, ct);
                foreach (var e in g.Examples.Select((e, i) => (e, i)))
                {
                    var ex = new GrammarExample
                    {
                        GrammarPointId = gp.Id, OrderNo = e.i + 1, Zh = e.e.Zh, Pinyin = e.e.Pinyin, Vi = e.e.Vi
                    };
                    ex.AudioUrl = await audio.GenerateAsync(ex.Zh, ct);
                    await exampleRepo.AddAsync(ex, ct);
                }
                foreach (var m in g.Mistakes)
                    await mistakeRepo.AddAsync(new CommonMistake
                    {
                        GrammarPointId = gp.Id, WrongText = m.WrongText, RightText = m.RightText, Note = m.Note
                    }, ct);
                foreach (var d in g.Drills.Select((d, i) => (d, i)))
                {
                    var drill = new Drill
                    {
                        GrammarPointId = gp.Id, OrderNo = d.i + 1, Question = d.d.Question, AnswerIndex = d.d.AnswerIndex
                    };
                    await drillRepo.AddAsync(drill, ct);
                    var opts = d.d.Options.Select((t, oi) => new DrillOption
                    {
                        DrillId = drill.Id, OrderNo = oi + 1, Text = t
                    }).ToList();
                    if (opts.Count > 0) await drillOptionRepo.AddRangeAsync(opts, ct);
                }
            }

        if (req.DialogueLines is not null)
        {
            var newDlg = req.DialogueLines.Select(d => new DialogueLine
            {
                LessonId = lesson.Id, OrderNo = d.OrderNo,
                Speaker = Enum.TryParse<Speaker>(d.Speaker, true, out var sp) ? sp : Speaker.A,
                Zh = d.Zh, Pinyin = d.Pinyin, Vi = d.Vi
            }).ToList();
            foreach (var d in newDlg)
                d.AudioUrl = await audio.GenerateAsync(d.Zh, ct);
            await dialogueRepo.AddRangeAsync(newDlg, ct);
        }

        if (req.SentencePuzzles is not null)
        {
            var newPuzzles = req.SentencePuzzles.Select(p => new SentencePuzzle
            {
                LessonId = lesson.Id, OrderNo = p.OrderNo,
                Sentence = p.Sentence, Pinyin = p.Pinyin, MeaningVi = p.MeaningVi
            }).ToList();
            await puzzleRepo.AddRangeAsync(newPuzzles, ct);
        }
    }

    /// <summary>Bù file âm thanh cho bài học hiện có (các từ/câu chưa có audio).</summary>
    public async Task<Result<int>> GenerateAudioAsync(Guid id, CancellationToken ct = default)
    {
        var vocab = await vocabRepo.ListAsync(new Specification<Vocabulary>().Where(v => v.LessonId == id).Track(), ct);
        var gps = await grammarRepo.ListAsync(new Specification<GrammarPoint>().Where(g => g.LessonId == id), ct);
        var gpIds = gps.Select(g => g.Id).ToList();
        var examples = gpIds.Count > 0
            ? await exampleRepo.ListAsync(new Specification<GrammarExample>().Where(e => gpIds.Contains(e.GrammarPointId)).Track(), ct)
            : [];
        var dialogues = await dialogueRepo.ListAsync(new Specification<DialogueLine>().Where(d => d.LessonId == id).Track(), ct);

        var generated = 0;
        foreach (var v in vocab.Where(v => string.IsNullOrEmpty(v.AudioUrl)))
        {
            v.AudioUrl = await audio.GenerateAsync(v.Hanzi, ct);
            if (v.AudioUrl is not null) { vocabRepo.Update(v); generated++; }
        }
        foreach (var e in examples.Where(e => string.IsNullOrEmpty(e.AudioUrl)))
        {
            e.AudioUrl = await audio.GenerateAsync(e.Zh, ct);
            if (e.AudioUrl is not null) { exampleRepo.Update(e); generated++; }
        }
        foreach (var d in dialogues.Where(d => string.IsNullOrEmpty(d.AudioUrl)))
        {
            d.AudioUrl = await audio.GenerateAsync(d.Zh, ct);
            if (d.AudioUrl is not null) { dialogueRepo.Update(d); generated++; }
        }

        if (generated > 0) await uow.SaveChangesAsync(ct);
        return Result<int>.Ok(generated);
    }

    private static LessonFullDto ToFull(
        Lesson l, IReadOnlyList<Vocabulary> vocab,
        IReadOnlyList<GrammarPoint> gps, IReadOnlyList<GrammarExample> examples,
        IReadOnlyList<CommonMistake> mistakes, IReadOnlyList<Drill> drills,
        IReadOnlyList<DrillOption> drillOpts, IReadOnlyList<DialogueLine> dialogues,
        IReadOnlyList<SentencePuzzle> puzzles) => new(
        l.Id, l.CurriculumId, l.OrderNo, l.TitleVi, l.TitleZh, l.Description, l.Status.ToString(),
        vocab.Select(v => new VocabDto(v.Id, v.OrderNo, v.Hanzi, v.Pinyin, v.Hanviet, v.PartOfSpeech,
                v.MeaningVi, v.Emoji, v.ExampleZh, v.ExamplePinyin, v.ExampleVi, v.AudioUrl, v.InWarmup)).ToList(),
        gps.Select(g => new GrammarDto(
            g.Id, g.OrderNo, g.Title, g.Formula, g.Explanation,
            examples.Where(e => e.GrammarPointId == g.Id).Select(e => new ExampleDto(e.Id, e.OrderNo, e.Zh, e.Pinyin, e.Vi, e.AudioUrl)).ToList(),
            mistakes.Where(m => m.GrammarPointId == g.Id).Select(m => new MistakeDto(m.Id, m.WrongText, m.RightText, m.Note)).ToList(),
            drills.Where(d => d.GrammarPointId == g.Id).Select(d => new DrillDto(
                d.Id, d.OrderNo, d.Question,
                drillOpts.Where(o => o.DrillId == d.Id).OrderBy(o => o.OrderNo).Select(o => o.Text).ToList(),
                d.AnswerIndex)).ToList())).ToList(),
        dialogues.Select(d => new DialogueDto(d.Id, d.OrderNo, d.Speaker.ToString(), d.Zh, d.Pinyin, d.Vi, d.AudioUrl)).ToList(),
        puzzles.Select(p => new SentencePuzzleDto(p.Id, p.OrderNo, p.Sentence, p.Pinyin, p.MeaningVi)).ToList());
}
