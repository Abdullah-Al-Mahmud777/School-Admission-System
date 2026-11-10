using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Exceptions;

namespace SchoolAdmissionSystem.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    public ErrorHandlingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IOptions<JsonOptions> jsonOptions)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = ex.StatusCode;
            var error = new ErrorResponse
            {
                Error = ex.GetType().Name,
                Message = ex.Message,
                StatusCode = ex.StatusCode
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(error, jsonOptions.Value.JsonSerializerOptions));
        }
        catch (Exception ex)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = 500;
            var error = new ErrorResponse
            {
                Error = "InternalServerError",
                Message = ex.Message,
                StatusCode = 500
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(error, jsonOptions.Value.JsonSerializerOptions));
        }
    }
}
