using HanZi.Server.Domain.Common;
using Serilog;

namespace HanZi.Server;

/// <summary>
/// Global exception middleware — mọi lỗi chưa xử lý trả về JSON gọn gàng,
/// không rò stack trace ra ngoài. Service lỗi nghiệp vụ dùng Result, không exception.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi chưa xử lý tại {Path}", ctx.Request.Path);
            if (ctx.Response.HasStarted) throw;

            ctx.Response.StatusCode = 500;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new Result
            {
                Success = false,
                Error = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
                ErrorCode = "INTERNAL_ERROR"
            });
        }
    }
}
