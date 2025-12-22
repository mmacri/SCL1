# Security & Privacy Checklist

Use this checklist before production rollout.

## Authentication

- Enable Azure App Service Authentication (Easy Auth) or validate JWTs at the API layer.
- If using API keys, rotate keys and keep them in Azure Key Vault.
 - Restrict admin-only endpoints (e.g., `/api/reports/*`) to authenticated users.

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
