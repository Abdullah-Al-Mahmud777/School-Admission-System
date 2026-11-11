using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Exceptions;
using SchoolAdmissionSystem.Models;
using SchoolAdmissionSystem.Services;

namespace SchoolAdmissionSystem.Tests;

public class HoldServiceTests
{
    [Fact]
    public async Task HoldAndConfirmLifecycle_UpdatesClassSeatCounts()
    {
        await using var db = await CreateSharedSqliteDatabaseAsync();
        await using var seedContext = CreateDbContext(db.ConnectionString);

        var schoolClass = await CreateClassAsync(seedContext, totalSeats: 2, name: "Lifecycle", shift: "Morning");

        await using var actionContext = CreateDbContext(db.ConnectionString);
        var holdService = new HoldService(actionContext);
        var classService = new ClassService(actionContext);

        var hold = await holdService.HoldSeatsAsync(
            schoolClass.Id,
            "20152691234567890",
            new CreateHoldDto { Quantity = 1 },
            TimeSpan.FromMinutes(10));

        Assert.Equal("HELD", hold.Status);

        var confirmed = await holdService.ConfirmHoldAsync(hold.Id, "20152691234567890");
        Assert.Equal("CONFIRMED", confirmed.Status);

        var updatedClass = await classService.GetClassByIdAsync(schoolClass.Id);

        Assert.NotNull(updatedClass);
        Assert.Equal(2, updatedClass!.TotalSeats);
        Assert.Equal(0, updatedClass.HeldSeats);
        Assert.Equal(1, updatedClass.ConfirmedSeats);
        Assert.Equal(1, updatedClass.AvailableSeats);
    }

    [Fact]
    public async Task ExpiredHold_ReleasesSeatsAndMarksStatusExpired()
    {
        await using var db = await CreateSharedSqliteDatabaseAsync();
        await using var seedContext = CreateDbContext(db.ConnectionString);

        var schoolClass = await CreateClassAsync(seedContext, totalSeats: 1, name: "Expiry", shift: "Day");

        await using var actionContext = CreateDbContext(db.ConnectionString);
        var holdService = new HoldService(actionContext);
        var classService = new ClassService(actionContext);

        var hold = await holdService.HoldSeatsAsync(
            schoolClass.Id,
            "20152691234567891",
            new CreateHoldDto { Quantity = 1 },
            TimeSpan.FromMilliseconds(100));

        await Task.Delay(300);
        var expiredCount = await holdService.ExpireHoldsAsync();
        Assert.True(expiredCount >= 1);

        var expiredHold = await holdService.GetHoldByIdAsync(hold.Id, "20152691234567891");
        var updatedClass = await classService.GetClassByIdAsync(schoolClass.Id);

        Assert.Equal("EXPIRED", expiredHold.Status);
        Assert.NotNull(updatedClass);
        Assert.Equal(0, updatedClass!.HeldSeats);
        Assert.Equal(0, updatedClass.ConfirmedSeats);
        Assert.Equal(1, updatedClass.AvailableSeats);
    }

    [Fact]
    public async Task ConcurrentHoldRequests_NeverExceedTotalSeats()
    {
        await using var db = await CreateSharedSqliteDatabaseAsync();
        await using var seedContext = CreateDbContext(db.ConnectionString);
        var schoolClass = await CreateClassAsync(seedContext, totalSeats: 5, name: "Concurrency", shift: "Afternoon");

        const int requestCount = 48;
        var tasks = Enumerable.Range(1, requestCount).Select(async i =>
        {
            try
            {
                await using var context = CreateDbContext(db.ConnectionString);
                var holdService = new HoldService(context);
                var studentId = $"2015269123456{i:D4}";
                await holdService.HoldSeatsAsync(
                    schoolClass.Id,
                    studentId,
                    new CreateHoldDto { Quantity = 1 },
                    TimeSpan.FromMinutes(10));
                return true;
            }
            catch (ConflictException)
            {
                return false;
            }
            catch (InsufficientSeatsException)
            {
                return false;
            }
            catch (DbUpdateException)
            {
                return false;
            }
        });

        var results = await Task.WhenAll(tasks);

        await using var verificationContext = CreateDbContext(db.ConnectionString);
        var classService = new ClassService(verificationContext);
        var updatedClass = await classService.GetClassByIdAsync(schoolClass.Id);

        Assert.NotNull(updatedClass);

        var occupied = updatedClass!.HeldSeats + updatedClass.ConfirmedSeats;
        var successCount = results.Count(r => r);

        Assert.InRange(successCount, 0, updatedClass.TotalSeats);
        Assert.InRange(occupied, 0, updatedClass.TotalSeats);
    }

    private static async Task<SchoolClass> CreateClassAsync(
        AppDbContext db,
        int totalSeats,
        string name,
        string shift)
    {
        var schoolClass = new SchoolClass
        {
            Id = Guid.NewGuid(),
            Name = name,
            Shift = shift,
            TotalSeats = totalSeats,
            CreatedAt = DateTimeOffset.UtcNow,
            Version = 1
        };

        db.Classes.Add(schoolClass);
        await db.SaveChangesAsync();
        return schoolClass;
    }

    private static AppDbContext CreateDbContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connectionString)
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<SharedSqliteDatabase> CreateSharedSqliteDatabaseAsync()
    {
        var dbName = $"school_admission_tests_{Guid.NewGuid():N}";
        var connectionString = $"Data Source=file:{dbName}?mode=memory&cache=shared";
        var keeperConnection = new SqliteConnection(connectionString);
        await keeperConnection.OpenAsync();

        await using var context = CreateDbContext(connectionString);
        await context.Database.EnsureCreatedAsync();

        return new SharedSqliteDatabase(connectionString, keeperConnection);
    }

    private sealed class SharedSqliteDatabase : IAsyncDisposable
    {
        public SharedSqliteDatabase(string connectionString, SqliteConnection keeperConnection)
        {
            ConnectionString = connectionString;
            KeeperConnection = keeperConnection;
        }

        public string ConnectionString { get; }
        private SqliteConnection KeeperConnection { get; }

        public async ValueTask DisposeAsync()
        {
            await KeeperConnection.DisposeAsync();
        }
    }
}
