# RTO Link Tracker — Claude Implementation Brief

## Project overview

Build a lightweight private web app for manual cold email outreach to Australian RTOs.

The app should let me paste a batch of RTOs using:

- `rto_code`
- `rto_name`

plus one shared destination URL, and generate one tracked link per RTO.

Each tracked link must visibly include the **RTO code** so it is easy for me to match links to prospects while working manually in Gmail.

When someone clicks a tracked link, the app must:

1. identify the tracked link
2. log the click event
3. associate it with the relevant RTO
4. redirect immediately to the destination URL

The app should have a very simple private admin interface that is **unlisted** for MVP. No authentication is required yet.

The main goal is to make it extremely easy to answer:

**Which RTOs clicked my links?**

This is an MVP optimized for:
- fast bulk creation
- clear logs
- low hosting cost
- manual Gmail workflow
- future extensibility

---

## Product goals

### Primary goal
Generate trackable links in bulk for 10–20 RTOs at a time and clearly see who clicked.

### Secondary goals
- show RTO code and RTO name in logs
- send a daily digest email of clicks
- keep the system simple, cheap, and easy to maintain
- preserve room for future expansion into campaigns, CSV import, and richer prospect tracking

---

## Non-goals for MVP

Do **not** build these unless they are trivial and do not slow the MVP:

- authentication
- public-facing marketing site
- CRM features
- automatic email sending
- advanced analytics dashboards
- attribution modeling
- heatmaps
- campaign sequencing
- multiple tracked links per RTO
- per-contact identity modeling
- complex bot detection
- user/team roles

---

## Core user workflow

### Workflow 1: generate links
1. I open the admin create page
2. I paste one destination URL
3. I paste multiple rows of RTOs using `rto_code, rto_name`
4. I click Generate
5. The app creates one tracked link per RTO
6. I see a table of generated links
7. I copy the link for each RTO into Gmail manually

### Workflow 2: recipient clicks
1. A recipient clicks a tracked link
2. The app logs the click event
3. The app redirects immediately to the real destination URL

### Workflow 3: review engagement
1. I open the admin dashboard
2. I see a recent click log
3. I can quickly identify which RTOs clicked, when, and how many times

### Workflow 4: digest
1. Once per day, the app sends a digest email
2. The digest summarizes the last 24 hours of clicks by RTO

---

## MVP requirements

## 1. Batch link generation

Build an admin page where I can enter:

- `destination_url`
- optional `batch_label`
- multiline text input containing rows of:
  - `rto_code, rto_name`

Example input:

```text
https://smartaisolutions.com/demo

30979, Building Trades Australia
1718, Performance Training Pty Limited
670, Australian Institute of Professional Counsellors
```

The app should validate the input and create one tracked link per RTO.

### Rules
- destination URL must be a valid absolute URL
- RTO code is required
- RTO name is required
- ignore blank lines
- dedupe repeated RTO codes within the same batch
- trim whitespace
- support normal paste input from spreadsheets or CSV-like text

### Output
After generation, show a table with:
- RTO code
- RTO name
- tracked URL
- destination URL
- created timestamp
- copy button

---

## 2. Tracked URL format

For MVP, each tracked link should use the RTO code in the slug.

### Required format
```text
/r/{rto_code}
```

Example:
```text
/r/30979
```

### Important implementation note
Design the data model so this can evolve later into something like:

```text
/r/{rto_code}-{token}
```

without needing a rewrite.

But for MVP, the public format should remain:
```text
/r/{rto_code}
```

if there is only one active tracked link per RTO.

---

## 3. Redirect behavior

Create a public route:

```text
GET /r/[slug]
```

Behavior:
1. lookup tracked link by slug
2. if found and active:
   - log click event
   - redirect immediately to destination URL
3. if not found:
   - return 404 page or safe fallback response

### Redirect requirement
Recipient experience must feel instant. No intermediate page.

Use an HTTP redirect that is simple and reliable.

---

## 4. Click logging

Every click should create a click event record.

Store at least:
- tracked link ID
- RTO code snapshot
- RTO name snapshot
- clicked timestamp
- request IP if available
- user agent if available
- referer if available

Even if IP / user agent are not shown in the MVP UI, store them for future analysis.

---

## 5. Admin dashboard

Create a simple unlisted admin dashboard page.

### Required view
A click log table showing:
- clicked at
- RTO code
- RTO name
- tracked URL
- destination URL
- total clicks for that tracked link

