# API README

This folder hosts a minimal API for learner registration, enrollments, progress, and certificates.

## Setup

```powershell
cd api
npm install
copy .env.example .env
npm run dev
```

## Environment Variables

- `AZURE_SQL_CONNECTION_STRING` (required)
- `PORT` (default: 5000)
- `CORS_ORIGINS` (comma-separated list of allowed origins)

## Endpoints

Base URL: `/api`

- `POST /api/learners`
- `POST /api/enrollments`
- `PATCH /api/enrollments/:id`
- `POST /api/certificates`
- `GET /api/courses`

See `docs/DEPLOYMENT.md` for example payloads and responses.

## Frontend API Base

Set one of:

- `window.SCL_API_BASE = "https://<your-api-host>"`
- `localStorage.setItem('scl_api_base', 'https://<your-api-host>')`

See `docs/DEPLOYMENT.md` and `docs/API.md`.

## Schema

Apply the SQL schema in:

```
api/sql/schema.sql
```

Seed the initial course with:

```
api/sql/seed.sql
```
