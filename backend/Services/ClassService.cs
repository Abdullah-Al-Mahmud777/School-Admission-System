using System.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Exceptions;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Services;

public interface IClassService
{
    Task<ClassDto> CreateClassAsync(CreateClassDto dto);
    Task<IEnumerable<ClassDto>> GetAllClassesAsync();
    Task<ClassDto?> GetClassByIdAsync(Guid classId);
    Task<ClassDto> UpdateClassAsync(Guid classId, UpdateClassDto dto);
    Task DeleteClassAsync(Guid classId);
}

public class ClassService : IClassService
{
    private const int MaxSeatCapacity = 10000;
    private readonly AppDbContext _db;

    public ClassService(AppDbContext db) => _db = db;

    public async Task<ClassDto> CreateClassAsync(CreateClassDto dto)
    {
        var (name, shift) = NormalizeAndValidate(dto.Name, dto.Shift, dto.TotalSeats);

        await EnsureUniqueAsync(name, shift, null);

        var entity = new SchoolClass
        {
            Id = Guid.NewGuid(),
            Name = name,
            Shift = shift,
            TotalSeats = dto.TotalSeats,
            CreatedAt = DateTimeOffset.UtcNow,
            Version = 1
        };

        _db.Classes.Add(entity);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new ConflictException("A class with the same name and shift already exists.");
        }

        return ToDto(entity, 0, 0);
    }

    public async Task<IEnumerable<ClassDto>> GetAllClassesAsync()
    {
        var now = DateTimeOffset.UtcNow;
        return await _db.Classes
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Shift)
            .Select(c => new ClassDto
            {
                Id = c.Id,
                Name = c.Name,
                Shift = c.Shift,
                TotalSeats = c.TotalSeats,
                HeldSeats = _db.SeatHolds
                    .Where(h => h.ClassId == c.Id
                        && h.Status == HoldStatus.Held
                        && h.ExpiresAt > now)
                    .Sum(h => (int?)h.Quantity) ?? 0,
                ConfirmedSeats = _db.SeatHolds
                    .Where(h => h.ClassId == c.Id && h.Status == HoldStatus.Confirmed)
                    .Sum(h => (int?)h.Quantity) ?? 0,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ClassDto?> GetClassByIdAsync(Guid classId)
    {
        var now = DateTimeOffset.UtcNow;
        var c = await _db.Classes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == classId);
        if (c == null) return null;

        var held = await _db.SeatHolds
            .Where(h => h.ClassId == classId
                && h.Status == HoldStatus.Held
                && h.ExpiresAt > now)
            .SumAsync(h => (int?)h.Quantity) ?? 0;
        var confirmed = await _db.SeatHolds
            .Where(h => h.ClassId == classId && h.Status == HoldStatus.Confirmed)
            .SumAsync(h => (int?)h.Quantity) ?? 0;

        return ToDto(c, held, confirmed);
    }

    public async Task<ClassDto> UpdateClassAsync(Guid classId, UpdateClassDto dto)
    {
        var (name, shift) = NormalizeAndValidate(dto.Name, dto.Shift, dto.TotalSeats);

        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"classes\" WHERE id = @p0 FOR UPDATE", classId);

            var entity = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
            if (entity == null)
                throw new NotFoundException($"Class {classId} not found.");

            await EnsureUniqueAsync(name, shift, classId);

            var now = DateTimeOffset.UtcNow;
            var held = await _db.SeatHolds
                .Where(h => h.ClassId == classId
                    && h.Status == HoldStatus.Held
                    && h.ExpiresAt > now)
                .SumAsync(h => (int?)h.Quantity) ?? 0;
            var confirmed = await _db.SeatHolds
                .Where(h => h.ClassId == classId && h.Status == HoldStatus.Confirmed)
                .SumAsync(h => (int?)h.Quantity) ?? 0;
            var occupied = held + confirmed;

            if (dto.TotalSeats < occupied)
                throw new ConflictException(
                    $"Seat capacity cannot be reduced below {occupied} currently held or confirmed seat(s).");

            entity.Name = name;
            entity.Shift = shift;
            entity.TotalSeats = dto.TotalSeats;
            entity.Version++;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return ToDto(entity, held, confirmed);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            await transaction.RollbackAsync();
            throw new ConflictException("A class with the same name and shift already exists.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteClassAsync(Guid classId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"classes\" WHERE id = @p0 FOR UPDATE", classId);

            var entity = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
            if (entity == null)
                throw new NotFoundException($"Class {classId} not found.");

            var hasApplications = await _db.SeatHolds.AnyAsync(h => h.ClassId == classId)
                || await _db.Cancellations.AnyAsync(c => c.ClassId == classId);
            if (hasApplications)
                throw new ConflictException("Cannot delete a class that has existing applications.");

            _db.Classes.Remove(entity);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task EnsureUniqueAsync(string name, string shift, Guid? excludeClassId)
    {
        var normalizedName = name.ToLower();
        var normalizedShift = shift.ToLower();

        var duplicate = await _db.Classes.AnyAsync(c =>
            (excludeClassId == null || c.Id != excludeClassId)
            && c.Name.ToLower() == normalizedName
            && c.Shift.ToLower() == normalizedShift);

        if (duplicate)
            throw new ConflictException("A class with the same name and shift already exists.");
    }

    private static (string Name, string Shift) NormalizeAndValidate(string name, string shift, int totalSeats)
    {
        var normalizedName = (name ?? string.Empty).Trim();
        var normalizedShift = (shift ?? string.Empty).Trim();

        if (normalizedName.Length == 0)
            throw new BadRequestException("Class name is required.");
        if (normalizedName.Length > 200)
            throw new BadRequestException("Class name must be at most 200 characters.");
        if (normalizedShift.Length == 0)
            throw new BadRequestException("Shift is required.");
        if (normalizedShift.Length > 50)
            throw new BadRequestException("Shift must be at most 50 characters.");
        if (totalSeats < 1 || totalSeats > MaxSeatCapacity)
            throw new BadRequestException($"Seat capacity must be between 1 and {MaxSeatCapacity}.");

        return (normalizedName, normalizedShift);
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException pg && pg.SqlState == "23505";
    }

    private static ClassDto ToDto(SchoolClass c, int held, int confirmed) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Shift = c.Shift,
        TotalSeats = c.TotalSeats,
        HeldSeats = held,
        ConfirmedSeats = confirmed,
        CreatedAt = c.CreatedAt
    };
}
