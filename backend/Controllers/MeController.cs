using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("me")]
public class MeController : BaseApiController
{
    private readonly IHoldService _holdService;
    public MeController(IHoldService holdService) => _holdService = holdService;

    [HttpGet("holds")]
    public async Task<ActionResult<IEnumerable<UserHoldDto>>> GetMyHolds()
    {
        var holds = await _holdService.GetMyHoldsAsync(StudentId);
        return Ok(holds);
    }
}
