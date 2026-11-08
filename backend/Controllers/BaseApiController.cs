using Microsoft.AspNetCore.Mvc;

namespace SchoolAdmissionSystem.Controllers;

public abstract class BaseApiController : ControllerBase
{
    protected Guid StudentId
    {
        get
        {
            var header = Request.Headers["X-Student-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(header) || !Guid.TryParse(header, out var id))
                throw new Exceptions.BadRequestException("Invalid or missing X-Student-Id header.");
            return id;
        }
    }
}
