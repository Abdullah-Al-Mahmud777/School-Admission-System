# School Admission System

School Admission System includes:
- **Backend**: .NET 8 Web API + EF Core + PostgreSQL
- **Frontend**: React (Vite)
- **Database**: PostgreSQL 15

## Run with Docker

### Prerequisites
- Docker Desktop / Docker Engine with Compose v2

### Start all services
From repository root:

```bash
docker compose up --build
```

### Service URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

### Stop services
```bash
docker compose down
```

### Stop and remove DB volume (data reset)
```bash
docker compose down -v
```

## Local development (without Docker)

### Backend
```bash
cd backend
dotnet restore
dotnet run
```

### Frontend
```bash
cd frontend
npm ci
npm run dev
```

## Automated tests

### Backend tests
```bash
cd backend
dotnet test
```

### Frontend quality checks
```bash
cd frontend
npm run lint
npm run build
```

## Notes
- `HOLD_DURATION_SECONDS` controls hold expiry duration. Default is `600` seconds.
- `X-Student-Id` header is required for student-facing hold/application endpoints.
