# Smart AI Solutions — RTO Link Tracker

## What it is
A lightweight URL tracking app for cold email outreach to Australian RTOs. Replaces expensive SaaS link trackers (Bitly, etc.) with a self-owned solution.

## How it works
1. You generate unique tracked URLs for each RTO and embed them in cold emails
2. RTO clicks the link → hits your Vercel app
3. App logs the click (who, what, when) and sends you an email notification
4. App redirects the RTO person to the real destination — they never see the tracker
5. You check a simple dashboard to review click history across all RTOs

## Decisions made
- **Hosting:** Vercel (free tier, serverless functions, no server maintenance)
- **Framework:** Next.js (single project handles redirects, dashboard, and API)
- **Database:** Vercel Postgres (free tier, built into the platform)
- **Notifications:** Email on every click (RTO name, link clicked, timestamp)
- **Dashboard:** Simple table view — RTO name, link, timestamp, click counts per RTO
- **Build tool:** Claude Code (vibe coded with hooks for learning)
- **Hooks angle:** Set up CLAUDE.md, auto-formatting, test running, safety guardrails — learned during the build, not as separate exercises

## Tracking data captured
- Which RTO clicked
- Which link they clicked
- When they clicked (timestamp)

## Out of scope (for now)
- Page visit tracking after redirect
- Click heatmaps or advanced analytics
- User authentication on the dashboard (can add later if needed)

## URL structure
`https://your-tracker.vercel.app/r/[rto-identifier]-[link-name]`
e.g. `https://your-tracker.vercel.app/r/rmea-pricing`
