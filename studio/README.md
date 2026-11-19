# KIO.AI Studio

A full-stack Next.js App Router application alongside the existing KIO.AI site.

## Included

- Next.js 15 + React 19 workspace UI.
- PostgreSQL persistence through Prisma for users, conversations, messages, tasks, projects, files and package artifacts.
- Email/password registration and login; bcrypt password hashes and signed HTTP-only session cookies.
- Email verification and password recovery with hashed, expiring, single-use tokens.
- Session versioning so a successful password reset invalidates previously issued sessions.
- Optional Resend email delivery adapter; provider credentials remain server-side.
- PostgreSQL-backed throttling for verification and password-reset requests.
- AI chat adapter and skill routing.
- Full-packer v1: per-user projects, safe text-file storage, ZIP packaging, manifest, SHA-256 checksum and private artifact downloads.
- Health endpoint for database, AI, auth-secret and email-provider readiness.
- Pull-request CI for Prisma generation, TypeScript checks and Next.js production build.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to PostgreSQL.
3. Generate `KIO_AUTH_SECRET` with `openssl rand -base64 32`.
4. Configure `KIO_APP_URL`, `KIO_EMAIL_FROM` and `RESEND_API_KEY` to enable verification and reset email.
5. Optionally set `KIO_LLM_API_KEY`, `KIO_LLM_BASE_URL` and `KIO_LLM_MODEL`.
6. Run:

   ```sh
   npm install
   npx prisma db push
   npm run dev
   ```

7. Open http://localhost:3000.

Use `prisma db push` only for local or disposable preview databases. Production changes must use reviewed Prisma migrations and a backup/rollback plan.

## API

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `POST /api/auth/verification/request`, `POST /api/auth/verification/confirm`
- `POST /api/auth/password/forgot`, `POST /api/auth/password/reset`
- `GET /api/auth/me`
- `POST /api/chat`
- `GET/POST /api/tasks`
- `GET/POST /api/projects`
- `GET/POST /api/projects/:projectId/files`
- `POST /api/projects/:projectId/pack`
- `GET /api/artifacts/:artifactId`

## Security boundaries

- Never commit `.env.local`, provider keys, database credentials or auth secrets.
- Passwords are hashed with bcrypt; session cookies are HTTP-only, SameSite=Lax and Secure in production.
- Password-reset and verification tokens are random, hashed at rest, expire after 30 minutes and are single-use.
- Project and chat records are scoped to the authenticated user.
- Full-packer does not execute arbitrary project code.
- Configure HTTPS, backups, monitoring and a secrets manager before production.
- Build customer code only in isolated, resource-limited workers.

## Deployment

Deploy `studio/` as the Next.js app root, provision PostgreSQL and configure environment variables in the host secret manager. This branch does not deploy to production. See [FULLSTACK-PACKER.md](./FULLSTACK-PACKER.md) for implementation boundaries and release gates.
