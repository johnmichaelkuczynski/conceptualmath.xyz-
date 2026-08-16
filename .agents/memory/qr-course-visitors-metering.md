---
name: Unique visitors & guest text budget
description: How owner-only visitor counting and the guest AI-text metering work in the course app.
---

- Unique visitors: `unique_visitors` table upserted once per session in `identifyUser` (guest session id or `user_<id>`); owner-only endpoint `/api/admin/unique-visitors` (isAdmin), Dashboard card renders only when the fetch succeeds. Activity windows use `lastSeenAt` (active visitors), total is all-time.
- Guest metering is a generated-text budget (GUEST_AI_TEXT_LIMIT chars), not a request count. `guestUsageGate` reserves 500 chars and `session.save()`s BEFORE the handler runs (closes parallel-request bypass), then swaps the reservation for the actual response string length in a `res.json` override.
- **Why:** review found the naive pre-check-only tally was bypassable by fanning out concurrent guest requests.
- Course downloads (`/api/course/download.txt|.pdf`) must never include `correctAnswer`/`explanation` — those are the graded assignments' answer keys. Prompts only.
- pdfkit is externalized in api-server build.mjs (reads .afm font files off disk; bundling breaks it).
