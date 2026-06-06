# Teach Yourself Developmental Mathematics — App Blueprint

A complete architectural blueprint for the *Teach Yourself Developmental Mathematics* 4-week course. This document is the single reference for what the app does, how it's wired, and the contracts between pieces. For day-to-day commands and gotchas see `replit.md`.

---

## 1. Product summary

Teach Yourself Developmental Mathematics is a self-paced, single-user, no-login web course that rebuilds the foundations of arithmetic and pre-algebra from the ground up — whole numbers and operations, fractions, decimals and percents, ratios and proportions, and the start of algebra. Each micro-lecture introduces one idea, grounds it in a concrete everyday example, and asks the student to write the answer *in proper math notation of their own* using the on-screen math keyboard.

It is a content reskin of the **QuantReason** Quantitative Reasoning app: the full runtime is preserved unchanged — lectures at three depths, section-scoped AI tutor, adaptive practice, AI-graded assignments, two-layer AI-authorship detection, and one-click diagnostics. Only the subject matter is new.

The product surface is three deployable artifacts in one pnpm monorepo:

| Artifact | Slug | Role |
| --- | --- | --- |
| `@workspace/api-server` | `api-server` | Express 5 API mounted at `/api`. Owns the DB, OpenAI calls, AI detection, grading, diagnostics. |
| `@workspace/qr-course` | `qr-course` | Student-facing React + Vite app. The actual course. |
| `@workspace/qr-course-demo` | `qr-course-demo` | A narrated screencast-style product demo video, exported as MP4 from the preview pane. |

Shared contracts live in `lib/`:

- `lib/api-spec` — OpenAPI source of truth.
- `lib/api-zod` — generated Zod validators (used by the server).
- `lib/api-client-react` — generated React Query hooks (used by `qr-course`).
- `lib/db` — Drizzle schema + db client.

---

## 2. Curriculum (the ideas)

Source: `artifacts/api-server/src/lib/seed.ts`. **28 micro-lectures across four weeks** (7 / 6 / 7 / 8). Each lecture teaches exactly one idea, anchors it in a real everyday example, and ships a question that *requires* the student to write the answer in proper math notation.

| Week | Theme | Lectures (count) | Concepts covered |
| --- | --- | --- | --- |
| 1 | Whole numbers, integers, and operations | 7 | Whole numbers & place value · addition & subtraction · multiplication & division · factors, multiples & primes · negative numbers & the number line · order of operations · word problems & problem-solving strategies |
| 2 | Fractions, decimals, percents, and ratios | 6 | Understanding fractions · adding & subtracting fractions · multiplying & dividing fractions · decimals & place value · converting fractions, decimals & percents · ratios, rates & proportions |
| 3 | Percents, measurement, and beginning algebra | 7 | Percent problems & applications · units, measurement & conversion · variables & expressions · simplifying & evaluating expressions · solving one-step equations · solving multi-step equations · translating words into equations |
| 4 | Graphing, exponents, polynomials, and geometry | 8 | The coordinate plane · graphing linear equations · slope & intercepts · exponents & powers · introduction to polynomials · basic geometry (perimeter, area, volume) · reading tables, charts & graphs · capstone synthesis |

Assignment shape: 2 homeworks per week plus a graded checkpoint at the end of each week — a Week 1 test, the midterm at the end of Week 2, a Week 3 test, and the cumulative final at the end of Week 4 — **12 assignments total**. Each problem prompt's canonical answer is *a piece of math notation* the student must compose (a fraction, an exponent, a percent, an expanded form, or an equation).

---

## 3. Domain model (Postgres + Drizzle)

Source: `lib/db/src/schema/course.ts`.

```
topics ──< lectures              (one topic, one lecture per length)
topics ──< problems              (problems tagged to a topic for analytics)
assignments ──< problems         (homework / test / midterm / final)
assignments ──< attempts ──< answers
                                ↑ per-answer keystroke trace + AI scores
practice_sessions ──< practice_problems ──< practice_attempts
                                            ↑ adaptive difficulty session
```

