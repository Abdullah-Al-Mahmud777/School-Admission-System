using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<SeatHold> SeatHolds => Set<SeatHold>();

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
            entity.HasIndex(e => e.Name).IsUnique();
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
    }
}
