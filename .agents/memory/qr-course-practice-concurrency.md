---
name: Practice-run submit/profile exactly-once
description: How the practice-run submit flow guarantees exactly-once profile increments and avoids leaking transient status into Zod-validated responses.
---

# Practice-run submit: exactly-once + no transient status

The practice-run grade/submit path (`artifacts/api-server/src/routes/practice-runs.ts`)
must apply per-topic mastery increments (`user_topic_profile`) exactly once even under
concurrent or repeated submits.

**Rule:** Gate the profile increments on the atomic `in_progress -> submitted`
transition, inside one `db.transaction`. Do the AI grading first (its only persisted
side effect is idempotent per-answer overwrites), then in the tx run
`UPDATE practice_runs SET status='submitted',... WHERE id=? AND user_id=? AND status='in_progress' RETURNING`;
only the request that gets a returned row runs `bumpProfile`. Losers skip increments.

**Why:** An earlier attempt used a transient `status='grading'` claim. That leaked the
`grading` value into responses whose Zod enum only allows `in_progress|submitted`
(`buildRunDetail`, list handler), so `*.parse()` would throw; and a crash mid-grading
left runs stuck in `grading`. Gating on the final transition instead means a crash just
leaves the run `in_progress` for a clean retry, and there is never an intermediate status.

**The same exactly-once rule applies to the GRADED attempt submit**
(`POST /assignments/attempts/:attemptId/submit`), not just practice runs. Both share
one atomic profile helper `bumpUserTopicProfile` in `artifacts/api-server/src/lib/profile.ts`
(also used by per-answer practice grading). Any submit endpoint that folds deltas into
`user_topic_profile` must gate them on its own atomic in_progress->submitted claim.

**How to apply:**
- Never introduce an intermediate `status` value unless the OpenAPI/Zod enum includes it.
- `bumpUserTopicProfile` is an atomic upsert (`onConflictDoUpdate` with `field = field + delta`),
  requires the unique index `user_topic_profile(user_id, topic_id)`.
- No-repeat: practice generation forbids the user's served-prompt history AND every
  graded prompt course-wide on the involved topics (query `problems` by topicId), so a
  practice item can never reproduce a question the student could be graded on.
- `served_prompts` has unique `(user_id, topic_id, prompt_hash)`; inserts use
  `onConflictDoNothing`. This keeps no-repeat history clean for sequential runs.
  Truly-concurrent run *creation* serving a dup prompt is an accepted limitation
  (this is an explicitly single-user self-paced course).
- Read paths coerce status defensively: `status === "submitted" ? "submitted" : "in_progress"`
  so any unexpected legacy value can never break a response parse.
