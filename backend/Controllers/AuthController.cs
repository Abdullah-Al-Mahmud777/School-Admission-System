using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] AdminLoginDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("me")]
    public ActionResult<object> Me()
    {
        return Ok(new
        {
            Email = User.FindFirstValue(ClaimTypes.Email),
            FullName = User.FindFirstValue(ClaimTypes.Name),
            Role = User.FindFirstValue(ClaimTypes.Role)
        });
    }
}
