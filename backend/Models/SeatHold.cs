using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolAdmissionSystem.Models;

public class SeatHold
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ClassId { get; set; }

    [Required]
    public Guid StudentId { get; set; }

    [Required]
    public int Quantity { get; set; }

    [Required]
    public HoldStatus Status { get; set; } = HoldStatus.Held;

    public DateTimeOffset HeldAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? ConfirmedAt { get; set; }

    [ConcurrencyCheck]
    public int Version { get; set; }

    [ForeignKey(nameof(ClassId))]
    public SchoolClass Class { get; set; } = null!;
}
