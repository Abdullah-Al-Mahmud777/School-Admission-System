using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolAdmissionSystem.Models;

public class ApplicationCancellation
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid HoldId { get; set; }

    [Required]
    public Guid ClassId { get; set; }

    [Required]
    public string StudentId { get; set; } = string.Empty;

    [Required]
    public int Quantity { get; set; }

    [Required]
    public HoldStatus PreviousHoldStatus { get; set; }

    [Required]
    public PaymentStatus PreviousPaymentStatus { get; set; }

    [Required]
    public AdmissionStatus PreviousAdmissionStatus { get; set; }

    [Required]
    public HoldStatus NewHoldStatus { get; set; }

    [Required]
    public PaymentStatus NewPaymentStatus { get; set; }

    [Required]
    public AdmissionStatus NewAdmissionStatus { get; set; }

    [Required]
    public DateTimeOffset CancelledAt { get; set; }
}
