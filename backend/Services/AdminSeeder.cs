using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Services;

public static class AdminSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration, ILogger logger)
    {
        var email = configuration["AdminSeed:Email"]?.Trim().ToLowerInvariant();
        var password = configuration["AdminSeed:Password"];
        var fullName = configuration["AdminSeed:FullName"]?.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("AdminSeed credentials are not configured; skipping admin seed.");
            return;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (await db.AdminUsers.AnyAsync(a => a.Email.ToLower() == email))
            return;

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        db.AdminUsers.Add(new AdminUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = string.IsNullOrWhiteSpace(fullName) ? "System Administrator" : fullName,
            PasswordHash = hasher.Hash(password),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded admin account {Email}.", email);
    }
}
