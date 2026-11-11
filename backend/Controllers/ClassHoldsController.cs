using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("classes/{classId:guid}/holds")]
public class ClassHoldsController : BaseApiController
{
    private readonly IHoldService _holdService;
    public ClassHoldsController(IHoldService holdService) => _holdService = holdService;

    [HttpPost]
    public async Task<ActionResult<SeatHoldDto>> HoldSeats(Guid classId, [FromBody] CreateHoldDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var holdDurationSecondsRaw = Environment.GetEnvironmentVariable("HOLD_DURATION_SECONDS");
        var holdDurationSeconds = 600;
        if (!string.IsNullOrWhiteSpace(holdDurationSecondsRaw)
            && int.TryParse(holdDurationSecondsRaw, out var parsed)
            && parsed > 0)
        {
            holdDurationSeconds = parsed;
        }

        var holdDuration = TimeSpan.FromSeconds(holdDurationSeconds);

        var hold = await _holdService.HoldSeatsAsync(classId, StudentId, dto, holdDuration);
        return Created($"/holds/{hold.Id}", hold);
    }
}
