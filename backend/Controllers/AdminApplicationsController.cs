using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("admin/applications")]
public class AdminApplicationsController : ControllerBase
{
    private readonly IHoldService _holdService;

    public AdminApplicationsController(IHoldService holdService) => _holdService = holdService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdminApplicationDto>>> GetAllApplications()
    {
        var applications = await _holdService.GetAdminApplicationsAsync();
        return Ok(applications);
    }

    [HttpPost("{applicationId:guid}/cancel")]
    public async Task<ActionResult<SeatHoldDto>> CancelApplication(Guid applicationId)
    {
        var application = await _holdService.CancelHoldAsync(applicationId);
        return Ok(application);
    }

    [HttpDelete("{applicationId:guid}")]
    public async Task<ActionResult> DeleteApplication(Guid applicationId)
    {
        await _holdService.CancelHoldAsync(applicationId, null, allowTerminalNoOp: true);
        return NoContent();
    }
}