### Required behavior
- default sort: newest first
- simple search by RTO code or RTO name
- filter by date range:
  - today
  - 7 days
  - 30 days
  - all time

### Nice to have if easy
- badge for first click
- click count pill
- copy tracked URL button
- view generated links by batch

Keep UI plain and functional. No design flourish needed.

---

## 6. Daily digest email

Implement a daily scheduled digest email summarizing clicks from the previous 24 hours.

### Digest content
- total clicks
- unique RTOs clicked
- grouped summary by RTO
- recent click rows with timestamps

### Example digest summary
- 30979 — Building Trades Australia — 3 clicks
- 1718 — Performance Training Pty Limited — 2 clicks
- 670 — Australian Institute of Professional Counsellors — 1 click

### Delivery
Use a daily cron job.

---

## 7. Privacy and access

This admin tool is private but unlisted.

### MVP rules
- no auth required yet
- admin routes should not be linked publicly
- add basic noindex protections where appropriate
- keep the app internal and minimal

---

## Tech stack

Use this stack unless there is a very strong reason not to:

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Postgres**
- **Prisma**
- **Vercel**
- **Resend** for email
- **Vercel Cron** for scheduled digest

Keep the architecture simple. One app. One database. Minimal moving parts.

---

## Data model

Use Prisma.

### `rtos`
Canonical RTO records.

Fields:
- `id`
- `rtoCode` — unique
- `rtoName`
- `createdAt`
- `updatedAt`

### `linkBatches`
Represents one bulk generation event.

Fields:
- `id`
- `destinationUrl`
- `label` — optional
- `createdAt`

### `trackedLinks`
One generated tracked link per RTO for MVP.

Fields:
- `id`
- `batchId`
- `rtoId`
- `slug` — unique
- `destinationUrl`
- `isActive` — default true
- `createdAt`

### `clickEvents`
Each click event.

Fields:
- `id`
- `trackedLinkId`
- `rtoCodeSnapshot`
- `rtoNameSnapshot`
- `clickedAt`
- `ipAddress` — optional
- `userAgent` — optional
- `referer` — optional

### `digestRuns`
Track digest jobs for observability.

Fields:
- `id`
- `runAt`
- `clickCount`
- `uniqueRtoCount`
- `status`

---

## Prisma schema guidance

Use relations between:
- `Rto`
- `LinkBatch`
- `TrackedLink`
- `ClickEvent`

### Constraints
- `Rto.rtoCode` unique
- `TrackedLink.slug` unique

### Design note
Keep schema flexible enough to later support:
- multiple links per RTO
- multiple campaigns
- CSV imports
- contact-level tracking

Do not overbuild those now. Just avoid blocking them.

---

## Route structure

### Admin routes
- `/admin`
  - dashboard / recent click log

- `/admin/create`
  - batch create form

- `/admin/batch/[id]`
  - generated links for one batch

### Public routes
- `/r/[slug]`
  - track click and redirect

### Internal job route
- `/api/jobs/digest`
  - cron-triggered daily digest

---

## Page-by-page spec

## `/admin`
### Purpose
Main dashboard showing recent clicks.

### UI elements
- page title
- date filter
- search input
- table of recent clicks

### Table columns
- clicked at
- RTO code
- RTO name
- tracked URL
- destination URL
- total clicks

---

## `/admin/create`
### Purpose
Generate tracked links in bulk.

### UI elements
- destination URL input
- optional batch label input
- multiline textarea for rows
- Generate button

### Input format guidance shown on page
```text
30979, Building Trades Australia
1718, Performance Training Pty Limited
670, Australian Institute of Professional Counsellors
```

### On submit
- validate input
- create or upsert RTO records
- create batch record
- create tracked link records
- show results table

---

## `/admin/batch/[id]`
### Purpose
Review one generated batch.

### UI elements
- batch metadata
- destination URL
- created date
- optional label
- generated links table

### Table columns
- RTO code
- RTO name
- tracked URL
- copy button

---

## Parsing rules for textarea input

Implement a robust parser for pasted batch input.

### Expected input
Each non-empty line should be parsed as:

```text
rto_code, rto_name
```

### Rules
- split on first comma only
- left side = RTO code
- right side = RTO name
- trim whitespace on both sides
- skip empty lines
- collect validation errors by line number
- show friendly error message if parsing fails

### Example
Input:
```text
30979, Building Trades Australia
1718, Performance Training Pty Limited
```

Output objects:
```ts
[
  { rtoCode: "30979", rtoName: "Building Trades Australia" },
  { rtoCode: "1718", rtoName: "Performance Training Pty Limited" }
]
```

