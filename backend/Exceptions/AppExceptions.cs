namespace SchoolAdmissionSystem.Exceptions;

public abstract class AppException : Exception
{
    protected AppException(string message) : base(message) { }

    public abstract int StatusCode { get; }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message) { }
    public override int StatusCode => 404;
}

public class BadRequestException : AppException
{
    public BadRequestException(string message) : base(message) { }
    public override int StatusCode => 400;
}

public class ConflictException : AppException
{
    public ConflictException(string message) : base(message) { }
    public override int StatusCode => 409;
}

public class InsufficientSeatsException : AppException
{
    public InsufficientSeatsException(string message) : base(message) { }
    public override int StatusCode => 409;
}

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message) : base(message) { }
    public override int StatusCode => 401;
}
