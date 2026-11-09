using Microsoft.AspNetCore.Mvc;

namespace SchoolAdmissionSystem.Controllers;

public abstract class BaseApiController : ControllerBase
{
    protected string StudentId
    {
        get
        {
            var header = Request.Headers["X-Student-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(header))
                throw new Exceptions.BadRequestException("Missing X-Student-Id header.");
            if (!System.Text.RegularExpressions.Regex.IsMatch(header, @"^\d{17}$"))
                throw new Exceptions.BadRequestException("X-Student-Id must contain exactly 17 digits.");
            return header;
        }
    }
}