---

## Batch creation logic

When a batch is submitted:

1. validate destination URL
2. parse rows
3. dedupe by `rtoCode`
4. upsert RTO records by code
5. create `linkBatch`
6. create one `trackedLink` per RTO
7. return results view

### Slug generation rule
For MVP:
- slug = `rtoCode`

### Collision rule
Since MVP assumes one active tracked link per RTO, if a tracked link already exists for that code:
- either reuse the existing active slug
- or replace/deactivate prior tracked link and create new one

### Recommended MVP behavior
**Reuse existing slug for same RTO code** if only one tracked link per RTO is allowed.

That keeps things predictable.

---

## Click logging logic

When `/r/[slug]` is hit:

1. lookup active tracked link by slug
2. if not found:
   - return 404
3. build click event payload
4. save click event
5. redirect to destination URL

### Metadata collection
Capture if available:
- timestamp
- request IP
- `user-agent`
- `referer`

Do not block redirect if optional metadata is missing.

---

## Daily digest logic

Use a scheduled job that runs once daily.

### Process
1. calculate 24-hour lookback window
2. query click events in that range
3. group by tracked link / RTO
4. calculate:
   - total clicks
   - unique RTO count
   - per-RTO click totals
5. render email
6. send email via Resend
7. store `digestRun`

### If no clicks
Still send a lightweight digest or optionally skip send.  
Choose the simpler implementation.

Recommended MVP behavior:
- **skip sending if zero clicks**
- still store a digest run with zero counts if useful

---

## Edge cases to handle

- duplicate RTO code in a pasted batch
- extra spaces in input
- blank lines
- malformed rows
- invalid destination URL
- click on unknown slug
- repeat clicks from same RTO
- bot or scanner clicks
- existing RTO code with updated name
- existing tracked link already present for code

---

## Bot/scanner clicks

Mail scanners may click links before humans do.

### MVP instruction
Do not build complex bot detection.

Just:
- store user agent
- store IP if available
- store timestamp

This is enough for future filtering.

---

## Environment variables

Expected env vars:

```bash
DATABASE_URL=
RESEND_API_KEY=
DIGEST_TO_EMAIL=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

Add any other required vars cleanly and document them.

---

## Implementation order

Build in this order:

### Phase 1
- Next.js app scaffold
- Tailwind
- Prisma + Postgres
- core schema
- database migration

### Phase 2
- `/admin/create`
- batch parser
- batch generation logic
- results table

### Phase 3
- `/r/[slug]`
- click logging
- redirect logic

### Phase 4
- `/admin`
- click log dashboard
- search + date filtering

### Phase 5
- daily digest email
- cron route
- digest summary template

### Phase 6
- cleanup
- error states
- noindex / minimal privacy hardening
- README setup instructions

---

## Testing checklist

Claude should implement at least basic tests or clearly test manually for:

### Batch creation
- valid rows create links
- blank lines ignored
- duplicates deduped
- invalid rows rejected
- invalid URL rejected

### Redirect
- valid slug logs click and redirects
- invalid slug returns 404

### Dashboard
- click rows display correctly
- search works
- date filters work

### Digest
- digest groups clicks correctly
- zero-click day handled cleanly

---

## Deliverables

I want the project to include:

1. working Next.js app
2. Prisma schema and migrations
3. admin create page
4. admin dashboard
5. redirect tracking route
6. daily digest email job
7. README with setup instructions
8. environment variable documentation

---

## README requirements

Include:
- project purpose
- stack
- local setup
- env vars
- Prisma migration steps
- how to run dev server
- how to test digest route
- how to deploy on Vercel

---

## Build quality guidance

- keep code simple
- keep naming clear
- avoid premature abstraction
- avoid building generic frameworks
- write readable components and functions
- comment only where useful
- prefer practical code over architectural cleverness

This is a focused internal tool, not a startup trying to impress a VC with microservices.

---

## Future-ready notes

Do not build these yet, but leave room for them:
- CSV upload from master RTO spreadsheet
- storing contact name and email
- multiple links per RTO
- campaign labels and reporting
- export CSV
- bot-click heuristics
- auth

---

## Final implementation summary

Build a private internal link tracking tool where I can paste multiple RTO codes and names plus one destination URL, generate one tracked link per RTO, use those links manually in Gmail, log clicks, review a simple click dashboard, and receive a daily digest email of engagement.

The system should be optimized for clarity, speed, low cost, and future expansion, with the MVP remaining as simple as possible.
