using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("admin/classes")]
public class AdminClassesController : ControllerBase
{
    private readonly IClassService _classService;

    public AdminClassesController(IClassService classService) => _classService = classService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClassDto>>> GetAllClasses()
    {
        var classes = await _classService.GetAllClassesAsync();
        return Ok(classes);
    }

    [HttpGet("{classId:guid}")]
    public async Task<ActionResult<ClassDto>> GetClassById(Guid classId)
    {
        var @class = await _classService.GetClassByIdAsync(classId);
        if (@class == null)
            return NotFound();
        return Ok(@class);
    }

    [HttpPost]
    public async Task<ActionResult<ClassDto>> CreateClass([FromBody] CreateClassDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var created = await _classService.CreateClassAsync(dto);
        return CreatedAtAction(nameof(GetClassById), new { classId = created.Id }, created);
    }

    [HttpPut("{classId:guid}")]
    public async Task<ActionResult<ClassDto>> UpdateClass(Guid classId, [FromBody] UpdateClassDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var updated = await _classService.UpdateClassAsync(classId, dto);
        return Ok(updated);
    }

    [HttpDelete("{classId:guid}")]
    public async Task<ActionResult> DeleteClass(Guid classId)
    {
        await _classService.DeleteClassAsync(classId);
        return NoContent();
    }
}
