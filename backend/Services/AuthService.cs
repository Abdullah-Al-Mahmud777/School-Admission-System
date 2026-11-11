using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.DTOs;
using SchoolAdmissionSystem.Exceptions;

namespace SchoolAdmissionSystem.Services;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(AdminLoginDto dto);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;

    public AuthService(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        IConfiguration configuration)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> LoginAsync(AdminLoginDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var admin = await _db.AdminUsers
            .FirstOrDefaultAsync(a => a.Email.ToLower() == email);

        if (admin == null || !_passwordHasher.Verify(dto.Password, admin.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        var now = DateTimeOffset.UtcNow;
        admin.LastLoginAt = now;
        await _db.SaveChangesAsync();

        var expiryMinutes = _configuration.GetValue<int?>("Jwt:ExpiryMinutes") ?? 120;
        var expiresAt = now.AddMinutes(expiryMinutes);
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, admin.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, admin.Email),
            new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
            new Claim(ClaimTypes.Name, admin.FullName),
            new Claim(ClaimTypes.Email, admin.Email),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Email = admin.Email,
            FullName = admin.FullName,
            ExpiresAt = expiresAt
        };
    }
}
