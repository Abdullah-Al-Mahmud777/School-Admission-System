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
}
