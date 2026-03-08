# RTO Link Tracker — Handover Notes

Last updated: 2026-03-08 (session 2)
Stack: Next.js 16, TypeScript strict, Tailwind CSS 3, Prisma 5, Postgres, Resend

---

## Current status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Scaffold + Prisma schema + migration | ✅ Done |
| 2 | /admin/create + parser + results table | ✅ Done |
| 3 | /r/[slug] redirect + click logging | ⬜ Next |
| 4 | /admin dashboard + search + filters | ⬜ |
| 5 | Daily digest email + cron route | ⬜ |
| 6 | Cleanup + error states + noindex + README | ⬜ |

---

## Before the app can run — required setup

The app needs a Postgres database. It will not start without `DATABASE_URL`.

### 1. Create a `.env` file in the project root

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME   # same as DATABASE_URL unless using Vercel Postgres pooler
RESEND_API_KEY=re_...
DIGEST_TO_EMAIL=you@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any-random-string-you-choose
```

`DIRECT_URL` is only different from `DATABASE_URL` when using Vercel Postgres's connection pooler (PgBouncer). For a direct Postgres connection they are the same value.

### 2. Run the migration

```bash
npx prisma migrate deploy
```

This applies `prisma/migrations/20260308000000_init/migration.sql` which creates all five tables.

### 3. Start dev server

```bash
npm run dev
```

Then visit `http://localhost:3000/admin/create`.

---

## Project structure (non-node_modules)

```
link-tracker/
├── app/
│   ├── globals.css               # Tailwind directives
│   ├── layout.tsx                # Root layout — noindex, Tailwind body
│   ├── page.tsx                  # Redirects / → /admin
│   └── admin/
│       ├── layout.tsx            # Admin nav (Dashboard + Generate Links)
│       ├── page.tsx              # Stub — Phase 4 builds this out
│       └── create/
│           ├── page.tsx          # Server component — passes appUrl to CreateForm
│           ├── CreateForm.tsx    # "use client" — form, validation UI, results table
│           └── actions.ts        # "use server" — createBatch server action
├── lib/
│   ├── prisma.ts                 # Prisma singleton (safe for Next.js dev hot-reload)
│   ├── parseBatch.ts             # Pure parser — no DB dependency
│   └── parseBatch.test.ts        # 10 unit tests — all passing
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260308000000_init/
│           └── migration.sql
├── eslint.config.mjs             # Flat config (Next.js 16 style, ESM)
├── jest.config.js
├── next.config.ts
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── SPEC.md
└── HANDOVER.md
```

---

## Key decisions made

