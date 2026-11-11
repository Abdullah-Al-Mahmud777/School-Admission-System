using System.ComponentModel.DataAnnotations;

namespace SchoolAdmissionSystem.DTOs;

public class ErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int StatusCode { get; set; }
}

public class CreateClassDto
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Shift { get; set; } = string.Empty;

    [Range(1, 10000)]
    public int TotalSeats { get; set; }
}

public class UpdateClassDto
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Shift { get; set; } = string.Empty;

    [Range(1, 10000)]
    public int TotalSeats { get; set; }
}

public class AdminLoginDto
{
    [Required]
    [EmailAddress]
    [StringLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
}

public class ClassDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Shift { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public int HeldSeats { get; set; }
    public int ConfirmedSeats { get; set; }
    public int AvailableSeats => TotalSeats - HeldSeats - ConfirmedSeats;
    public DateTimeOffset CreatedAt { get; set; }
}

public class CreateHoldDto
{
    public int Quantity { get; set; }
}

public class SeatHoldDto
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTimeOffset HeldAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string AdmissionStatus { get; set; } = string.Empty;
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
}

public class UserHoldDto : SeatHoldDto
{
    public string? ClassName { get; set; }
}

public class AdminApplicationDto : SeatHoldDto
{
    public string ClassName { get; set; } = string.Empty;
    public string ClassShift { get; set; } = string.Empty;
}
