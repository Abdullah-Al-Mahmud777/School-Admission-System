namespace SchoolAdmissionSystem.DTOs;

public class ErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string? Message { get; set; }
    public int StatusCode { get; set; }
}

public class CreateClassDto
{
    public string Name { get; set; } = string.Empty;
    public string Shift { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
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
}

public class UserHoldDto : SeatHoldDto
{
    public string? ClassName { get; set; }
}
