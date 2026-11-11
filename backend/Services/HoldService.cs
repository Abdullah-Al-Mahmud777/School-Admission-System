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
    Task<SeatHoldDto> PayHoldAsync(Guid holdId, string studentId);
    Task<SeatHoldDto> CancelHoldAsync(Guid holdId, string? studentId = null, bool allowTerminalNoOp = false);
    Task ReleaseHoldAsync(Guid holdId, string? studentId = null);
    Task<IEnumerable<UserHoldDto>> GetMyHoldsAsync(string studentId);
    Task<IEnumerable<AdminApplicationDto>> GetAdminApplicationsAsync();
    Task<int> ExpireHoldsAsync();
}

public class HoldService : IHoldService
{
    private readonly AppDbContext _db;
    private const int MaxRetries = 3;

    public HoldService(AppDbContext db) => _db = db;

    public async Task<SeatHoldDto> HoldSeatsAsync(Guid classId, string studentId, CreateHoldDto dto, TimeSpan holdDuration)
    {
        if (dto.Quantity < 1)
            throw new BadRequestException("Quantity must be at least 1.");

        Exception? lastEx = null;
        for (var attempt = 0; attempt < MaxRetries; attempt++)
        {
            using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                await LockClassRowAsync(classId);

                var schoolClass = await _db.Classes.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == classId);
                if (schoolClass == null)
                    throw new NotFoundException($"Class {classId} not found.");

                var now = DateTimeOffset.UtcNow;
                var hasActiveOrConfirmedApplication = await HasActiveOrConfirmedApplicationAsync(
                    classId, studentId, now);

                if (hasActiveOrConfirmedApplication)
                {
                    throw new ConflictException(
                        "You already have an active or confirmed application for this class.");
                }

                var heldSeats = await GetOccupiedSeatCountAsync(classId, now);

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
        await ExpireHoldsAsync();

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

                await LockClassRowAsync(hold.ClassId);

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

    public async Task<SeatHoldDto> PayHoldAsync(Guid holdId, string studentId)
    {
        await ExpireHoldsAsync();

        using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            await LockHoldRowAsync(holdId);

            var hold = await _db.SeatHolds.FirstOrDefaultAsync(h => h.Id == holdId);
            if (hold == null)
                throw new NotFoundException($"Hold {holdId} not found.");
            if (hold.StudentId != studentId)
                throw new BadRequestException("Hold belongs to a different student.");
            if (hold.PaymentStatus == PaymentStatus.Paid)
                throw new ConflictException("Admission fee has already been paid.");
            if (hold.Status == HoldStatus.Released)
                throw new ConflictException("Released holds cannot be paid.");

            var now = DateTimeOffset.UtcNow;
            if (hold.Status == HoldStatus.Expired
                || (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now))
            {
                throw new ConflictException("Seat hold has expired. Payment is no longer available.");
            }

            if (hold.Status != HoldStatus.Held && hold.Status != HoldStatus.Confirmed)
                throw new ConflictException($"Hold is {hold.Status} and cannot be paid.");

            if (hold.Status == HoldStatus.Held)
            {
                hold.Status = HoldStatus.Confirmed;
                hold.ConfirmedAt = now;
            }

            hold.PaymentStatus = PaymentStatus.Paid;
            hold.AdmissionStatus = AdmissionStatus.Admitted;
            hold.PaidAt = now;
            hold.Version++;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return ToDto(hold);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<SeatHoldDto> CancelHoldAsync(Guid holdId, string? studentId = null, bool allowTerminalNoOp = false)
    {
        Exception? lastEx = null;
        for (var attempt = 0; attempt < MaxRetries; attempt++)
        {
            using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var hold = await _db.SeatHolds.FirstOrDefaultAsync(h => h.Id == holdId);
                if (hold == null)
                    throw new NotFoundException($"Application {holdId} not found.");
                if (studentId is not null && hold.StudentId != studentId)
                    throw new BadRequestException("Application belongs to a different student.");

                if (hold.Status == HoldStatus.Cancelled)
                {
                    await transaction.RollbackAsync();
                    return ToDto(hold);
                }

                if (hold.Status is HoldStatus.Released or HoldStatus.Expired)
                {
                    if (allowTerminalNoOp)
                    {
                        await transaction.RollbackAsync();
                        return ToDto(hold);
                    }

                    throw new ConflictException(
                        $"Application is already {hold.Status} and cannot be cancelled.");
                }

                if (hold.Status is not (HoldStatus.Held or HoldStatus.Confirmed))
                    throw new ConflictException(
                        $"Application is {hold.Status} and cannot be cancelled.");

                var previousHoldStatus = hold.Status;
                var previousPaymentStatus = hold.PaymentStatus;
                var previousAdmissionStatus = hold.AdmissionStatus;

                // Lock the class row first so freed capacity is published atomically
                // against concurrent hold creation.
                await LockClassRowAsync(hold.ClassId);

                var now = DateTimeOffset.UtcNow;

                hold.Status = HoldStatus.Cancelled;
                if (hold.PaymentStatus == PaymentStatus.Paid)
                    hold.PaymentStatus = PaymentStatus.Refunded;
                hold.AdmissionStatus = AdmissionStatus.Cancelled;
                hold.CancelledAt = now;
                hold.Version++;

                var cancellationExists = await _db.Cancellations
                    .AnyAsync(c => c.HoldId == hold.Id);

                if (!cancellationExists)
                {
                    _db.Cancellations.Add(new ApplicationCancellation
                    {
                        Id = Guid.NewGuid(),
                        HoldId = hold.Id,
                        ClassId = hold.ClassId,
                        StudentId = hold.StudentId,
                        Quantity = hold.Quantity,
                        PreviousHoldStatus = previousHoldStatus,
                        PreviousPaymentStatus = previousPaymentStatus,
                        PreviousAdmissionStatus = previousAdmissionStatus,
                        NewHoldStatus = hold.Status,
                        NewPaymentStatus = hold.PaymentStatus,
                        NewAdmissionStatus = hold.AdmissionStatus,
                        CancelledAt = now
                    });
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return ToDto(hold);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                await transaction.RollbackAsync();
                var existing = await _db.SeatHolds
                    .AsNoTracking()
                    .FirstOrDefaultAsync(h => h.Id == holdId);
                if (existing?.Status == HoldStatus.Cancelled)
                    return ToDto(existing);
                throw new ConflictException("Application has already been cancelled.");
            }
            catch (DbUpdateException ex) when (IsRetryablePostgresError(ex))
            {
                await transaction.RollbackAsync();
                lastEx = ex;
                if (attempt == MaxRetries - 1) throw;
                await Task.Delay(100 * (attempt + 1));
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                throw new ConflictException("Application was modified by another operation. Please try again.");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        throw new InvalidOperationException("Failed to cancel application after retries.", lastEx);
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

            if (hold.Status is HoldStatus.Released or HoldStatus.Expired or HoldStatus.Cancelled)
            {
                await transaction.RollbackAsync();
                return;
            }

            if (hold.PaymentStatus == PaymentStatus.Paid || hold.AdmissionStatus == AdmissionStatus.Admitted)
                throw new ConflictException("Paid admissions cannot be released. Cancel the application instead.");
            if (hold.Status == HoldStatus.Confirmed)
                throw new ConflictException("Confirmed applications cannot be released. Cancel the application instead.");

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
        await ExpireHoldsAsync();

        var holds = await _db.SeatHolds
            .AsNoTracking()
            .Where(h => h.StudentId == studentId && h.Status != HoldStatus.Released)
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
                PaymentStatus = h.PaymentStatus.ToString(),
                AdmissionStatus = h.AdmissionStatus.ToString(),
                PaidAt = h.PaidAt,
                CancelledAt = h.CancelledAt,
                ClassName = _db.Classes.Where(c => c.Id == h.ClassId).Select(c => c.Name).FirstOrDefault()!
            })
            .ToListAsync();

        // One application per class, preferring an active application over a cancelled/expired one.
        return holds
            .GroupBy(h => h.ClassId)
            .Select(group =>
            {
                var confirmed = group.Where(h => h.Status == nameof(HoldStatus.Confirmed)).ToList();
                var held = group.Where(h => h.Status == nameof(HoldStatus.Held)).ToList();
                var expired = group.Where(h => h.Status == nameof(HoldStatus.Expired)).ToList();
                var cancelled = group.Where(h => h.Status == nameof(HoldStatus.Cancelled)).ToList();
                var paid = group.Where(h => h.PaymentStatus == nameof(PaymentStatus.Paid)).ToList();
                var isConfirmed = confirmed.Count > 0;
                var isHeld = held.Count > 0;
                var isCancelled = cancelled.Count > 0;

                var primary = paid
                    .OrderByDescending(h => h.PaidAt ?? h.ConfirmedAt ?? h.HeldAt)
                    .FirstOrDefault()
                    ?? confirmed
                        .OrderByDescending(h => h.ConfirmedAt ?? h.HeldAt)
                        .FirstOrDefault()
                    ?? held.OrderByDescending(h => h.HeldAt).FirstOrDefault()
                    ?? cancelled
                        .OrderByDescending(h => h.CancelledAt ?? h.HeldAt)
                        .FirstOrDefault()
                    ?? expired.OrderByDescending(h => h.HeldAt).First();

                var active = isConfirmed
                    ? confirmed.Concat(held).ToList()
                    : isHeld ? held
                    : isCancelled ? cancelled
                    : expired;

                return new UserHoldDto
                {
                    Id = primary.Id,
                    ClassId = primary.ClassId,
                    StudentId = primary.StudentId,
                    Quantity = isConfirmed
                        ? confirmed.Sum(h => h.Quantity) + held.Sum(h => h.Quantity)
                        : isHeld ? held.Sum(h => h.Quantity)
                        : isCancelled ? cancelled.Sum(h => h.Quantity)
                        : primary.Quantity,
                    Status = (isConfirmed
                        ? nameof(HoldStatus.Confirmed)
                        : isHeld ? nameof(HoldStatus.Held)
                        : isCancelled ? nameof(HoldStatus.Cancelled)
                        : nameof(HoldStatus.Expired)).ToUpperInvariant(),
                    HeldAt = active.Min(h => h.HeldAt),
                    ExpiresAt = primary.ExpiresAt,
                    ConfirmedAt = isConfirmed ? confirmed.Max(h => h.ConfirmedAt) : primary.ConfirmedAt,
                    CancelledAt = primary.CancelledAt,
                    PaymentStatus = primary.PaymentStatus,
                    AdmissionStatus = primary.AdmissionStatus,
                    PaidAt = primary.PaidAt,
                    ClassName = primary.ClassName
                };
            })
            .OrderByDescending(h => h.HeldAt)
            .ToList();
    }

    public async Task<IEnumerable<AdminApplicationDto>> GetAdminApplicationsAsync()
    {
        await ExpireHoldsAsync();

        return await _db.SeatHolds
            .AsNoTracking()
            .OrderByDescending(h => h.HeldAt)
            .Select(h => new AdminApplicationDto
            {
                Id = h.Id,
                ClassId = h.ClassId,
                StudentId = h.StudentId,
                Quantity = h.Quantity,
                Status = h.Status.ToString().ToUpperInvariant(),
                HeldAt = h.HeldAt,
                ExpiresAt = h.ExpiresAt,
                ConfirmedAt = h.ConfirmedAt,
                PaymentStatus = h.PaymentStatus.ToString(),
                AdmissionStatus = h.AdmissionStatus.ToString(),
                PaidAt = h.PaidAt,
                CancelledAt = h.CancelledAt,
                ClassName = h.Class.Name,
                ClassShift = h.Class.Shift
            })
            .ToListAsync();
    }

    public async Task<int> ExpireHoldsAsync()
    {
        var now = DateTimeOffset.UtcNow;
        if (IsPostgres())
        {
            return await _db.SeatHolds
                .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(h => h.Status, HoldStatus.Expired)
                    .SetProperty(h => h.Version, h => h.Version + 1));
        }

        var expiring = await _db.SeatHolds
            .Where(h => h.Status == HoldStatus.Held)
            .ToListAsync();

        var expiredCount = 0;
        foreach (var hold in expiring.Where(h => h.ExpiresAt <= now))
        {
            hold.Status = HoldStatus.Expired;
            hold.Version++;
            expiredCount++;
        }

        if (expiredCount > 0)
            await _db.SaveChangesAsync();

        return expiredCount;
    }

    private static SeatHoldDto ToDto(SeatHold h) => new()
    {
        Id = h.Id,
        ClassId = h.ClassId,
        StudentId = h.StudentId,
        Quantity = h.Quantity,
        Status = h.Status.ToString().ToUpperInvariant(),
        HeldAt = h.HeldAt,
        ExpiresAt = h.ExpiresAt,
        ConfirmedAt = h.ConfirmedAt,
        PaymentStatus = h.PaymentStatus.ToString(),
        AdmissionStatus = h.AdmissionStatus.ToString(),
        PaidAt = h.PaidAt,
        CancelledAt = h.CancelledAt
    };

    private static bool IsRetryablePostgresError(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException pg
            && (pg.SqlState == "40001" || pg.SqlState == "40P01");
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException pg && pg.SqlState == "23505";
    }

    private async Task LockClassRowAsync(Guid classId)
    {
        var sql = IsPostgres()
            ? "SELECT 1 FROM \"classes\" WHERE id = @p0 FOR UPDATE"
            : "SELECT 1 FROM \"classes\" WHERE id = @p0";
        await _db.Database.ExecuteSqlRawAsync(sql, classId);
    }

    private async Task LockHoldRowAsync(Guid holdId)
    {
        var sql = IsPostgres()
            ? "SELECT 1 FROM \"seat_holds\" WHERE id = @p0 FOR UPDATE"
            : "SELECT 1 FROM \"seat_holds\" WHERE id = @p0";
        await _db.Database.ExecuteSqlRawAsync(sql, holdId);
    }

    private bool IsPostgres()
    {
        return _db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task<bool> HasActiveOrConfirmedApplicationAsync(
        Guid classId,
        string studentId,
        DateTimeOffset now)
    {
        if (IsPostgres())
        {
            var hasConfirmedApplication = await _db.SeatHolds.AnyAsync(h =>
                h.ClassId == classId
                && h.StudentId == studentId
                && h.Status == HoldStatus.Confirmed);
            var hasUnexpiredHeldApplication = await _db.SeatHolds.AnyAsync(h =>
                h.ClassId == classId
                && h.StudentId == studentId
                && h.Status == HoldStatus.Held
                && h.ExpiresAt > now);
            return hasConfirmedApplication || hasUnexpiredHeldApplication;
        }

        var studentClassHolds = await _db.SeatHolds
            .AsNoTracking()
            .Where(h => h.ClassId == classId && h.StudentId == studentId)
            .Select(h => new { h.Status, h.ExpiresAt })
            .ToListAsync();

        return studentClassHolds.Any(h =>
            h.Status == HoldStatus.Confirmed
            || (h.Status == HoldStatus.Held && h.ExpiresAt > now));
    }

    private async Task<int> GetOccupiedSeatCountAsync(Guid classId, DateTimeOffset now)
    {
        if (IsPostgres())
        {
            return await _db.SeatHolds
                .Where(h => h.ClassId == classId
                    && (h.Status == HoldStatus.Confirmed
                        || (h.Status == HoldStatus.Held && h.ExpiresAt > now)))
                .SumAsync(h => (int?)h.Quantity) ?? 0;
        }

        var classHolds = await _db.SeatHolds
            .AsNoTracking()
            .Where(h => h.ClassId == classId)
            .Select(h => new { h.Status, h.ExpiresAt, h.Quantity })
            .ToListAsync();

        return classHolds
            .Where(h => h.Status == HoldStatus.Confirmed
                || (h.Status == HoldStatus.Held && h.ExpiresAt > now))
            .Sum(h => h.Quantity);
    }
}