Notable columns:

- `lectures.body` / `body_medium` / `body_long` — the Short / Medium / Long toggle is three pre-baked LLM rewrites of the same lecture. Only `body` is seeded; the on-demand `expand-lectures` job fills in the longer two.
- `topics.weekNumber` — 1–4, drives the weekly grouping (Week 1 = 7 topics, Week 2 = 6, Week 3 = 7, Week 4 = 8).
- `answers.{keystrokeCount,eraseCount,bulkInsertCount,longestBulkInsertChars,rewriteSegments,durationMs}` — the **diachronic trace**, captured client-side from the textarea and submitted with the answer.
- `answers.{aiScore,aiFlagged,diachronicScore,diachronicFlagged,detectionRationale}` — frozen detection outcome at submission time.
- `practice_sessions.difficulty` (1–4, double) — adapts session-by-session based on streaks / accuracy.

Push schema with `pnpm --filter @workspace/db run push`.

### 3.1 Curriculum-swap reseed

`seedIfEmpty` maintains an `EXPECTED_TOPIC_SLUGS` set and a `REVISION_SENTINEL` constant (sentinel slug + a phrase that must appear in that lecture's body). On boot it compares the set of seeded topic slugs to the expected set, **and** verifies the sentinel phrase appears in the designated lecture:

- If both match: do nothing.
- If either differs (or the table is empty): wipe attempts, answers, practice, problems, assignments, lectures, topics in dependency order, then re-seed the full curriculum.

This is what lets a single content swap (e.g. swapping the previous curriculum out for the developmental-math one) propagate cleanly on the next server start, without manual DB surgery.

---

## 4. API surface (OpenAPI-first)

Source: `lib/api-spec/openapi.yaml`. **Never** hand-edit `lib/api-zod/src/generated/*` or `lib/api-client-react/src/generated/*` — change the spec and run `pnpm --filter @workspace/api-spec run codegen`.

| Tag | Endpoints | Purpose |
| --- | --- | --- |
| `course` | `GET /course/overview`, `GET /course/weeks/{n}`, `GET /course/lectures/{id}` | Read the static course tree. Lectures return Short/Medium/Long bodies. |
| `tutor` | `POST /tutor/ask` (SSE), `GET /tutor/suggestions/{lectureId}` | Streaming AI tutor scoped to a lecture section. Suggestions are pre-generated starter questions. |
| `practice` | `POST /practice/sessions`, `POST /practice/sessions/{id}/next`, `POST /practice/sessions/{id}/attempts` | Adaptive practice: server generates the next problem, scoring it adjusts session `difficulty`. |
| `assignments` | `GET /assignments`, `GET /assignments/{id}`, `POST /assignments/{id}/attempt`, `PUT /assignments/{id}/attempts/{aid}/answers/{pid}`, `POST /assignments/{id}/attempts/{aid}/submit` | Homework / test flow. Submit triggers AI grade + detection per answer. |
| `analytics` | `GET /analytics/summary`, `GET /analytics/topics`, `GET /analytics/activity` | KPIs, topic mastery, recent activity. |
| `detection` | `POST /detection/scan` | Run AI + diachronic detection on an arbitrary text + trace. Used by the diagnostics page. |
| `diagnostics` | `GET /diagnostics/system`, `POST /diagnostics/synthetic-run`, `POST /diagnostics/content-audit`, `POST /diagnostics/expand-lectures`, `POST /diagnostics/reset` | Self-tests, content quality control, and seed maintenance. See §8. |

The submit endpoint's response schema (`AttemptResult`) bundles `score / total / percent / perProblem[] / detection[]` so the UI can render the AI-grade + detection verdict in one round-trip.

---

## 5. Server architecture

### 5.1 Layout

```
artifacts/api-server/src/
├── routes/
│   ├── course.ts          read-only course tree
│   ├── tutor.ts           SSE chat against a lecture section
│   ├── practice.ts        adaptive session lifecycle
│   ├── assignments.ts     attempt + grade + detect on submit
│   ├── analytics.ts       summary / topic mastery / activity
│   ├── detection.ts       /detection/scan passthrough
│   ├── diagnostics.ts     three diagnostics + seed maintenance
│   ├── health.ts          /healthz
│   └── index.ts           router mount
└── lib/
    ├── ai.ts              OpenAI client (Replit AI Integrations proxy)
    ├── detection.ts       GPTZero + heuristic + diachronic scoring
    ├── grading.ts         AI-graded answer with rationale
    ├── seed.ts            28-topic curriculum + auto-reseed
    └── logger.ts          singleton pino logger (req.log in routes)
```

### 5.2 Conventions

- **Validation:** every handler parses input with `safeParse` from `@workspace/api-zod` and re-`parse`s outputs before sending. Never trust the request body, never trust your own response.
- **Logging:** `req.log.info(...)` inside routes; singleton `logger` everywhere else. **Never** `console.log` in server code.
- **OpenAI:** all model calls go through `lib/ai.ts` (`chatText`, `chatJson`, `chatStream`, `FAST_MODEL`).
- **Errors:** thrown errors bubble to a global error handler that logs and returns `{ error: string }` with the right status. Detection failures are **non-fatal** — they return `null` and the caller falls back.

---

## 6. Symbolic answer harness — `MathKeyboard.tsx`

The student-facing app (`artifacts/qr-course`) ships a floating, multi-tab math keyboard that opens when the answer textarea focuses. Pressing a key inserts the corresponding fragment at the textarea cursor. The keyboard exposes many subject tabs; the developmental-math curriculum leans on three:

- **Numbers** — the number pad with `+ − × ÷` (×/÷ inserted as `* / `), parentheses, `%`, `=`, and the decimal point. Fractions are written with `/`, percents with `%`.
- **Algebra** — variables, relation signs (`= ≠ ≈ ≤ ≥`), `√`, and the exponent keys `^2 / ^3 / ^n` for powers and polynomials.
- **Geometry** — `π`, `△`, `∠`, perimeter/area/volume letters (`r d A V C`) for the Week 4 geometry lectures.

The developmental-math curriculum is, by design, a clean load for this keyboard: most assignment answers are a fraction, an exponent, a percent, an expanded form, or an equation — each composed from the tabs above.

What the harness stresses:

| Sub-system | Stress |
| --- | --- |
| Tab discoverability | Each lecture's problems push the student into a specific tab; if a tab is hidden or mislabeled, the student gets stuck. |
| Cursor insertion | Fragments must land at the current caret without smearing surrounding text. |
| Keystroke detection | Each keyboard press counts as a real keystroke in the diachronic trace; otherwise typed-answer behaviour reads as a paste. |
| LaTeX-aware grading | Canonical answers may contain LaTeX/Unicode; the grader matches `\times`→`×`, `\div`→`÷`, `\frac{a}{b}`→`a/b`, `x^2`→`x²`, percents, and equations. |
| KaTeX rendering | Both lecture body and student answer-preview render the same notation. |

---

## 7. AI detection — `artifacts/api-server/src/lib/detection.ts`

Detection runs **two independent functions** and bundles their outputs into one `DetectionOutcome`.

### 7.1 Static AI detection (GPTZero, with fallback)

Question answered: *"Was this text written by an LLM?"*

Pipeline:

1. **`gptzeroAiScore(text)`** — calls `POST https://api.gptzero.me/v2/predict/text` with `x-api-key: $GPTZERO_API_KEY`. Reads `documents[0].class_probabilities.ai` (plus half-weight of `mixed`), falls back to `completely_generated_prob`. Returns `null` on missing key, network failure, malformed response, or text shorter than 40 chars.
2. **`heuristicAiScore(text)`** — local zero-dependency scorer. Penalises long average sentence length plus presence of LLM tells (`delve`, `tapestry`, `leverag(e|ing)`, `in conclusion`, `it is important to note`, `plays a crucial/vital/pivotal role`, etc.).
3. **`llmAiScore(text)`** — secondary fallback in JSON-only mode.

Blend (`detect()`):

```
if GPTZero responded:           aiScore = 0.85 * gptzero + 0.15 * heuristic
elif LLM scorer responded:      aiScore = 0.60 * llm     + 0.40 * heuristic
else:                           aiScore = heuristic
```

`aiFlagged = aiScore >= 0.55`.

### 7.2 Diachronic detection (keystroke pattern)

Question answered: *"Did the student paste AI output and reword it to sound human?"*

`diachronicScore(text, trace)` reads a `TraceInput`:

```
{ keystrokeCount, eraseCount, bulkInsertCount?, longestBulkInsertChars?,
  rewriteSegments?, durationMs }
```

Penalty points:

| Signal | Penalty | Why |
| --- | --- | --- |
| `longestBulkInsertChars > 40` *or* `longestBulkInsertChars / textLen > 0.4` | +0.50 | One paste covers most of the answer. |
| `bulkInsertCount >= 2 && longestBulkInsert > 25` | +0.15 | Multiple paste events. |
| `keystrokeCount / textLen < 0.6` with `textLen > 30` | +0.30 | Far fewer keys than characters of output — paste-like. |
| `charsPerSecond > 12` with `textLen > 30` | +0.20 | Sustained typing speed no human maintains. |
| `longestBulkInsert > 30 && rewriteSegments >= 2` | +0.15 | Big paste followed by reword passes — the giveaway pattern. |

Clamped to `[0, 1]`. `diachronicFlagged = diachronicScore >= 0.55`.

> ⚠️ The math keyboard interacts with diachronic detection: every keyboard press counts as a real `keydown` so the keystroke-to-output ratio stays human-shaped. If a future keyboard implementation inserts characters without dispatching keydowns, every symbolic answer will diachronically flag as paste — the keyboard *is* part of the detection contract.

---

## 8. Diagnostics surface

**Three diagnostics, one page.** The page lives at `artifacts/qr-course/src/pages/Diagnostics.tsx` and exposes all three with one-click buttons and raw output.

### 8.1 `GET /api/diagnostics/system` — System check

Strict ordered checklist returning `{ ok, generatedAt, steps[] }`:

1. **Environment** — `DATABASE_URL` present.
2. **Database** — `SELECT 1` round-trip.
3. **Database** — course content seeded (28 topics, ≥1 lecture / assignment / problem).
4. **OpenAI** — fast-model chat completion returns non-empty text.
5. **OpenAI** — JSON mode returns `{ ok: true }`.
6. **Detection** — heuristic+scoring pipeline returns numbers for a benign sentence.
7. **AI detection** — pasted-style LLM-tell text **flags** as AI.
8. **GPTZero** — if `GPTZERO_API_KEY` is set, the real API responds and gives a non-null score.

> Note: `system` is a `GET`. A `POST` to the same path returns 404 by design.

### 8.2 `POST /api/diagnostics/synthetic-run` — Synthetic student

Simulates a real student session against the live DB:

1. Load the course catalog and read each lecture.
2. Walk all 12 assignments and confirm each loads.
3. Create a practice session, submit a wrong answer then a right one, and confirm difficulty adjusts.
4. Create an assignment attempt, answer each problem, submit, and verify `AttemptResult` returns full `perProblem[]` + `detection[]`.
5. Ask the AI tutor with lecture context, run a detection scan, and hit the analytics endpoints to confirm the new attempt is reflected.

### 8.3 `POST /api/diagnostics/content-audit` — Content auditor (OpenAI quality control)

The OpenAI-based **quality-control** diagnostic that **verifies the legitimacy of the seeded content**:

1. Loads every lecture (28) and every problem (56) from the DB.
2. For each **lecture**, asks OpenAI to fact-check the body and report any mathematical errors or misleading claims (`auditLecture`, concurrency 4).
3. For each **problem**, asks OpenAI to independently solve the prompt and confirm the stored `correctAnswer` is actually correct (`auditProblem`, concurrency 4) — this is the leg that **verifies the legitimacy of answers**.
4. Returns `{ ok, summary{ lecturesChecked, problemsChecked, lecturesWithIssues, problemsWithIssues }, lectureIssues[], problemIssues[] }`. `ok` is true only when nothing is flagged. Runs with a 15-minute response timeout because it fans out across all content.

### 8.4 Supporting routes (not surfaced as primary diagnostics)

- `POST /api/diagnostics/expand-lectures` — generates `body_medium` / `body_long` for lectures missing them. Idempotent.
- `POST /api/diagnostics/reset` — wipes attempts / answers / practice for a clean demo. Does **not** drop course content.

---

## 9. Student app — `@workspace/qr-course`

React + Vite + Tailwind. Routes:

| Route | Page | What it does |
| --- | --- | --- |
| `/` | `Dashboard` | Assignments progress + Course Schedule + Recent Activity |
| `/weeks/:weekNumber` | `WeekView` | List of week's lectures and assignments |
| `/lectures/:lectureId` | `LectureView` | Lecture body + Short/Medium/Long toggle + right-rail tutor / practice |
| `/practice/topic/:topicId` | `TopicPractice` | Adaptive single-topic drill |
| `/assignments` | `Assignments` | All homework / tests / midterm / final |
| `/assignments/:id` | `AssignmentRunner` | Take + review an assignment; shows AI grade + detection per answer |
| `/analytics` | `Analytics` | KPIs, topic mastery table, recent activity |
| `/diagnostics` | `Diagnostics` | Operator self-test UI (see §8) |

All server data goes through the **generated** React Query hooks from `@workspace/api-client-react`. No fetch logic should be hand-written in components.

### 9.1 Diachronic trace capture

The answer `<textarea>` is wrapped in a hook (in the assignment runner / topic practice) that:

- Counts every `keydown` (excluding modifier-only) into `keystrokeCount`.
- Increments `eraseCount` on Backspace/Delete.
- On every `input` event, compares the new value to the previous: if the diff inserted ≥4 chars in one tick, that's a "bulk insert" — increment `bulkInsertCount` and update `longestBulkInsertChars`.
- Detects a "rewrite segment" when characters are erased mid-string and replaced with new ones.
- Stamps `durationMs` = (submit time − first focus time).

The trace is included in the answer `PUT` body and on `POST submit`, then stored verbatim on `answers` so detection is reproducible.

---

## 10. Demo video — `@workspace/qr-course-demo`

A **narrated screencast-style** product walkthrough of the developmental-math course UI, **not** a marketing reel. Built per the `video-js` skill: React + framer-motion, exported to MP4 from the preview pane via the browser recorder.

```
artifacts/qr-course-demo/src/components/video/
├── VideoTemplate.tsx        scene router + persistent sidebar + persistent cursor + composite audio
├── VideoWithControls.tsx    iframe-only wrapper: scene jump, scene-lock, mute toggle
├── useSceneControls.ts      hook hiding jump/lock workarounds for useVideoPlayer
├── CursorPointer.tsx        animated SVG arrow
├── TypewriterText.tsx       char-by-char typing into inputs
├── StreamingText.tsx        word-by-word AI-response streaming
├── TypingIndicator.tsx      three pulsing dots
└── video_scenes/
    ├── Scene1.tsx           Dashboard → Week 1 "Whole numbers and operations" → open lecture 1.1 (8s)
    ├── Scene2.tsx           Lecture 1.1 "Whole numbers and place value": Short/Long depth toggle + Practice/Tutor tabs (8s)
    ├── Scene3.tsx           Tutor Q&A grounded in lecture 1.1 (12s)
    ├── Scene4.tsx           Analytics: KPIs + Week-1 topic-mastery table (10s)
    ├── Scene5.tsx           Topic Practice "Factors, multiples, and primes": symbolic answer via the math keyboard, adaptive difficulty (14s)
    └── Scene6.tsx           Assignments review with AI grade + AI-detection chip (10s)
```

`SCENE_DURATIONS` sums to **62 seconds**, looped.

### 10.1 Audio (background music + narration)

The video ships **with audio**: a single pre-mixed track at `public/audio/composite_audio.mp3`, scene-synced via `SCENE_START_SEC` using the same seek logic as before.

- **Background music** — `public/audio/bg_music.mp3`, mixed in low (≈15%).
- **Narration voiceover** — six per-scene clips (`public/audio/vo_s1.mp3` … `vo_s6.mp3`), generated with text-to-speech, each delayed to its scene's start offset.
- **Composite** — the bg music + the six delayed voiceovers are pre-mixed into `composite_audio.mp3` with `ffmpeg` (clips for scenes 1, 2, and 6 are `atempo`-fitted to their slots). Per-scene `<audio src>` swaps drift in recorded exports, so a single composite aligned to the scene timeline is the contract. To regenerate after changing the script or scene durations, rebuild the per-scene clips and re-run the `ffmpeg` mix, then keep `VideoTemplate` pointed at `composite_audio.mp3`.

### 10.2 Key architectural rules

- **Sidebar persistence.** Sidebar lives in `VideoTemplate.tsx` outside `<AnimatePresence>`. Only the right-pane scene swaps.
- **Cursor persistence.** `CursorPointer` lives outside `<AnimatePresence>` and is driven by `setCursorPos / setIsClicking` passed into every scene.
- **The UI is rebuilt, not screenshotted.** Scenes use the real fonts and colours but every pixel is JSX.
- **`AnimatePresence` key = `currentSceneKey`** (NOT `baseSceneKey`). When scene-lock toggles `_r1` / `_r2`, both iterations must remount.
- **Mute wiring.** The mute toggle is declarative JSX (`<audio muted={muted}>`) only — it must not also re-seek `audio.currentTime`, or unmute restarts the scene's audio.

---

## 11. README contract

`replit.md` and `README.md` are the always-loaded project READMEs. They contain:

1. **Product overview** — what the course is and why this build exists (rebuilding the foundations of arithmetic and pre-algebra).
2. **Required env / secrets** — `DATABASE_URL`, `OPENAI_API_KEY`, `GPTZERO_API_KEY`, `SESSION_SECRET`.
3. **Curriculum summary** — the 28 lectures across four weeks.
4. **Technical features** — symbolic-answer harness, two-layer detection, three diagnostics, auto-reseed, contract-first API.

If you change anything in this blueprint, update `README.md` and `replit.md` to match — they are the long-form and short-form views of the same truth.

---

## 12. End-to-end request example

A student submits Homework 1.1 (whole numbers and operations). The full path:

1. Browser: `qr-course/src/pages/AssignmentRunner.tsx` calls the generated `useSubmitAttempt()` hook with `{ traces: { [problemId]: TraceInput } }`. Every fraction, `×`, `÷`, exponent, and `%` in the answer was inserted by `MathKeyboard.tsx`, but each insert dispatched a real `keydown` so the trace looks human.
2. Generated client: `POST /api/assignments/{id}/attempts/{aid}/submit`, validated against `SubmitAttemptBody` Zod schema.
3. Express route (`routes/assignments.ts`):
   - Loads `attempt` + `answers` + `problems` from Drizzle.
   - For each answer: calls `gradeAnswer(problem, answer)` (OpenAI JSON mode, returns `{ correct, rationale }`) **and** `detect(answer.text, trace)` in parallel.
   - Writes `correct`, `aiScore`, `aiFlagged`, `diachronicScore`, `diachronicFlagged`, `detectionRationale` back onto each answer row.
   - Updates `attempts.status = "submitted"`, computes `scorePercent`.
4. Returns `AttemptResult` validated against the generated Zod schema.
5. Browser: `AssignmentRunner` renders per-problem cards with the AI grade rationale + a detection chip (`Human-written response · confidence 94%` or `AI-detected · 91%`).

Every layer in that chain (spec → server zod → server logic → client hook → client zod) is generated or validated from the same `openapi.yaml`. Don't introduce a parallel path.
