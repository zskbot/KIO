# KIO.AI Full-stack Studio and Full-packer

## Current implementation slice

- Projects are owned by the authenticated account and have per-user unique slugs.
- Project source files are stored in PostgreSQL and scoped through the owning project.
- The file API rejects traversal paths, hidden environment files, dependency/build folders, and common secret filenames.
- Full-packer creates a ZIP archive with a `KIO-PACKAGE.json` manifest, SHA-256 checksum, and a private artifact download endpoint.
- Initial limits: 200 source files and 10 MiB total source content per package; individual text files are limited to 1 MiB.
- No arbitrary shell, package install, build-script execution, or remote code execution is performed.

## API

- `GET/POST /api/projects`
- `GET/POST /api/projects/:projectId/files`
- `POST /api/projects/:projectId/pack`
- `GET /api/artifacts/:artifactId`

All endpoints require a valid KIO session. Project ownership is checked on every operation.

## Database update

After deploying this branch to a non-production preview with PostgreSQL configured:

```sh
npx prisma db push
npm run build
```

For production, convert schema changes into reviewed Prisma migrations before applying them. Back up PostgreSQL first.

## Production work still required

This is an incremental foundation, not a claim of production readiness. Before public launch, complete:
- Email verification and password reset with single-use, hashed, expiring tokens and a mail provider.
- Durable rate limiting for authentication, AI, project and pack endpoints.
- Project editor integration, project-level authorization tests, and archive round-trip tests.
- External object storage for large artifacts, retention/cleanup policies, and database backup/restore drills.
- Isolated build workers for untrusted project code; never run customer build scripts in the Next.js web process.
- Release channels, immutable version tags, publish approvals, audit events, and deployment-provider integration.
- Security review, dependency audit, observability, and successful CI plus preview smoke tests.

No production deployment is performed by this feature branch.
