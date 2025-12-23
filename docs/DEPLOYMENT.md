# Deployment Guide (GitHub + Azure)

This project has two parts:

1) Static site (HTML/CSS/JS) hosted on GitHub Pages.
2) Lightweight API (Node/Express) hosted on Azure App Service and backed by Azure SQL.

Use this guide to run locally, deploy on GitHub Pages, and deploy the API + database on Azure.

---

## 1) Local Development

### Static site

Serve the repository root with any static web server:

```powershell
# from repo root
python -m http.server 8080
```

Then open:

- `http://localhost:8080/index.html`
- `http://localhost:8080/csir/index.html`

### API

The API lives in `api/` and uses Azure SQL.

```powershell
cd api
npm install
copy .env.example .env
# edit .env with your Azure SQL connection string
npm run dev
```

Default API URL:

```
http://localhost:5000
```

---

## 2) Database (Azure SQL)

### Create Azure SQL Server + Database

1. Create an Azure SQL Server.
2. Create a database (e.g., `scl-training`).
3. Add your local IP to the SQL firewall rules.

### Apply Schema

Use the schema in:

```
api/sql/schema.sql
```

You can apply it with Azure Data Studio or the Azure portal query editor.

### Seed Courses

Run:

```
api/sql/seed.sql
```

This inserts the initial CSIR course row.

---

## 3) API Configuration

Set these environment variables in Azure App Service or local `.env`:

```
AZURE_SQL_CONNECTION_STRING=Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<db>;Persist Security Info=False;User ID=<user>;Password=<password>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
PORT=5000
CORS_ORIGINS=https://mmacri.github.io,http://localhost:8080
```

Notes:

- `CORS_ORIGINS` is comma-separated.
- Set `PORT` to the App Service assigned port if needed.
- If using Easy Auth across origins, ensure your frontend sends cookies (`credentials: "include"`).

---

## 4) API Endpoints

Base URL: `https://<your-api-host>/api`

### POST /api/learners
Create or lookup learner by email.

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
Create or resume enrollment by course + cycle year.

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
  "courseCode": "CSIR-2025",
  "cycleYear": 2025,
  "status": "in_progress",
  "lastStepId": "mission-control",
  "lastActivity": "2025-01-02T12:34:56Z"
}
```

### PATCH /api/enrollments/:id
Update last step and activity time.

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
Issue a certificate for a completed enrollment.

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

### GET /api/courses
Used by the landing page to list active courses.

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

---

## 5) GitHub Pages (Static Site)

1. Push to GitHub.
2. In GitHub repo settings, enable Pages for the `main` branch and `/` root.
3. Site URL will be:
   ```
   https://<org>.github.io/<repo>/
   ```

If you change the repo name, update any hardcoded links to match the new base path.

---

## 6) Frontend API Base Configuration

The frontend expects an API base URL in one of these locations:

1) `window.SCL_API_BASE` set by an inline script.
2) `localStorage` key: `scl_api_base`.

### Option A: Inline config (recommended)

Add this to pages that call the API:

```html
<script>
  window.SCL_API_BASE = "https://<your-api-host>";
</script>
```

### Option B: LocalStorage

Run once in the browser console:

```js
localStorage.setItem('scl_api_base', 'https://<your-api-host>');
```

### Course landing page

The root `index.html` uses `GET /api/courses` to list training entries. If the API is unavailable, it falls back to a single CSIR course card.

---

## 7) Azure App Service (API)

### Create App Service

1. Create a new App Service (Node 20+).
2. Set the deployment source to GitHub.
3. Point to the `api/` folder in the repo (or use a separate repo for API only).

### App Settings

Add these in **Configuration**:

- `AZURE_SQL_CONNECTION_STRING`
- `CORS_ORIGINS`
- `PORT` (optional)

### Health Check (optional)

`GET /api/health`

Use this for App Service health checks.

### Easy Auth (App Service Authentication)

Enable Easy Auth for production hardening:

1. In Azure Portal, open your App Service.
2. Go to **Authentication**.
3. Click **Add identity provider**.
4. Choose **Microsoft** (Azure AD).
5. Create or select an App Registration.
6. Set **Require authentication**.
7. Save.

Recommended configuration:

- **Unauthenticated requests**: HTTP 401.
- **Token store**: enabled.
- **Allowed token audiences**: your App Registration Application ID URI.

#### Admin and Power Users Groups

1. In Microsoft Entra ID, create two groups:
   - `SCL-Training-Admins`
   - `SCL-Training-PowerUsers`
2. Add `michael.macri@idma3.com` to `SCL-Training-Admins`.
3. Add other users as needed to either group.
4. In the App Registration, enable **Group claims** in tokens:
   - Token configuration -> Add groups claim -> "Security groups".
5. Add the group object IDs to the API config:
   - `ADMIN_GROUP_IDS=<admin-group-object-id>`
   - `POWER_GROUP_IDS=<power-group-object-id>`

#### Microsoft Graph (Admin management)

The admin user management page uses Microsoft Graph application permissions.

1. In the App Registration, add **Application permissions**:
   - `Group.ReadWrite.All`
   - `User.Read.All`
2. Grant **Admin consent**.
3. Set these App Service settings:
   - `GRAPH_TENANT_ID`
   - `GRAPH_CLIENT_ID`
   - `GRAPH_CLIENT_SECRET`

These credentials are used only by the API to manage group membership.

Admin-only endpoints (like `/api/reports/*`) require membership in the admin group or inclusion in `ADMIN_EMAILS`.

Frontend usage:

- When Easy Auth is enabled, requests to `/api/*` require a signed-in user.
- Use Azure AD sign-in to grant access to admin pages such as `csir/admin-report.html`.

If you need to allow public endpoints (like `/api/courses`), configure **Allowed paths** in Authentication settings, or add a separate public API instance.

---

## 8) Monthly Reporting

Use Azure SQL to query enrollments by name/email:

```sql
SELECT
  l.FullName,
  l.Email,
  l.RoleSelected,
  c.CourseName,
  e.CycleYear,
  e.Status,
  e.LastStepId,
  e.StartDate,
  e.LastActivity
FROM Enrollments e
JOIN Learners l ON e.LearnerId = l.LearnerId
JOIN Courses c ON e.CourseId = c.CourseId
ORDER BY e.StartDate DESC;
```

Export to CSV from Azure Data Studio or the Azure Portal.

---

## 9) Adding a New Course or Yearly Re-Certification

1. Insert a new course row with a new `CourseCode` (ex: `CSIR-2026`).
2. Update `pack.json` on the frontend if the content changes.
3. Start a new enrollment per learner with a new `CycleYear`.

This keeps yearly completions and certificates separate.
