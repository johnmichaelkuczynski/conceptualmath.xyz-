---
name: QuantReason/qr-course runtime ops — long diagnostics, content reseed, demo audio
description: Non-obvious operational rules for the api-server diagnostics, content reskin propagation, and the demo video's narration audio.
---

## Long-running diagnostics through the Replit dev proxy

The `/api/diagnostics/*` routes that fan out to OpenAI (content-audit, synthetic-run,
expand-lectures) can take minutes. The Replit dev preview proxy idle-times-out and
**aborts** a request that sends no bytes within ~8-10s.

**Rule:** such routes must stream whitespace heartbeats (the `/diagnostics` middleware
writes `" "` every 4s, first byte at 4s) and finish with `sendJson` (leading whitespace
is still valid JSON). Don't flush a first byte synchronously — that locks in status 200
and breaks fast 400/404 validation paths.

**Verifying from the shell:** a background `curl` spawned via `nohup &` in one bash tool
call gets **reaped between tool calls**, so the request aborts (~8s) and never writes its
output. Run long diagnostics in a **single blocking** bash call (e.g. `curl -m 118 ...`,
tool timeout 120s). content-audit (28 lectures + 56 problems, concurrency 4) finishes
within ~110s.

**content-audit semantics:** `ok:false` does NOT mean broken — it means the auditor
flagged review items. Expect false positives (over-rigorous "repeated addition" nitpicks,
self-contradicting notes). The late-failure payload is `{ok:false,error}` with no
`summary/lectureIssues/problemIssues`, so UI must guard for a missing `summary`.

## Propagating a content (seed.ts) edit to the live DB

`seedIfEmpty` only wipes-and-reseeds when topic slugs differ OR a sentinel phrase in a
designated lecture differs. A pure content edit (e.g. fixing notation in a lecture body)
will NOT propagate on restart by itself.

**Rule:** to force propagation, bump `REVISION_SENTINEL_PHRASE` AND change the matching
phrase in the `REVISION_SENTINEL_SLUG` lecture body so they agree post-reseed, then
restart the api-server. Confirm new lecture IDs (they shift) and fetch the lecture via
`/api/course/lectures/:id` to verify the edit is live. Reseed wipes student progress.

## Demo video narration audio (qr-course-demo)

`public/audio/composite_audio.mp3` must match `SCENE_DURATIONS` in
`src/components/video/VideoTemplate.tsx` (VideoTemplate seeks the single `<audio>` to each
scene's start offset). Per-scene narration clips `vo_s1..vo_s6.mp3` are often longer than
their scene slots.

**Rule:** rebuild with `scripts/build-audio.sh` — it speed-ups-only via `atempo` to fit
each VO inside its slot (with head/tail pad), delays to the scene offset, mixes over
`bg_music.mp3` at volume 0.15 (`amix ... normalize=0`), and **asserts** each fitted clip
fits before writing. If you change `SCENE_DURATIONS`, update the `SLOTS` array in the
script and re-run it.
