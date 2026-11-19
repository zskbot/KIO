# KIO.AI Full-stack Studio and Full-packer

## Implemented foundations

- Account-owned projects, per-user unique slugs, project files and private package artifacts.
- Project file APIs enforce ownership, path traversal checks, secret-file exclusions and bounded text-file sizes.
- Full-packer v1 produces a ZIP archive with a `KIO-PACKAGE.json` manifest and SHA-256 checksum. It does not execute project code.
- Email verification and password reset use cryptographically random tokens; only SHA-256 token hashes are stored, tokens expire after 30 minutes and are single-use.
- Password reset updates the bcrypt password hash and increments the session version, invalidating existing JWT sessions.
- Authentication request throttling uses PostgreSQL-backed rate-limit buckets.
- Email delivery is provided through the Resend HTTP API adapter. Delivery is disabled until all required environment variables are configured.
- Health endpoint reports database, AI provider, auth secret and email-provider configuration without exposing credentials.

## API

- `GET/POST /api/projects`
- `GET/POST /api/projects/:projectId/files`
- `POST /api/projects/:projectId/pack`
- `GET /api/artifacts/:artifactId`
- `POST /api/auth/verification/request`
- `POST /api/auth/verification/confirm`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`

All private project and verification-request endpoints require a valid KIO session. Password-reset request responses do not reveal whether an email address has an account.

## Required environment

Copy `.env.example` and configure:

- `DATABASE_URL`: PostgreSQL connection string.
- `KIO_AUTH_SECRET`: random secret of at least 32 characters.
- `KIO_APP_URL`: canonical HTTPS origin used to build email links.
- `RESEND_API_KEY`: Resend API key.
- `KIO_EMAIL_FROM`: sender identity verified with the email provider.
- `KIO_LLM_API_KEY`: server-side AI provider key.

Never commit real values. Configure them in the deployment platform's secret manager.

## Database update

For a disposable development or preview database only:

```sh
npx prisma db push
npm run build
```

For production, create and review a Prisma migration from the schema change, back up PostgreSQL, and apply the migration through a controlled release. Do not run an unreviewed `db push` against production.

## Production gaps and release gates

This is a substantial implementation slice, not a claim that all KIO.AI modules are production-ready. Before public launch:

- Add automated unit, integration and end-to-end tests, including token replay, expiry, ownership isolation and archive integrity.
- Apply durable rate limiting to login, registration, AI inference, project writes and packaging; current throttling covers password-reset and verification requests.
- Add a real project editor, AI model/provider administration, usage metering and agent/skill lifecycle.
- Move artifact bytes to object storage with retention, cleanup and backup/restore drills.
- Implement isolated, resource-limited build workers for untrusted project code. Never run customer build scripts in the Next.js web process.
- Add release/version management, publish approvals, audit events, deployment-provider integration and preview smoke tests.
- Complete security/dependency review and verify production database, email, AI provider, backups, monitoring and rollback.

No production deployment or merge is performed by this branch.
