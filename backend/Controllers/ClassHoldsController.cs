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

        var durationHeader = Request.Headers["HOLD_DURATION_SECONDS"].FirstOrDefault();
        var holdDuration = !string.IsNullOrWhiteSpace(durationHeader) && double.TryParse(durationHeader, out var seconds)
            ? TimeSpan.FromSeconds(seconds)
            : TimeSpan.FromMinutes(10);

        var hold = await _holdService.HoldSeatsAsync(classId, StudentId, dto, holdDuration);
        return Created($"/holds/{hold.Id}", hold);
    }
}
