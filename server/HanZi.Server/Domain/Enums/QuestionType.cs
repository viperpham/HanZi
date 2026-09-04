namespace HanZi.Server.Domain.Enums;

public enum QuestionType
{
    MultipleChoice = 0, // trắc nghiệm
    Fill = 1,           // điền từ
    Order = 2,          // sắp xếp câu
    Match = 3,          // nối từ
    Writing = 4,        // viết đoạn
    Record = 5,         // ghi âm
    Photo = 6           // nộp ảnh
}

public static class QuestionTypeExtensions
{
    /// <summary>Các dạng hệ thống tự chấm điểm được.</summary>
    public static bool IsAutoGraded(this QuestionType type) =>
        type is QuestionType.MultipleChoice or QuestionType.Fill or QuestionType.Order or QuestionType.Match;
}
