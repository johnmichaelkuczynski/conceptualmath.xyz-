---
name: QuantReason course seed requires DB schema first
description: Boot-time seed in the api-server fails until the drizzle schema is pushed.
---

The api-server runs `seedIfEmpty` at boot, but it throws `relation "topics" does not exist`
on a fresh/empty database because the seed does NOT create tables.

**Rule:** After a fresh DB, a DB reset, or any schema change, run
`pnpm --filter @workspace/db run push` (drizzle-kit push) BEFORE the api-server can boot
and seed. Then restart the `artifacts/api-server: API Server` workflow.

**Why:** schema creation (drizzle) and data seeding (api-server boot) are separate steps;
the workflow only does the latter.

**How to apply:** if `/api/course/overview` 500s with a missing-relation error or the
api-server workflow logs "Seed failed ... does not exist", push the schema, then restart.
Verify with `curl localhost:80/api/diagnostics/system` (expect ok:true, 28 topics).
