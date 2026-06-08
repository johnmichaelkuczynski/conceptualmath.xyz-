import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  problemsTable,
  attemptsTable,
  answersTable,
  topicsTable,
  practiceRunsTable,
} from "@workspace/db";
import {
  GetAssignmentResponse,
  ListAssignmentsResponse,
  SaveAnswerBody,
  StartAssignmentAttemptResponse,
  GetAttemptResponse,
  SubmitAttemptResponse,
} from "@workspace/api-zod";
import { gradeAnswer } from "../lib/grading";
import { detect } from "../lib/detection";
import { getUserId } from "../middlewares/requireAuth";
import { bumpUserTopicProfile } from "../lib/profile";

const router: IRouter = Router();

// Lightweight readiness label for assignment lists (full topic-aware
// readiness lives in the practice-runs route).
function quickReadiness(
  practiceRunCount: number,
  bestPracticeScore: number | null,
): "not_ready" | "building" | "almost" | "ready" {
  if (practiceRunCount === 0 || bestPracticeScore == null) return "not_ready";
  if (bestPracticeScore >= 85) return "ready";
  if (bestPracticeScore >= 70) return "almost";
  if (bestPracticeScore >= 50) return "building";
  return "not_ready";
}

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

router.get("/assignments", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(assignmentsTable)
    .orderBy(asc(assignmentsTable.weekNumber), asc(assignmentsTable.position));
  // Pull this user's practice runs once, group by assignment.
  const runs = await db
    .select()
    .from(practiceRunsTable)
    .where(eq(practiceRunsTable.userId, userId));
  const runsByAssignment = new Map<
    number,
    { count: number; best: number | null }
  >();
  for (const r of runs) {
    if (r.status !== "submitted" || r.scorePercent == null) continue;
    const cur = runsByAssignment.get(r.assignmentId) ?? { count: 0, best: null };
    cur.count += 1;
    cur.best = cur.best == null ? r.scorePercent : Math.max(cur.best, r.scorePercent);
    runsByAssignment.set(r.assignmentId, cur);
  }
  const result = await Promise.all(
    rows.map(async (a) => {
      const counts = await db.execute(
        sql`select count(*)::int as n from problems where assignment_id = ${a.id}`,
      );
      const n = (counts.rows[0] as { n?: number } | undefined)?.n ?? 0;
      const attempts = await db
        .select()
        .from(attemptsTable)
        .where(
          and(
            eq(attemptsTable.assignmentId, a.id),
            eq(attemptsTable.userId, userId),
          ),
        )
        .orderBy(asc(attemptsTable.id));
      const submitted = attempts.filter((x) => x.status === "submitted");
      const inProgress = attempts.find((x) => x.status === "in_progress");
      const best = submitted.reduce(
        (b, x) => (x.scorePercent != null && x.scorePercent > b ? x.scorePercent : b),
        -1,
      );
      const status: "not_started" | "in_progress" | "submitted" = inProgress
        ? "in_progress"
        : submitted.length > 0
        ? "submitted"
        : "not_started";
      const last = attempts[attempts.length - 1];
      const practice = runsByAssignment.get(a.id) ?? { count: 0, best: null };
      return {
        id: a.id,
        kind: a.kind as "homework" | "test" | "midterm" | "final",
        title: a.title,
        weekNumber: a.weekNumber,
        problemCount: n,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        status,
        bestScore: best < 0 ? null : best,
        lastAttemptId: last?.id ?? null,
        practiceRunCount: practice.count,
        bestPracticeScore: practice.best,
        readinessLabel: quickReadiness(practice.count, practice.best),
      };
    }),
  );
  res.json(ListAssignmentsResponse.parse(result));
});

router.get("/assignments/:assignmentId", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.assignmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [a] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const problems = await db
    .select({
      id: problemsTable.id,
      position: problemsTable.position,
      prompt: problemsTable.prompt,
      topicId: problemsTable.topicId,
      topicTitle: topicsTable.title,
      hint: problemsTable.hint,
    })
    .from(problemsTable)
    .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(eq(problemsTable.assignmentId, id))
    .orderBy(asc(problemsTable.position));
  res.json(
    GetAssignmentResponse.parse({
      id: a.id,
      kind: a.kind as "homework" | "test" | "midterm" | "final",
      title: a.title,
      weekNumber: a.weekNumber,
      isTimed: a.isTimed,
      timeLimitMinutes: a.timeLimitMinutes,
      instructions: a.instructions,
      problems,
    }),
  );
});

async function loadAttempt(attemptId: number) {
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.id, attemptId));
  if (!attempt) return null;
  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.attemptId, attemptId));
  return {
    id: attempt.id,
    assignmentId: attempt.assignmentId,
    status: attempt.status as "in_progress" | "submitted",
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    answers: answers.map((x) => ({
      problemId: x.problemId,
      answer: x.answer,
      keystrokeCount: x.keystrokeCount,
      eraseCount: x.eraseCount,
    })),
  };
}

