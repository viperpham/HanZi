namespace HanZi.Server.Application.Features.Lessons.Dtos;

public record LessonFullDto(
    Guid Id, Guid CurriculumId, int OrderNo, string TitleVi, string TitleZh,
    string? Description, string Status,
    IReadOnlyList<VocabDto> Vocabularies,
    IReadOnlyList<GrammarDto> GrammarPoints,
    IReadOnlyList<DialogueDto> DialogueLines,
    IReadOnlyList<SentencePuzzleDto> SentencePuzzles);

public record VocabDto(
    Guid Id, int OrderNo, string Hanzi, string Pinyin, string? Hanviet, string? PartOfSpeech,
    string MeaningVi, string? Emoji, string? ExampleZh, string? ExamplePinyin, string? ExampleVi,
    string? AudioUrl, bool InWarmup);

public record GrammarDto(
    Guid Id, int OrderNo, string Title, string? Formula, string? Explanation,
    IReadOnlyList<ExampleDto> Examples,
    IReadOnlyList<MistakeDto> Mistakes,
    IReadOnlyList<DrillDto> Drills);

public record ExampleDto(Guid Id, int OrderNo, string Zh, string? Pinyin, string Vi, string? AudioUrl);
public record MistakeDto(Guid Id, string WrongText, string RightText, string? Note);

public record DrillDto(Guid Id, int OrderNo, string Question, IReadOnlyList<string> Options, int AnswerIndex);
public record DialogueDto(Guid Id, int OrderNo, string Speaker, string Zh, string? Pinyin, string Vi, string? AudioUrl);

public record VocabUpsertDto(int OrderNo, string Hanzi, string Pinyin, string? Hanviet, string? PartOfSpeech,
    string MeaningVi, string? Emoji, string? ExampleZh, string? ExamplePinyin, string? ExampleVi, bool InWarmup);

public record GrammarUpsertDto(int OrderNo, string Title, string? Formula, string? Explanation,
    IReadOnlyList<ExampleDto> Examples, IReadOnlyList<MistakeDto> Mistakes,
    IReadOnlyList<DrillUpsertDto> Drills);

public record DrillUpsertDto(int OrderNo, string Question, IReadOnlyList<string> Options, int AnswerIndex);

public record DialogueUpsertDto(int OrderNo, string Speaker, string Zh, string? Pinyin, string Vi);

public record SentencePuzzleDto(Guid Id, int OrderNo, string Sentence, string? Pinyin, string MeaningVi);

public record SentencePuzzleUpsertDto(int OrderNo, string Sentence, string? Pinyin, string MeaningVi);

public record LessonUpsertRequest(
    Guid CurriculumId, int OrderNo, string TitleVi, string TitleZh, string? Description,
    IReadOnlyList<VocabUpsertDto>? Vocabularies,
    IReadOnlyList<GrammarUpsertDto>? GrammarPoints,
    IReadOnlyList<DialogueUpsertDto>? DialogueLines,
    IReadOnlyList<SentencePuzzleUpsertDto>? SentencePuzzles);
