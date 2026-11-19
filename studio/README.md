# KIO.AI Studio
A full-stack Next.js App Router application added alongside the existing static KIO.AI site. The original root app and Pages workflows are untouched.

## Included
- Next.js 15 + React 19 responsive workspace UI.
- PostgreSQL persistence through Prisma for users, conversations, messages and tasks.
- Email/password registration and login; bcrypt password hashes and signed HTTP-only session cookies.
- Skill routing for planning, frontend, backend, debugging and documentation.
- OpenAI-compatible chat completions adapter. Provider keys remain server-side.
- Health, auth, chat, task, project, project-file and package artifact API routes.
- Full-packer v1: per-user projects, safe text-file storage, ZIP packaging, manifest, SHA-256 checksum and private artifact downloads.
- Pull-request CI build/typecheck workflow; no deployment job.

## Local setup
1. Copy .env.example to .env.local.
2. Set DATABASE_URL to PostgreSQL and generate KIO_AUTH_SECRET with: openssl rand -base64 32
3. Optionally set KIO_LLM_API_KEY, KIO_LLM_BASE_URL and KIO_LLM_MODEL. Without a provider key, the API explicitly reports that configuration is required.
4. Run:
   npm install
   npx prisma db push
   npm run dev
5. Open http://localhost:3000.

## API
- GET /api/health
- POST /api/auth/register
- POST /api/auth/login and POST /api/auth/logout
- GET /api/auth/me
- POST /api/chat
- GET and POST /api/tasks

## Security boundaries
- Never commit .env.local, provider keys, database credentials or auth secrets.
- Passwords are hashed with bcrypt (12 rounds); session cookies are HTTP-only, SameSite=Lax and Secure in production.
- Chat/task records are scoped to the authenticated user.
- No arbitrary shell, terminal, git write, filesystem write or remote-code execution tool is exposed.
- Configure HTTPS, database backups, request rate limiting and a secrets manager before production use. Add a durable rate limiter before opening public registration at scale.

## Deployment
Deploy the studio directory as the app root on a Next.js host. Provision PostgreSQL and set the environment variables in the host secret manager. Run npx prisma db push as a controlled migration step before first use. This feature branch does not deploy to production.
