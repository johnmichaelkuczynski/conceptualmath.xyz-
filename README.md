# 🧮 Developmental Mathematics

**A Four-Week Course That Rebuilds the Foundations — From Place Value to the Start of Algebra**

---

## 🧩 Overview

Developmental Mathematics is a self-paced, single-user web course for anyone who wants to rebuild their arithmetic from the ground up: what numbers really are, how the four operations work, and why the rules you half-remember are actually true. It covers whole numbers and operations, fractions, decimals and percents, ratios and proportions, and a first taste of algebra.

It is a content reskin of the **QuantReason** Quantitative Reasoning app. The full QuantReason runtime — lectures with Short / Medium / Long depth, section-scoped AI tutor, adaptive practice, AI-graded homework / tests / midterm / final, two-layer AI-authorship detection, and one-click diagnostics — is preserved unchanged. Only the **subject matter** is new: the same proven format, now teaching developmental (foundational) math.

---

## 🧠 What It Does

- **Four-Week Curriculum of 28 Micro-Lectures** — Organized by theme:
  - **Week 1 — Whole numbers, integers, and operations** (7 lectures): whole numbers and place value; addition and subtraction; multiplication and division; factors, multiples, and primes; negative numbers and the number line; order of operations; word problems and problem-solving strategies.
  - **Week 2 — Fractions, decimals, percents, and ratios** (6 lectures): understanding fractions; adding and subtracting fractions; multiplying and dividing fractions; decimals and place value; converting fractions, decimals, and percents; ratios, rates, and proportions.
  - **Week 3 — Percents, measurement, and beginning algebra** (7 lectures): percent problems and applications; units, measurement, and conversion; introduction to variables and expressions; simplifying and evaluating expressions; solving one-step equations; solving multi-step equations; translating words into equations.
  - **Week 4 — Graphing, exponents, polynomials, and geometry** (8 lectures): the coordinate plane; graphing linear equations; slope and intercepts; exponents and powers; introduction to polynomials; basic geometry (perimeter, area, volume); reading tables, charts, and graphs; capstone synthesis.
- **One Real Example per Lecture** — Every micro-lecture grounds its idea in a concrete, everyday example: place value vs. Roman numerals, splitting a recipe, sale prices and percents off, scaling a map, reading a utility bill, balancing a checkbook with negatives, and the prime "fingerprint" of a number.
- **One Symbolic / Computational Question per Lecture** — Every homework / test / midterm / final problem requires the student to *write the answer in proper math notation* — fractions, exponents, the ×/÷/− signs, percents, equations, and expanded form — not just describe it in English. The on-screen math keyboard is the natural way to compose these answers.
- **Three-Depth Lectures, Section-Scoped Tutor, Adaptive Practice, AI Grading, Two-Layer Detection, Operator Diagnostics** — All inherited unchanged from the QuantReason runtime.
- **12 Graded Assignments** — Two homeworks per week plus a graded weekly checkpoint: Week 1 test, end-of-Week-2 midterm, Week 3 test, and an end-of-Week-4 cumulative final.
- **Built-In Product Demo Video** — The companion `qr-course-demo` artifact ships as a short narrated screencast of the live UI, reskinned to the developmental-math curriculum.

---

## ⚙️ Technical Features

- **Symbolic Answer Harness** — Every problem prompt is structured so the canonical answer is a piece of math notation. Both prompt rendering (KaTeX) and answer entry/grading (LaTeX-aware AI grader with numeric short-circuit) handle fractions, exponents, percents, the multiplication/division signs, expanded form, and equations cleanly.
- **Static AI Detection (GPTZero):** Every submitted answer is sent to GPTZero's `predict/text` endpoint; the per-document AI probability is blended `0.85 × GPTZero + 0.15 × structural-heuristic` for the final score. If GPTZero is unavailable, the system silently falls back to an LLM scorer plus heuristic — submissions never block.
- **Diachronic Keystroke Detection:** The student textarea captures keystroke count, erase count, bulk-insert events, longest bulk insert, rewrite segments, and total duration. A scorer penalizes paste-then-reword behavior, low keystroke-to-output ratios, and impossibly sustained typing speeds.
- **Three One-Click Diagnostics** —
  - **System Diagnostic (`GET /api/diagnostics/system`):** environment, database round-trip, course-seed integrity, OpenAI chat completion, OpenAI JSON mode, detection pipeline, AI-positive control sample, and GPTZero connectivity.
  - **Synthetic-Student Diagnostic (`POST /api/diagnostics/synthetic-run`):** end-to-end stack proof — a fake student takes a practice session and a full assignment attempt, submits, and verifies grading + detection + analytics all reflect the run.
  - **Content Auditor (`POST /api/diagnostics/content-audit`):** OpenAI-based quality control that fact-checks every lecture and **verifies the legitimacy of every problem's answer** — confirming each seeded `correctAnswer` is actually correct for its prompt and flagging any mathematical errors.
- **Auto-Reseed on Curriculum Change** — `seedIfEmpty` compares the set of topic slugs in the database to the expected curriculum *and* checks a sentinel phrase in a designated lecture. If either differs, it wipes and re-seeds in dependency order. A single content swap propagates cleanly on the next server start.
- **Contract-First API** — Single OpenAPI document; React Query hooks for the UI and Zod validators for the server are generated from it.
- **Streaming AI Tutor** — Token-by-token Server-Sent-Event streaming with a section-scoped system prompt grounded in the active lecture.
- **Adaptive Practice Engine** — Per-session difficulty (1–4) adjusts after each attempt; problems are generated on demand.

---

## 🔐 Required Secrets

- `DATABASE_URL` — Postgres connection string for the external database.
- `OPENAI_API_KEY` — required at boot. Powers the tutor, practice generator, AI graders, content auditor, and lecture-expansion job.
- `GPTZERO_API_KEY` — required for the GPTZero leg of the static-AI-detection layer. Without it, the system falls back to the LLM scorer + heuristic but loses the primary detection signal.
- `SESSION_SECRET` — signed-session cookie secret.

All are requested via the secrets panel; none is hard-coded.

---

## 🎓 Designed For

- **Anyone Returning to Math:** Students prepping for a placement test, adult learners, or anyone who wants the arithmetic and pre-algebra foundations to finally make sense — not as memorized procedures, but as ideas you can reconstruct.
- **The Maintainer of QuantReason and Its Clones:** A clean stress test of the math-notation stack — keyboard, LaTeX rendering, grading, and AI detection — under a different curriculum, with answers built from fractions, exponents, percents, and equations.

---

## 💡 Core Idea

Most math help reteaches the *procedures* — how to borrow, how to flip-and-multiply, how to move a term across the equals sign. Far fewer explain *why* those procedures work. This course is built around the why: what place value buys you, why dividing by zero is undefined, why "of" means multiply, why you can do the same thing to both sides of an equation.

Read the idea, see it grounded in an everyday example, then write the answer in proper notation of your own.

**Developmental Mathematics — read the idea, ground the idea, write the idea.**
