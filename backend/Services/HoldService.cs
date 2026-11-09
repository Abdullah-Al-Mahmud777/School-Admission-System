using System.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Exceptions;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Services;

public interface IHoldService
{
    Task<SeatHoldDto> HoldSeatsAsync(Guid classId, string studentId, CreateHoldDto dto, TimeSpan holdDuration);
    Task<SeatHoldDto> GetHoldByIdAsync(Guid holdId, string? studentId = null);
    Task<SeatHoldDto> ConfirmHoldAsync(Guid holdId, string studentId);
    Task ReleaseHoldAsync(Guid holdId, string? studentId = null);
    Task<IEnumerable<UserHoldDto>> GetMyHoldsAsync(string studentId);
}

public class HoldService : IHoldService
{
    private readonly AppDbContext _db;
    private const int MaxRetries = 3;

    public HoldService(AppDbContext db) => _db = db;

    public async Task<SeatHoldDto> HoldSeatsAsync(Guid classId, string studentId, CreateHoldDto dto, TimeSpan holdDuration)
    {
        Exception? lastEx = null;
        for (var attempt = 0; attempt < MaxRetries; attempt++)
        {
            using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                await _db.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"classes\" WHERE id = @p0 FOR UPDATE", classId);

                var schoolClass = await _db.Classes.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == classId);
                if (schoolClass == null)
                    throw new NotFoundException($"Class {classId} not found.");

                var now = DateTimeOffset.UtcNow;
                var heldSeats = await _db.SeatHolds
                    .Where(h => h.ClassId == classId
                        && (h.Status == HoldStatus.Confirmed
                            || (h.Status == HoldStatus.Held && h.ExpiresAt > now)))
                    .SumAsync(h => (int?)h.Quantity) ?? 0;

                var available = schoolClass.TotalSeats - heldSeats;
                if (dto.Quantity > available)
                    throw new InsufficientSeatsException($"Only {available} seat(s) available for this class.");

                var hold = new SeatHold
                {
                    Id = Guid.NewGuid(),
                    ClassId = classId,
                    StudentId = studentId,
                    Quantity = dto.Quantity,
                    Status = HoldStatus.Held,
                    HeldAt = now,
                    ExpiresAt = now.Add(holdDuration),
                    Version = 1
                };
                _db.SeatHolds.Add(hold);
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return ToDto(hold);
            }
            catch (DbUpdateException ex) when (IsRetryablePostgresError(ex))
            {
                await transaction.RollbackAsync();
                lastEx = ex;
                if (attempt == MaxRetries - 1) throw;
                await Task.Delay(100 * (attempt + 1));
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        throw new InvalidOperationException("Failed to place seat hold after retries.", lastEx);
    }

    public async Task<SeatHoldDto> GetHoldByIdAsync(Guid holdId, string? studentId = null)
    {
        var query = _db.SeatHolds.AsNoTracking().Where(h => h.Id == holdId);
        if (studentId is not null)
            query = query.Where(h => h.StudentId == studentId);
        var hold = await query.FirstOrDefaultAsync();
        if (hold == null)
            throw new NotFoundException($"Hold {holdId} not found.");
        return ToDto(hold);
    }

    public async Task<SeatHoldDto> ConfirmHoldAsync(Guid holdId, string studentId)
    {
        Exception? lastEx = null;
        for (var attempt = 0; attempt < MaxRetries; attempt++)
        {
            using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var hold = await _db.SeatHolds.FirstOrDefaultAsync(h => h.Id == holdId);
                if (hold == null)
                    throw new NotFoundException($"Hold {holdId} not found.");
                if (hold.StudentId != studentId)
                    throw new BadRequestException("Hold belongs to a different student.");
                if (hold.Status != HoldStatus.Held)
                    throw new ConflictException($"Hold is already {hold.Status}.");
                if (hold.ExpiresAt <= DateTimeOffset.UtcNow)
                    throw new ConflictException("Hold has expired.");

                await _db.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"classes\" WHERE id = @p0 FOR UPDATE", hold.ClassId);

                hold.Status = HoldStatus.Confirmed;
                hold.ConfirmedAt = DateTimeOffset.UtcNow;
                hold.Version++;
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return ToDto(hold);
            }
            catch (DbUpdateException ex) when (IsRetryablePostgresError(ex))
            {
                await transaction.RollbackAsync();
                lastEx = ex;
                if (attempt == MaxRetries - 1) throw;
                await Task.Delay(100 * (attempt + 1));
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        throw new InvalidOperationException("Failed to confirm hold after retries.", lastEx);
    }

    public async Task ReleaseHoldAsync(Guid holdId, string? studentId = null)
    {
        using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var hold = await _db.SeatHolds.FirstOrDefaultAsync(h => h.Id == holdId);
            if (hold == null)
                throw new NotFoundException($"Hold {holdId} not found.");
            if (studentId is not null && hold.StudentId != studentId)
                throw new BadRequestException("Hold belongs to a different student.");
            if (hold.Status == HoldStatus.Confirmed)
                throw new ConflictException("Confirmed holds cannot be released.");
            if (hold.Status is HoldStatus.Expired or HoldStatus.Released)
                throw new ConflictException($"Hold is already {hold.Status}.");

            await _db.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"classes\" WHERE id = @p0 FOR UPDATE", hold.ClassId);

            hold.Status = HoldStatus.Released;
            hold.Version++;
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (IsRetryablePostgresError(ex))
        {
            await transaction.RollbackAsync();
            throw;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<IEnumerable<UserHoldDto>> GetMyHoldsAsync(string studentId)
    {
        return await _db.SeatHolds
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.HeldAt)
            .Select(h => new UserHoldDto
            {
                Id = h.Id,
                ClassId = h.ClassId,
                StudentId = h.StudentId,
                Quantity = h.Quantity,
                Status = h.Status.ToString(),
                HeldAt = h.HeldAt,
                ExpiresAt = h.ExpiresAt,
                ConfirmedAt = h.ConfirmedAt,
                ClassName = _db.Classes.Where(c => c.Id == h.ClassId).Select(c => c.Name).FirstOrDefault()!
            })
            .ToListAsync();
    }

    private static SeatHoldDto ToDto(SeatHold h) => new()
    {
        Id = h.Id,
        ClassId = h.ClassId,
        StudentId = h.StudentId,
        Quantity = h.Quantity,
        Status = h.Status.ToString(),
        HeldAt = h.HeldAt,
        ExpiresAt = h.ExpiresAt,
        ConfirmedAt = h.ConfirmedAt
    };

    private static bool IsRetryablePostgresError(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException pg
            && (pg.SqlState == "40001" || pg.SqlState == "40P01");
    }
}
