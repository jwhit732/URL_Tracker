# Link Tracker — Clicks API Endpoint

## What to build

Add a public API endpoint to the link tracker that returns click event data as JSON. This allows the outreach pipeline to pull click data and sync it back to the prospect spreadsheet.

## Route

```
GET /api/clicks
```

## Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `since` | ISO datetime string | No | 24 hours ago | Only return clicks after this timestamp |
| `rto_code` | string | No | all | Filter to a specific RTO code |
| `limit` | number | No | 1000 | Max results to return |
| `secret` | string | Yes | — | Must match CRON_SECRET env var (reuse existing secret for simplicity) |

## Response format

```json
{
  "clicks": [
    {
      "rto_code": "30979",
      "rto_name": "Building Trades Australia",
      "tracked_url": "/r/30979",
      "destination_url": "https://chatgpt.com/g/...",
      "clicked_at": "2026-03-15T14:23:00Z",
      "ip_address": "203.0.113.42",
      "user_agent": "Mozilla/5.0 ..."
    }
  ],
  "total": 12,
  "since": "2026-03-14T14:23:00Z",
  "fetched_at": "2026-03-15T14:30:00Z"
}
```

## Summary endpoint

Also add a summary view that groups by RTO:

```
GET /api/clicks/summary
```

Same query parameters as above. Response:

```json
{
  "rtos": [
    {
      "rto_code": "30979",
      "rto_name": "Building Trades Australia",
      "total_clicks": 3,
      "first_click": "2026-03-13T09:15:00Z",
      "last_click": "2026-03-15T14:23:00Z"
    }
  ],
  "total_clicks": 12,
  "unique_rtos": 5,
  "since": "2026-03-14T14:23:00Z"
}
```

## Authentication

Reuse the existing `CRON_SECRET` env var. Caller must pass it as a `secret` query parameter:

```
GET /api/clicks?secret=your-cron-secret
```

Return 401 if missing or wrong. This keeps it simple without building proper auth.

## Implementation notes

- Use the existing Prisma client and ClickEvent model — no schema changes needed
- Join through TrackedLink to get rto_code and rto_name from the Rto table
- Sort by clicked_at descending (newest first)
- The endpoint should be fast — add appropriate Prisma includes/selects, don't fetch unnecessary fields

## Files to create

- `app/api/clicks/route.ts` — main clicks endpoint
- `app/api/clicks/summary/route.ts` — grouped summary endpoint

## Testing

- Returns clicks filtered by `since` parameter
- Returns clicks filtered by `rto_code`
- Returns 401 without valid secret
- Summary groups correctly by RTO
- Empty result set returns clean empty response
