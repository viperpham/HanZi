using HanZi.Server.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace HanZi.Server.Controllers;

public static class ResultExtensions
{
    public static IActionResult ToActionResult(this Result result) =>
        result.Success
            ? new OkObjectResult(new { success = true })
            : new ObjectResult(new { success = false, error = result.Error, code = result.ErrorCode })
            { StatusCode = Map(result.ErrorCode) };

    public static IActionResult ToActionResult<T>(this Result<T> result) =>
        result.Success
            ? new OkObjectResult(new { success = true, data = result.Value })
            : new ObjectResult(new { success = false, error = result.Error, code = result.ErrorCode })
            { StatusCode = Map(result.ErrorCode) };

    private static int Map(string? code) => code switch
    {
        "NOT_FOUND" => 404,
        "FORBIDDEN" => 403,
        "BAD_CREDENTIALS" or "UNAUTHORIZED" => 401,
        "LOCKED" => 423,
        _ => 400
    };
}
