# API Reference

Base URL:

```
https://<your-api-host>
```

All endpoints are JSON and use UTF‑8.

## Authentication (Recommended)

For production, add one of:

- Azure App Service Authentication (Easy Auth)
- API key header
- Azure AD App Registration + JWT validation

This repo ships without auth for simplicity. If you enable Easy Auth, send cookies by setting `credentials: "include"` in `fetch`.

## Error Format

```
{ "error": "Message" }
```

## Endpoints

### GET /api/health

Response:
```json
{ "ok": true }
```

### GET /api/courses

Response:
```json
[
  {
    "courseCode": "CSIR-2025",
    "courseName": "Seattle City Light - OT Cyber Security Incident Response (CSIR) Training",
    "versionLabel": "2025",
    "isActive": true
  }
]
```

### GET /api/reports/monthly

Query params:

- `year` (YYYY)
- `month` (1-12)

Response:
```json
{
  "year": 2025,
  "month": 1,
  "count": 5,
  "records": [
    {
      "FullName": "Jane Doe",
      "Email": "jane.doe@example.com",
      "RoleSelected": "all-staff",
      "CourseName": "Seattle City Light - OT Cyber Security Incident Response (CSIR) Training",
      "CycleYear": 2025,
      "Status": "in_progress",
      "LastStepId": "definitions",
      "StartDate": "2025-01-02T12:34:56Z",
      "LastActivity": "2025-01-03T09:12:00Z"
    }
  ]
}
```

### GET /api/reports/summary

Query params:

- `year` (YYYY)
- `month` (1-12)

Response:
```json
{
  "year": 2025,
  "month": 1,
  "totals": [
    { "Status": "in_progress", "Count": 12 },
    { "Status": "completed", "Count": 3 }
  ]
}
```

### GET /api/admin/groups

Response:
```json
[
  { "id": "group-id", "displayName": "SCL-Training-Admins" }
]
```

### GET /api/admin/groups/:id/members

Response:
```json
[
  { "id": "user-id", "displayName": "Jane Doe", "mail": "jane.doe@example.com" }
]
```

### POST /api/admin/groups/:id/members

Request:
```json
{ "email": "user@company.com" }
```

Response:
```json
{ "added": true, "userId": "user-id" }
```

### POST /api/learners

Request:
```json
{
  "email": "jane.doe@example.com",
  "fullName": "Jane Doe",
  "roleSelected": "all-staff"
}
```

Response:
```json
{
  "learnerId": "uuid",
  "email": "jane.doe@example.com",
  "fullName": "Jane Doe",
  "roleSelected": "all-staff"
}
```

### POST /api/enrollments

Request:
```json
{
  "email": "jane.doe@example.com",
  "courseCode": "CSIR-2025",
  "cycleYear": 2025
}
```

Response:
```json
{
  "enrollmentId": "uuid",
  "courseId": "uuid",
  "cycleYear": 2025,
  "status": "in_progress",
  "lastStepId": "mission-control",
  "lastActivity": "2025-01-02T12:34:56Z"
}
```

### PATCH /api/enrollments/:id

Request:
```json
{
  "lastStepId": "definitions",
  "lastActivity": "2025-01-02T12:34:56Z"
}
```

Response:
```json
{
  "enrollmentId": "uuid",
  "lastStepId": "definitions",
  "lastActivity": "2025-01-02T12:34:56Z"
}
```

### POST /api/certificates

Request:
```json
{
  "enrollmentId": "uuid",
  "completionDate": "2025-01-02T12:34:56Z"
}
```

Response:
```json
{
  "certificateId": "uuid",
  "certificateCode": "abcd1234ef567890",
  "issuedAt": "2025-01-02T12:35:12Z"
}
```
