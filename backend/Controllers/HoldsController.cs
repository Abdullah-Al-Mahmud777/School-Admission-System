using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("holds")]
public class HoldsController : BaseApiController
{
    private readonly IHoldService _holdService;
    public HoldsController(IHoldService holdService) => _holdService = holdService;

    [HttpGet("{holdId:guid}")]
    public async Task<ActionResult<SeatHoldDto>> GetHoldById(Guid holdId)
    {
        var hold = await _holdService.GetHoldByIdAsync(holdId, StudentId);
        return Ok(hold);
    }

    [HttpPost("{holdId:guid}/confirm")]
    public async Task<ActionResult<SeatHoldDto>> Confirm(Guid holdId)
    {
        var hold = await _holdService.ConfirmHoldAsync(holdId, StudentId);
        return Ok(hold);
    }

    [HttpPost("{holdId:guid}/pay")]
    public async Task<ActionResult<SeatHoldDto>> Pay(Guid holdId)
    {
        var hold = await _holdService.PayHoldAsync(holdId, StudentId);
        return Ok(hold);
    }

    [HttpPost("{holdId:guid}/cancel")]
    public async Task<ActionResult<SeatHoldDto>> Cancel(Guid holdId)
    {
        var hold = await _holdService.CancelHoldAsync(holdId, StudentId);
        return Ok(hold);
    }

    [HttpDelete("{holdId:guid}")]
    public async Task<ActionResult> Release(Guid holdId)
    {
        await _holdService.ReleaseHoldAsync(holdId, StudentId);
        return NoContent();
    }
}
