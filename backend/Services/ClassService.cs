using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Services;

public interface IClassService
{
    Task<ClassDto> CreateClassAsync(CreateClassDto dto);
    Task<IEnumerable<ClassDto>> GetAllClassesAsync();
    Task<ClassDto?> GetClassByIdAsync(Guid classId);
}

public class ClassService : IClassService
{
    private readonly AppDbContext _db;
    public ClassService(AppDbContext db) => _db = db;

    public async Task<ClassDto> CreateClassAsync(CreateClassDto dto)
    {
        var entity = new SchoolClass
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            TotalSeats = dto.TotalSeats,
            CreatedAt = DateTimeOffset.UtcNow,
            Version = 1
        };
        _db.Classes.Add(entity);
        await _db.SaveChangesAsync();
        return ToDto(entity, 0);
    }

    public async Task<IEnumerable<ClassDto>> GetAllClassesAsync()
    {
        var now = DateTimeOffset.UtcNow;
        return await _db.Classes
            .OrderBy(c => c.Name)
            .Select(c => new ClassDto
            {
                Id = c.Id,
                Name = c.Name,
                TotalSeats = c.TotalSeats,
                AvailableSeats = c.TotalSeats - _db.SeatHolds
                    .Where(h => h.ClassId == c.Id
                        && (h.Status == HoldStatus.Confirmed
                            || (h.Status == HoldStatus.Held && h.ExpiresAt > now)))
                    .Sum(h => (int?)h.Quantity) ?? 0,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ClassDto?> GetClassByIdAsync(Guid classId)
    {
        var now = DateTimeOffset.UtcNow;
        var c = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
        if (c == null) return null;
        var held = await _db.SeatHolds
            .Where(h => h.ClassId == classId
                && (h.Status == HoldStatus.Confirmed
                    || (h.Status == HoldStatus.Held && h.ExpiresAt > now)))
            .SumAsync(h => (int?)h.Quantity) ?? 0;
        return ToDto(c, held);
    }

    private static ClassDto ToDto(SchoolClass c, int held) => new()
    {
        Id = c.Id,
        Name = c.Name,
        TotalSeats = c.TotalSeats,
        AvailableSeats = c.TotalSeats - held,
        CreatedAt = c.CreatedAt
    };
}
