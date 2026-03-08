# RTO Link Tracker

Internal link tracking tool for Smart AI Solutions. Paste RTO codes, names, and a destination URL to generate tracked links for cold email outreach. Every click is logged with timestamp, IP, user agent, and referrer. A daily digest email summarises the previous 24 hours.

---

## Prerequisites

- Node.js 18+
- A PostgreSQL database (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), or Vercel Postgres)
- A [Resend](https://resend.com) account with a verified sender address

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy the example and fill in your values:

```bash
cp .env.example .env
```

See [Environment variables](#environment-variables) below for what each one does.

### 3. Run the database migration

```bash
npx prisma migrate deploy
```

This creates all five tables: `rtos`, `link_batches`, `tracked_links`, `click_events`, `digest_runs`.

### 4. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:3000/admin/create` to generate your first batch of tracked links.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. When using Vercel Postgres with PgBouncer pooling, use the pooled URL here. |
| `DIRECT_URL` | Yes | Direct (non-pooled) PostgreSQL connection string. Safe to set to the same value as `DATABASE_URL` for plain Postgres setups. Required by Prisma for migrations. |
| `RESEND_API_KEY` | Yes | API key from [resend.com/api-keys](https://resend.com/api-keys). |
| `DIGEST_TO_EMAIL` | Yes | Email address that receives the daily digest. |
| `DIGEST_FROM_EMAIL` | Yes | Verified sender address in Resend (e.g. `digest@yourdomain.com`). During sandbox testing you can use `onboarding@resend.dev` when sending to your own verified address. |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the deployed app (e.g. `https://your-app.vercel.app`). Used for the dashboard link in digest emails. |
| `CRON_SECRET` | Yes | A random secret string used to authenticate the cron job. Generate one with `openssl rand -hex 32`. |

---

## Usage

### Generating tracked links

1. Go to `/admin/create`
2. Enter the destination URL (where all clicks should land)
3. Paste RTO data — one per line — in either format:
   - `RTOCODE\tRTO Name` (tab-separated, copied from a spreadsheet)
   - `RTOCODE,RTO Name` (comma-separated)
   - `RTOCODE RTO Name` (space-separated, code must have no spaces)
4. Click **Generate Links**

Each RTO gets a unique tracked URL at `/r/{rtoCode}`. If a tracked link already exists for an RTO code, its destination is updated and the same URL is reused.

### Click log

Visit `/admin` to see all clicks. Filter by date range (Today / 7 days / 30 days / All time) and search by RTO code or name.

### Daily digest

A digest email is sent automatically at 8am UTC each day. If there were zero clicks in the previous 24 hours, no email is sent but the skipped run is still recorded.

---

## Running tests

```bash
npm test
```

Covers `lib/parseBatch.ts` — 10 unit tests for the batch input parser.

---

## Vercel deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial deploy"
git push
```

### 2. Import in Vercel

Go to [vercel.com/new](https://vercel.com/new), import the repository, and deploy. Vercel detects Next.js automatically — no build configuration needed.

### 3. Add environment variables

In **Project → Settings → Environment Variables**, add all variables from the table above. Set them for the **Production** environment (and Preview if you want digest emails there too).

### 4. Run the migration against production

With `DATABASE_URL` pointing at your production database:

```bash
npx prisma migrate deploy
```

Or run it from a Vercel build command by adding this to `package.json`:

```json
"vercel-build": "prisma migrate deploy && next build"
```

Then change the Vercel build command to `npm run vercel-build`.

### 5. Verify the cron job

`vercel.json` schedules the digest to run at `0 8 * * *` (8am UTC). After deploying, go to **Project → Settings → Cron Jobs** in Vercel to confirm it is listed and enabled. Vercel Hobby plans support one cron job; Pro plans support more.

---

## Testing the digest manually

Send a POST request to the digest endpoint with your `CRON_SECRET`:

```bash
curl -X POST https://your-app.vercel.app/api/jobs/digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

The response will be one of:

```json
{ "status": "skipped" }
{ "status": "sent", "clickCount": 12, "uniqueRtoCount": 7 }
{ "status": "error", "error": { ... } }
```

You can also trigger it locally against your dev server (make sure `CRON_SECRET` is set in `.env`):

```bash
curl -X POST http://localhost:3000/api/jobs/digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Project structure

```
app/
  layout.tsx              Root layout (noindex, Tailwind body)
  not-found.tsx           Global 404 page
  page.tsx                Redirects / → /admin
  admin/
    layout.tsx            Admin nav
    page.tsx              Click log dashboard (search + date filters)
    error.tsx             Error boundary for admin routes
    create/
      page.tsx            Server component — passes appUrl to form
      CreateForm.tsx      Batch input form and results table
      actions.ts          createBatch server action
  r/[slug]/
    route.ts              Click logger + redirect endpoint
  api/jobs/digest/
    route.ts              Daily digest POST handler (Vercel Cron)
lib/
  prisma.ts               Prisma client singleton
  parseBatch.ts           Batch input parser (pure, no DB)
  parseBatch.test.ts      Unit tests
prisma/
  schema.prisma
  migrations/
vercel.json               Cron schedule
```

---

## Data model

| Table | Purpose |
|---|---|
| `rtos` | Canonical RTO records, keyed by `rtoCode` |
| `link_batches` | One record per bulk generation event |
| `tracked_links` | One link per RTO per active destination (`/r/{slug}`) |
| `click_events` | Every click, with IP, user agent, referrer, and RTO snapshots |
| `digest_runs` | Audit log of every digest job run (sent or skipped) |
