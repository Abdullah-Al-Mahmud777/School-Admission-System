using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolAdmissionSystem.Models;

public class SchoolClass
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Shift { get; set; } = string.Empty;

    [Required]
    public int TotalSeats { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    [ConcurrencyCheck]
    public int Version { get; set; }
}
