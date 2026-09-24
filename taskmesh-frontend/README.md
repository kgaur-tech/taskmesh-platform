# TaskMesh

TaskMesh is an initiative platform for recurring practice, structured submissions, rubric-based evaluation, and measurable growth. The participant loop is initiative -> task -> submission -> evaluation -> feedback -> progress; leaders use the same domain model to manage cohorts and inspect performance.

## Architecture

- `src/app`: App Router pages and route handlers
- `src/features/workspaces`: existing participant and leader workspace UI
- `src/components`: shared shell, UI, and chart primitives
- `src/lib`: Prisma singleton, Google session auth boundary, Zod schemas, HTTP errors, and evaluation provider contract
- `prisma/schema.prisma`: normalized PostgreSQL domain model

Route handlers are intentionally thin. They authenticate with NextAuth sessions, validate request bodies with Zod, authorize resource ownership or membership, and perform transactional writes through Prisma.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder.
2. Install dependencies with `npm install`.
3. Create or link a Supabase PostgreSQL database.
4. Run `npm run db:validate`, then `npm run db:migrate` for a local migration.
5. Start the app with `npm run dev`.

Useful checks are `npm run typecheck`, `npm run lint`, and `npm run build`.

## Required integrations

Google OAuth via NextAuth supplies authentication and identity. The `/api/users/sync` endpoint maps the Google session to the internal `User` record; call it after onboarding before accessing workspace APIs.

Cloudinary uploads use `/api/uploads/sign`. The browser receives only a short-lived signature payload; the API secret stays server-side. Store returned media metadata through the submission endpoint.

AI evaluation is represented by `EvaluationProvider` in `src/lib/evaluation.ts`. A provider adapter must be implemented and selected through `AI_PROVIDER` before evaluation is enabled. Provider output must satisfy the Zod schema; malformed or failed responses are persisted as failed evaluations and never shown as successful scores.

## Important API routes

- `GET/POST /api/initiatives`
- `POST /api/initiatives/:id/join`
- `GET /api/tasks?initiativeId=...`
- `GET/POST /api/submissions`
- `GET /api/submissions/:id`
- `POST /api/submissions/:id/evaluate`
- `GET/PATCH /api/notifications`
- `POST /api/users/sync`
- `POST /api/uploads/sign`
- `GET /api/health`

## Production notes

No production-facing route should fall back to the seeded UI objects in `src/mock`. The current polished UI still contains local presentation fixtures while the server contracts are introduced; replacing those fixtures is the next integration step once a database and authenticated Google session are available. Do not run `prisma migrate deploy` until the production Supabase connection has been reviewed and the migration is committed.
