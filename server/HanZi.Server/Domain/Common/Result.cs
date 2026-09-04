namespace HanZi.Server.Domain.Common;

/// <summary>
/// Result pattern — thay thế việc ném exception cho lỗi nghiệp vụ.
/// </summary>
public class Result
{
    public bool Success { get; init; }
    public string? Error { get; init; }
    public string? ErrorCode { get; init; }

    public static Result Ok() => new() { Success = true };
    public static Result Fail(string error, string? code = null) => new() { Success = false, Error = error, ErrorCode = code };
}

public class Result<T> : Result
{
    public T? Value { get; private init; }

    public static Result<T> Ok(T value) => new() { Success = true, Value = value };
    public static new Result<T> Fail(string error, string? code = null) => new() { Success = false, Error = error, ErrorCode = code };
}

/// <summary>
/// Phân trang chuẩn cho mọi danh sách.
/// </summary>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Total { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling(Total / (double)PageSize);
}