### Next.js 16
`create-next-app` was skipped (couldn't scaffold into a non-empty dir). All config files were written manually. Next.js 16 removed `next lint` — the lint script uses `eslint .` directly with flat config (`eslint.config.js`).

### ESLint flat config
`eslint-config-next` 16 exports a flat config array. The old `.eslintrc.json` approach doesn't work — it stays in the repo but is ignored in favour of `eslint.config.js`. The Node.js warning about "MODULE_TYPELESS_PACKAGE_JSON" is harmless (a performance note, not an error).

### Prisma `directUrl`
The schema includes `directUrl = env("DIRECT_URL")`. This is required by Vercel Postgres (which uses PgBouncer pooling). For a plain Postgres setup both env vars can have the same value.

### Slug collision handling
Per the spec: **reuse existing slug**. When a new batch is created and a TrackedLink already exists for an RTO code, the action calls `prisma.trackedLink.update` to point the existing link at the new batch + new `destinationUrl`. This means the same `/r/{rtoCode}` URL will redirect to the new destination going forward. The results table marks these links `(reused)`.

### Server action return shape
`CreateBatchState` is a discriminated union:
- `null` — initial state (nothing submitted yet)
- `{ status: "success", batchId, links, parseWarnings }` — generation succeeded; `parseWarnings` holds rows that were skipped due to parse errors but didn't block the valid rows from being generated
- `{ status: "error", fieldErrors?, parseErrors?, message? }` — validation/parse/DB failure

### Partial parse failure behaviour
If a textarea contains some valid rows and some malformed rows, the action **proceeds** with the valid rows and returns the malformed rows as `parseWarnings` on the success state. This is more useful than failing the whole batch over one bad line.

---

## Phase 3 — what to build next

**Goal:** public redirect endpoint that logs clicks and redirects instantly.

### File to create: `app/r/[slug]/route.ts`

This is a Next.js Route Handler (not a page). Use `NextResponse.redirect` for the instant redirect.

```
GET /r/[slug]
1. prisma.trackedLink.findUnique({ where: { slug, isActive: true } })
2. if not found → return NextResponse.json({ error: "Not found" }, { status: 404 })
   (or a simple HTML 404 response)
3. prisma.clickEvent.create({ data: { ... } })  — don't await this if you want
   the redirect to feel instant; fire-and-forget is fine for MVP
4. return NextResponse.redirect(trackedLink.destinationUrl, { status: 302 })
```

**Click event fields to capture:**
```ts
{
  trackedLinkId: trackedLink.id,
  rtoCodeSnapshot: trackedLink.rto.rtoCode,   // include rto in findUnique query
  rtoNameSnapshot: trackedLink.rto.rtoName,
  ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
  userAgent: request.headers.get("user-agent") ?? null,
  referer: request.headers.get("referer") ?? null,
}
```

**Important:** The `findUnique` must include `{ include: { rto: true } }` to get the RTO snapshots.

**Redirect should be 302** (temporary) not 301, so browsers don't cache it and future destination URL changes work.

---

## Phase 4 — admin dashboard

**Goal:** `/admin` becomes a real click log with search + date filters.

This is a server component page — no client state needed for the data fetch. Search and date filter can be URL search params (`?q=&range=7d`) which Next.js reads in the server component via `searchParams`.

**Table columns:** clicked at | RTO code | RTO name | tracked URL | destination URL | total clicks

**Query pattern:**
```ts
const clicks = await prisma.clickEvent.findMany({
  where: {
    clickedAt: { gte: startDate },
    OR: q ? [
      { rtoCodeSnapshot: { contains: q, mode: "insensitive" } },
      { rtoNameSnapshot: { contains: q, mode: "insensitive" } },
    ] : undefined,
  },
  include: { trackedLink: true },
  orderBy: { clickedAt: "desc" },
  take: 200,
});
```

**Total clicks per tracked link:**
```ts
const counts = await prisma.clickEvent.groupBy({
  by: ["trackedLinkId"],
  _count: { id: true },
});
```
Merge this into the rows client-side (or use a raw query if performance matters later).

**Date filter options:** today | 7 days | 30 days | all time — as anchor links with `?range=` param.

---

## Phase 5 — daily digest

**Files to create:**
- `app/api/jobs/digest/route.ts` — the POST endpoint triggered by Vercel Cron
- `emails/DigestEmail.tsx` — React Email template (or just a plain HTML string — keep it simple)

**Route handler pattern:**
```ts
export async function POST(request: Request) {
  // Verify cron secret
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... digest logic
}
```

**Vercel cron config** goes in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/jobs/digest", "schedule": "0 8 * * *" }]
}
```
That fires at 8am UTC daily.

**Digest logic:**
1. Query `clickEvent` where `clickedAt >= now - 24h`
2. If count = 0: create `DigestRun` with `status: "skipped"`, return early (don't send email)
3. Group by `trackedLinkId` → get per-RTO totals
4. Send via Resend: `resend.emails.send({ from, to, subject, html })`
5. Create `DigestRun` with `status: "sent"`, `clickCount`, `uniqueRtoCount`

---

## Phase 6 — cleanup checklist

- [ ] 404 page for unknown slugs (create `app/not-found.tsx`)
- [ ] Error boundary / `error.tsx` in admin
- [ ] Add `robots` meta to all admin pages (already on layout, double-check)
- [ ] Ensure `/r/[slug]` has no `<head>` content indexable by crawlers (it's a route handler, so this is automatic)
- [ ] `README.md` with setup, env vars, migration steps, how to test digest, Vercel deploy guide
- [ ] Review all `console.error` calls — make sure nothing leaks sensitive data
- [ ] Test with a real Postgres connection end-to-end

---

## Running tests

```bash
npm test
```

Currently covers `lib/parseBatch.ts` — 10 tests, all passing. The spec testing checklist asks for:
- Redirect: valid slug logs click + redirects (add after Phase 3)
- Dashboard: click rows display, search works, date filters (can be manual or Playwright)
- Digest: groups clicks correctly, handles zero-click day (add after Phase 5)

---

## Commands reference

```bash
npm run dev                    # start dev server on :3000
npm run build                  # production build
npm run lint                   # eslint .
npm test                       # jest unit tests
npx prisma migrate deploy      # apply migrations to DB
npx prisma studio              # visual DB browser on :5555
npx prisma generate            # regenerate client after schema change
```

---

## Vercel deployment status

- Build script is `prisma generate && next build` — Prisma Client is generated fresh on each deploy
- ESLint: upgraded to v9, config is `eslint.config.mjs` (ESM flat config), legacy `.eslintrc.json` removed
- Production database (Neon): migration `20260308000000_init` applied — all 5 tables live
- Required Vercel env vars: `DATABASE_URL` ✅, `DIRECT_URL` ✅ — all set

## Build verified

`npm run build` passes cleanly as of 2026-03-08. All four routes compile:
- `/` (redirects to /admin)
- `/_not-found`
- `/admin` (stub)
- `/admin/create`

---

## Gotchas to be aware of

1. **`postcss.config.js` must stay as CJS** (`module.exports`). Do not convert to ESM or rename to `.mjs` — Tailwind's PostCSS integration expects CommonJS here.

2. **`eslint.config.mjs` is ESM** (uses `import`). The `.mjs` extension is required so Node treats it as ESM without needing `"type": "module"` in `package.json` (which would break `postcss.config.js`).

3. **`useActionState` is from `react`** (not `react-dom`). The older `useFormState` from `react-dom` is deprecated in React 19.

4. **Server actions must be in `"use server"` files** — not inline in client components. The `createBatch` action lives in `actions.ts`.

5. **`appUrl` prop pattern** — `CreateForm.tsx` receives `appUrl` as a prop from the server page component. This avoids hydration mismatches that would occur if the client component tried to read `process.env.NEXT_PUBLIC_APP_URL` directly at render time.

6. **Prisma's `updatedAt`** — the `Rto` model has `updatedAt @updatedAt`. Prisma auto-manages this on every `update` call. No need to set it manually.

7. **Next.js 16 Route Handlers** for Phase 3: the file is `app/r/[slug]/route.ts`, exporting a named `GET` function. Do not create a `page.tsx` in that directory — the route handler takes over the entire path.
