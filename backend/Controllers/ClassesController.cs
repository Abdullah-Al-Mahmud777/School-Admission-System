using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController : BaseApiController
{
    private readonly IClassService _classService;
    public ClassesController(IClassService classService) => _classService = classService;

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<ActionResult<ClassDto>> CreateClass([FromBody] CreateClassDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);
        var created = await _classService.CreateClassAsync(dto);
        return CreatedAtAction(nameof(GetClassById), new { classId = created.Id }, created);
    }

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
}
