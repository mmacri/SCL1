# Security & Privacy Checklist

Use this checklist before production rollout.

## Authentication

- Enable Azure App Service Authentication (Easy Auth) or validate JWTs at the API layer.
- If using API keys, rotate keys and keep them in Azure Key Vault.
- Restrict admin-only endpoints (e.g., `/api/reports/*`) to authenticated users.
- Use group-based access via Entra ID groups (Admins, Power Users) for least-privilege access.

## Microsoft Graph Permissions

- Limit app registration permissions to `Group.ReadWrite.All` and `User.Read.All`.
- Store `GRAPH_CLIENT_SECRET` in Azure Key Vault and reference it via App Service configuration.

## Transport Security

- Enforce HTTPS only.
- Use HSTS in App Service.

## Data Protection

- Store minimal PII (name, email, role).
- Encrypt at rest (Azure SQL default).
- Limit database permissions to the minimum required.

## CORS

- Restrict `CORS_ORIGINS` to known hosts.
- Avoid `*` in production.

## Logging

- Log API errors without leaking PII.
- Use Application Insights for telemetry.

## Backup & Retention

- Enable Azure SQL backups and configure retention.
- Define data retention for learner data and certificates.

## Compliance

- Publish a privacy notice for learners.
- Define how long to keep learner progress and certificates.
