using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<SeatHold> SeatHolds => Set<SeatHold>();
    public DbSet<ApplicationCancellation> Cancellations => Set<ApplicationCancellation>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SchoolClass>(entity =>
        {
            entity.ToTable("classes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd().HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired().HasMaxLength(200);
            entity.Property(e => e.Shift).HasColumnName("shift").IsRequired().HasMaxLength(50);
            entity.Property(e => e.TotalSeats).HasColumnName("total_seats").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.Version).HasColumnName("version").IsRequired().IsConcurrencyToken();
            entity.HasIndex(e => new { e.Name, e.Shift }).IsUnique();
        });

        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.ToTable("admin_users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd().HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Email).HasColumnName("email").IsRequired().HasMaxLength(200);
            entity.Property(e => e.FullName).HasColumnName("full_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<SeatHold>(entity =>
        {
            entity.ToTable("seat_holds");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd().HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.ClassId).HasColumnName("class_id").IsRequired();
            entity.Property(e => e.StudentId).HasColumnName("student_id").IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").IsRequired();
            entity.Property(e => e.HeldAt).HasColumnName("held_at").IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(e => e.ConfirmedAt).HasColumnName("confirmed_at");
            entity.Property(e => e.PaymentStatus).HasColumnName("payment_status").IsRequired();
            entity.Property(e => e.AdmissionStatus).HasColumnName("admission_status").IsRequired();
            entity.Property(e => e.PaidAt).HasColumnName("paid_at");
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at");
            entity.Property(e => e.Version).HasColumnName("version").IsRequired().IsConcurrencyToken();

            entity.HasIndex(e => e.ClassId);
            entity.HasIndex(e => e.StudentId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ExpiresAt);

            entity.HasOne(e => e.Class)
                .WithMany()
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApplicationCancellation>(entity =>
        {
            entity.ToTable("application_cancellations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd().HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.HoldId).HasColumnName("hold_id").IsRequired();
            entity.Property(e => e.ClassId).HasColumnName("class_id").IsRequired();
            entity.Property(e => e.StudentId).HasColumnName("student_id").IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").IsRequired();
            entity.Property(e => e.PreviousHoldStatus).HasColumnName("previous_hold_status").IsRequired();
            entity.Property(e => e.PreviousPaymentStatus).HasColumnName("previous_payment_status").IsRequired();
            entity.Property(e => e.PreviousAdmissionStatus).HasColumnName("previous_admission_status").IsRequired();
            entity.Property(e => e.NewHoldStatus).HasColumnName("new_hold_status").IsRequired();
            entity.Property(e => e.NewPaymentStatus).HasColumnName("new_payment_status").IsRequired();
            entity.Property(e => e.NewAdmissionStatus).HasColumnName("new_admission_status").IsRequired();
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at").IsRequired();

            // One audit row per hold enforces cancellation at the database level.
            entity.HasIndex(e => e.HoldId).IsUnique();
            entity.HasIndex(e => e.StudentId);
            entity.HasIndex(e => e.ClassId);
            entity.HasIndex(e => e.CancelledAt);

            entity.HasOne<SeatHold>()
                .WithMany()
                .HasForeignKey(e => e.HoldId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<SchoolClass>()
                .WithMany()
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