router.post("/assignments/:assignmentId/start", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.assignmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [a] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "assignment not found" });
    return;
  }

  // Resume any in-progress attempt for this user
  const [existing] = await db
    .select()
    .from(attemptsTable)
    .where(
      and(
        eq(attemptsTable.assignmentId, id),
        eq(attemptsTable.status, "in_progress"),
        eq(attemptsTable.userId, userId),
      ),
    );
  if (existing) {
    const state = await loadAttempt(existing.id);
    res.json(StartAssignmentAttemptResponse.parse(state));
    return;
  }

  const deadlineAt =
    a.isTimed && a.timeLimitMinutes
      ? new Date(Date.now() + a.timeLimitMinutes * 60_000)
      : null;
  const [created] = await db
    .insert(attemptsTable)
    .values({ assignmentId: id, status: "in_progress", deadlineAt, userId })
    .returning();
  if (!created) {
    res.status(500).json({ error: "failed to create" });
    return;
  }
  const state = await loadAttempt(created.id);
  res.json(StartAssignmentAttemptResponse.parse(state));
});

router.get("/assignments/attempts/:attemptId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [owner] = await db
    .select({ userId: attemptsTable.userId })
    .from(attemptsTable)
    .where(eq(attemptsTable.id, id));
  if (!owner || owner.userId !== userId) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  const state = await loadAttempt(id);
  if (!state) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  res.json(GetAttemptResponse.parse(state));
});

router.put("/assignments/attempts/:attemptId/answer", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = SaveAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;

  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.id, id));
  if (!attempt || attempt.userId !== userId) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(400).json({ error: "attempt already submitted" });
    return;
  }
  if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
    res.status(403).json({ error: "time limit exceeded" });
    return;
  }

  const [existing] = await db
    .select()
    .from(answersTable)
    .where(and(eq(answersTable.attemptId, id), eq(answersTable.problemId, problemId)));

  const values = {
    attemptId: id,
    problemId,
    answer,
    keystrokeCount: trace.keystrokeCount,
    eraseCount: trace.eraseCount,
    bulkInsertCount: trace.bulkInsertCount ?? 0,
    longestBulkInsertChars: trace.longestBulkInsertChars ?? 0,
    rewriteSegments: trace.rewriteSegments ?? 0,
    durationMs: trace.durationMs,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(answersTable).set(values).where(eq(answersTable.id, existing.id));
  } else {
    await db.insert(answersTable).values(values);
  }
  res.json({ ok: true });
});

router.post("/assignments/attempts/:attemptId/submit", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.id, id));
  if (!attempt || attempt.userId !== userId) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  const problems = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.assignmentId, attempt.assignmentId))
    .orderBy(asc(problemsTable.position));
  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.attemptId, id));
  const byProblem = new Map(answers.map((a) => [a.problemId, a]));

  const perProblem = [];
  const detection = [];
  let score = 0;
  const topicAgg = new Map<number, { attempts: number; correct: number }>();
  for (const p of problems) {
    const a = byProblem.get(p.id);
    const userAnswer = a?.answer ?? "";
    const graded = await gradeAnswer({
      prompt: p.prompt,
      correctAnswer: p.correctAnswer,
      userAnswer,
    });
    if (graded.correct) score += 1;
    const cur = topicAgg.get(p.topicId) ?? { attempts: 0, correct: 0 };
    cur.attempts += 1;
    if (graded.correct) cur.correct += 1;
    topicAgg.set(p.topicId, cur);
    perProblem.push({
      problemId: p.id,
      correct: graded.correct,
      userAnswer,
      correctAnswer: p.correctAnswer,
      explanation: graded.explanation || p.explanation,
    });

    if (a && userAnswer.trim().length > 0) {
      const det = await detect(userAnswer, {
        keystrokeCount: a.keystrokeCount,
        eraseCount: a.eraseCount,
        bulkInsertCount: a.bulkInsertCount,
        longestBulkInsertChars: a.longestBulkInsertChars,
        rewriteSegments: a.rewriteSegments,
        durationMs: a.durationMs,
      });
      detection.push({ problemId: p.id, ...det });
      await db
        .update(answersTable)
        .set({
          correct: graded.correct,
          aiScore: det.aiScore,
          aiFlagged: det.aiFlagged,
          diachronicScore: det.diachronicScore,
          diachronicFlagged: det.diachronicFlagged,
          detectionRationale: det.rationale,
        })
        .where(eq(answersTable.id, a.id));
    } else if (a) {
      await db
        .update(answersTable)
        .set({ correct: graded.correct })
        .where(eq(answersTable.id, a.id));
    }
  }

  const total = problems.length;
  const percent = total === 0 ? 0 : (score / total) * 100;

  // Finalize atomically. The graded mastery deltas are folded into the per-user
  // profile ONLY by the single request that wins the in_progress -> submitted
  // transition, so a repeated or concurrent submit of the same attempt can never
  // double-count gradedAttempts/gradedCorrect (which would skew readiness).
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(attemptsTable)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        scorePercent: percent,
      })
      .where(
        and(
          eq(attemptsTable.id, id),
          eq(attemptsTable.userId, userId),
          eq(attemptsTable.status, "in_progress"),
        ),
      )
      .returning();
    if (!claimed) return; // Already submitted elsewhere — skip mastery deltas.
    for (const [topicId, agg] of topicAgg.entries()) {
      await bumpUserTopicProfile(tx, userId, topicId, {
        gradedAttempts: agg.attempts,
        gradedCorrect: agg.correct,
      });
    }
  });

  res.json(
    SubmitAttemptResponse.parse({
      attemptId: id,
      score,
      total,
      percent,
      perProblem,
      detection,
    }),
  );
});

export default router;
