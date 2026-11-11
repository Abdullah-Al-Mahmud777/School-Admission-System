# syntax=docker.io/docker/dockerfile:1

#--------------------------------------------------------------------
# Build stage
#--------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore dependencies first (better layer caching).
COPY ["SchoolAdmissionSystem.csproj", "./"]
RUN dotnet restore "SchoolAdmissionSystem.csproj"

# Copy the rest of the source and publish.
COPY . .
RUN dotnet publish "SchoolAdmissionSystem.csproj" -c Release -o /app/publish --no-restore

#--------------------------------------------------------------------
# Runtime stage
#--------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# The API listens on port 8080 inside the container.
EXPOSE 8080

ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "SchoolAdmissionSystem.dll"]
