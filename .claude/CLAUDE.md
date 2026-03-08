# RTO Link Tracker

## What this is
A private internal link tracking tool for Smart AI Solutions. Used for cold email outreach to Australian RTOs. Paste RTO codes + names + a destination URL → get tracked links → use them in Gmail → see who clicked.

## Stack
- Next.js (App Router)
- TypeScript (strict)
- Tailwind CSS
- Postgres (Vercel Postgres)
- Prisma ORM
- Vercel hosting
- Resend for email
- Vercel Cron for scheduled digest

## Key commands
- `npm run dev` — start dev server
- `npx prisma migrate dev` — run migrations
- `npx prisma studio` — visual database browser
- `npx prisma generate` — regenerate client after schema changes
- `npm run build` — production build
- `npm run lint` — run linter
- `npm test` — run tests

## Project structure
- `/app/admin` — dashboard (click log)
- `/app/admin/create` — batch link generation
- `/app/admin/batch/[id]` — view generated batch
- `/app/r/[slug]` — public redirect endpoint (logs click, redirects)
- `/app/api/jobs/digest` — cron-triggered daily digest
- `/prisma/schema.prisma` — data model

## Code standards
- TypeScript strict mode
- Functional components only
- Keep files under 200 lines where possible
- Australian English in UI copy (organisation, colour)
- No premature abstraction — this is an internal tool, not a framework
- Comment only where the why isn't obvious
- Prefer simple readable code over clever patterns

## Data model overview
- `Rto` — canonical RTO records (rtoCode unique)
- `LinkBatch` — one bulk generation event
- `TrackedLink` — one link per RTO per batch (slug unique)
- `ClickEvent` — every click logged with timestamp, IP, user agent
- `DigestRun` — tracks digest job runs

## Important rules
- Tracked URL format: `/r/{rtoCode}` (MVP: one active link per RTO)
- Redirect must feel instant — no intermediate pages
- Store IP, user agent, referer even if not shown in UI yet
- Skip digest email if zero clicks in 24hr window
- No authentication for MVP — admin routes are unlisted only
- Reuse existing slug if tracked link already exists for that RTO code

## Environment variables
- `DATABASE_URL`
- `RESEND_API_KEY`
- `DIGEST_TO_EMAIL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

## Build order
Phase 1: Scaffold + Prisma schema + migration
Phase 2: /admin/create + batch parser + results table
Phase 3: /r/[slug] + click logging + redirect
Phase 4: /admin dashboard + search + date filters
Phase 5: Daily digest email + cron route
Phase 6: Cleanup + error states + noindex + README
