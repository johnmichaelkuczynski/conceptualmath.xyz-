import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  topicsTable,
  assignmentsTable,
  attemptsTable,
  diagnosticAttemptsTable,
  diagnosticQuestionsTable,
  diagnosticAnswersTable,
} from "@workspace/db";
import { getUserId } from "../middlewares/requireAuth";
import { gradeAnswer } from "../lib/grading";
import { detect } from "../lib/detection";
import { bumpUserTopicProfile } from "../lib/profile";
import {
  ASSESSMENTS,
  getAssessment,
  VERSION_META,
  isAssessmentVersion,
  formatForIndex,
  type AssessmentVersion,
} from "../lib/assessments";
import { generateDiagnosticQuestion } from "../lib/diagnostic-gen";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

function normalizeChoice(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function letterFromPercent(p: number): string {
  if (p >= 93) return "A";
  if (p >= 90) return "A−";
  if (p >= 87) return "B+";
  if (p >= 83) return "B";
  if (p >= 80) return "B−";
  if (p >= 77) return "C+";
  if (p >= 73) return "C";
  if (p >= 70) return "C−";
  if (p >= 67) return "D+";
  if (p >= 60) return "D";
  return "F";
}

type AttemptRow = typeof diagnosticAttemptsTable.$inferSelect;

async function buildAttemptDetail(attempt: AttemptRow) {
  const questions = await db
    .select()
    .from(diagnosticQuestionsTable)
    .where(eq(diagnosticQuestionsTable.attemptId, attempt.id))
    .orderBy(asc(diagnosticQuestionsTable.position));
  const answers = await db
    .select()
    .from(diagnosticAnswersTable)
    .where(eq(diagnosticAnswersTable.attemptId, attempt.id));
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const completed = attempt.status === "completed";

  return {
    id: attempt.id,
    assessmentSlug: attempt.assessmentSlug,
    assessmentTitle: attempt.assessmentTitle,
    version: attempt.version,
    isOfficial: attempt.isOfficial,
    isCustom: attempt.isCustom,
    customScope: attempt.customScope ?? null,
    coverageFromWeek: attempt.coverageFromWeek ?? null,
    coverageToWeek: attempt.coverageToWeek ?? null,
    status: attempt.status,
    scorePercent: attempt.scorePercent ?? null,
    questions: questions.map((q) => ({
      id: q.id,
      position: q.position,
      format: q.format,
      prompt: q.prompt,
      choices: Array.isArray(q.choices) ? (q.choices as string[]) : null,
      topicTitle: q.topicTitle ?? null,
      // Reveal answer + explanation only after completion.
      correctAnswer: completed ? q.correctAnswer : null,
      explanation: completed ? q.explanation : null,
    })),
    answers: questions.map((q) => {
      const a = answerByQuestion.get(q.id);
      return {
        questionId: q.id,
        answer: a?.answer ?? "",
        correct: completed ? a?.correct ?? null : null,
        feedback: completed ? a?.feedback ?? null : null,
        aiFlagged: completed ? a?.aiFlagged ?? null : null,
        diachronicFlagged: completed ? a?.diachronicFlagged ?? null : null,
        detectionRationale: completed ? a?.detectionRationale ?? null : null,
      };
    }),
    createdAt: attempt.createdAt.toISOString(),
    completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
  };
}

// Generate questions + persist them for a freshly-created attempt.
async function populateQuestions(opts: {
  attemptId: number;
  version: AssessmentVersion;
  fromWeek: number;
  toWeek: number;
  userId: string;
  assessmentSlug: string;
  customScope?: string | null;
}): Promise<boolean> {
  const meta = VERSION_META[opts.version];
  const length = meta.length;

  // Topics in coverage (used for round-robin + profile tagging).
  const coverageTopics = await db
    .select()
    .from(topicsTable)
    .where(
      and(
        gte(topicsTable.weekNumber, opts.fromWeek),
        lte(topicsTable.weekNumber, opts.toWeek),
      ),
    )
    .orderBy(asc(topicsTable.position));
  if (coverageTopics.length === 0) return false;

  // Avoid repeating prompts the user has already seen on this assessment.
  const prior = await db
    .select({ prompt: diagnosticQuestionsTable.prompt })
    .from(diagnosticQuestionsTable)
    .innerJoin(
      diagnosticAttemptsTable,
      eq(diagnosticQuestionsTable.attemptId, diagnosticAttemptsTable.id),
    )
    .where(
      and(
        eq(diagnosticAttemptsTable.userId, opts.userId),
        eq(diagnosticAttemptsTable.assessmentSlug, opts.assessmentSlug),
      ),
    )
    .orderBy(desc(diagnosticQuestionsTable.id))
    .limit(60);
  const avoidTexts = prior.map((p) => p.prompt);

  const isCustom = !!opts.customScope;
  const scopeHint = isCustom
    ? `The student specifically requested this focus: "${opts.customScope}". Stay tightly on that scope.`
    : opts.fromWeek === opts.toWeek
    ? `Cover material from week ${opts.fromWeek} of the course.`
    : `Cover a balanced mix of material from weeks ${opts.fromWeek} through ${opts.toWeek}.`;

  const plans = Array.from({ length }, (_, i) => {
    const topic = coverageTopics[i % coverageTopics.length]!;
    return {
      i,
      format: formatForIndex(meta.mix, i),
      topicId: isCustom ? null : topic.id,
      topicTitle: isCustom ? "Your custom focus" : topic.title,
      genTopic: isCustom ? (opts.customScope as string) : topic.title,
    };
  });

  let generated;
  try {
    generated = await Promise.all(
      plans.map((p) =>
        generateDiagnosticQuestion(p.format, p.genTopic, scopeHint, avoidTexts),
      ),
    );
  } catch {
    return false;
  }

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i]!;
    const g = generated[i]!;
    const [q] = await db
      .insert(diagnosticQuestionsTable)
      .values({
        attemptId: opts.attemptId,
        position: i,
        format: g.format,
        topicId: p.topicId,
        topicTitle: p.topicTitle,
        prompt: g.prompt,
        choices: g.choices ?? null,
        correctAnswer: g.correctAnswer,
        explanation: g.explanation,
      })
      .returning();
    if (q) {
      await db
        .insert(diagnosticAnswersTable)
        .values({ attemptId: opts.attemptId, questionId: q.id, answer: "" });
    }
  }
  return true;
}

// GET /assessments — the 7 definitions with this user's status + custom history.
router.get("/assessments", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const attempts = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.userId, userId))
    .orderBy(desc(diagnosticAttemptsTable.id));

  const bySlug = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const arr = bySlug.get(a.assessmentSlug) ?? [];
    arr.push(a);
    bySlug.set(a.assessmentSlug, arr);
  }

  const assessments = ASSESSMENTS.map((def) => {
    const list = bySlug.get(def.slug) ?? [];
    const completed = list.filter((a) => a.status === "completed");
    const officialCompleted = completed.some((a) => a.isOfficial);
    const scores = completed
      .map((a) => a.scorePercent)
      .filter((s): s is number => typeof s === "number");
    return {
      slug: def.slug,
      title: def.title,
      placement: def.placement,
      weekNumber: def.weekNumber,
      coverageFromWeek: def.coverageFromWeek,
      coverageToWeek: def.coverageToWeek,
      description: def.description,
      attemptsCount: list.length,
      completedCount: completed.length,
      officialCompleted,
      lastScorePercent: completed[0]?.scorePercent ?? null,
      bestScorePercent: scores.length > 0 ? Math.max(...scores) : null,
    };
  });

  const custom = (bySlug.get("custom") ?? []).map((a) => ({
    id: a.id,
    customScope: a.customScope ?? "",
    version: a.version,
    status: a.status,
    scorePercent: a.scorePercent ?? null,
    createdAt: a.createdAt.toISOString(),
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
  }));

  res.json({ assessments, custom });
});

const StartBody = z.object({
  version: z.string().refine(isAssessmentVersion, "invalid version"),
});

// POST /assessments/:slug/start — generate a fresh attempt of one of the 7.
router.post("/assessments/:slug/start", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const slug = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  const def = getAssessment(slug ?? "");
  if (!def) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const version = parsed.data.version as AssessmentVersion;
  const meta = VERSION_META[version];

  const [attempt] = await db
    .insert(diagnosticAttemptsTable)
    .values({
      userId,
      assessmentSlug: def.slug,
      assessmentTitle: def.title,
      version,
      isOfficial: meta.isOfficial,
      isCustom: false,
      coverageFromWeek: def.coverageFromWeek,
      coverageToWeek: def.coverageToWeek,
      status: "in_progress",
    })
    .returning();
  if (!attempt) {
    res.status(500).json({ error: "failed to create attempt" });
    return;
  }

  const ok = await populateQuestions({
    attemptId: attempt.id,
    version,
    fromWeek: def.coverageFromWeek,
    toWeek: def.coverageToWeek,
    userId,
    assessmentSlug: def.slug,
  });
  if (!ok) {
    await db
      .delete(diagnosticAttemptsTable)
      .where(eq(diagnosticAttemptsTable.id, attempt.id));
    res.status(502).json({ error: "question generation failed" });
    return;
  }

  const detail = await buildAttemptDetail(attempt);
  res.json(detail);
});

const CustomBody = z.object({
  scope: z.string().min(3).max(500),
  version: z.string().refine(isAssessmentVersion, "invalid version"),
});

// POST /assessments/custom/start — build an assessment to the user's free-text scope.
router.post("/assessments/custom/start", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CustomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const version = parsed.data.version as AssessmentVersion;
  const meta = VERSION_META[version];
  const scope = parsed.data.scope.trim();

  const [attempt] = await db
    .insert(diagnosticAttemptsTable)
    .values({
      userId,
      assessmentSlug: "custom",
      assessmentTitle: "Custom diagnostic",
      version,
      isOfficial: false,
      isCustom: true,
      customScope: scope,
      coverageFromWeek: 1,
      coverageToWeek: 4,
      status: "in_progress",
    })
    .returning();
  if (!attempt) {
    res.status(500).json({ error: "failed to create attempt" });
    return;
  }

  const ok = await populateQuestions({
    attemptId: attempt.id,
    version,
    fromWeek: 1,
    toWeek: 4,
    userId,
    assessmentSlug: "custom",
    customScope: scope,
  });
  if (!ok) {
    await db
      .delete(diagnosticAttemptsTable)
      .where(eq(diagnosticAttemptsTable.id, attempt.id));
    res.status(502).json({ error: "question generation failed" });
    return;
  }

  const detail = await buildAttemptDetail(attempt);
  res.json(detail);
});

// GET /assessments/attempts — this user's full attempt history.
router.get("/assessments/attempts", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const attempts = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.userId, userId))
    .orderBy(desc(diagnosticAttemptsTable.id));
  res.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      assessmentSlug: a.assessmentSlug,
      assessmentTitle: a.assessmentTitle,
      version: a.version,
      isOfficial: a.isOfficial,
      isCustom: a.isCustom,
      customScope: a.customScope ?? null,
      status: a.status,
      scorePercent: a.scorePercent ?? null,
      createdAt: a.createdAt.toISOString(),
      completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    })),
  });
});

// GET /assessments/attempts/:id
router.get("/assessments/attempts/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.id);
  const [attempt] = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.id, id));
  if (!attempt || attempt.userId !== userId) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  res.json(await buildAttemptDetail(attempt));
});

const SaveBody = z.object({
  questionId: z.number().int(),
  answer: z.string(),
  trace: z
    .object({
      keystrokeCount: z.number().int().nonnegative(),
      eraseCount: z.number().int().nonnegative(),
      bulkInsertCount: z.number().int().nonnegative().optional(),
      longestBulkInsertChars: z.number().int().nonnegative().optional(),
      rewriteSegments: z.number().int().nonnegative().optional(),
      durationMs: z.number().int().nonnegative(),
    })
    .optional(),
});

// PUT /assessments/attempts/:id/answers — save a single answer (+ keystroke trace).
router.put("/assessments/attempts/:id/answers", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.id);
  const parsed = SaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [attempt] = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.id, id));
  if (!attempt || attempt.userId !== userId) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(400).json({ error: "attempt already completed" });
    return;
  }
  const { questionId, answer, trace } = parsed.data;
  const [existing] = await db
    .select()
    .from(diagnosticAnswersTable)
    .where(
      and(
        eq(diagnosticAnswersTable.attemptId, id),
        eq(diagnosticAnswersTable.questionId, questionId),
      ),
    );
  const traceFields = trace
    ? {
        keystrokeCount: trace.keystrokeCount,
        eraseCount: trace.eraseCount,
        bulkInsertCount: trace.bulkInsertCount ?? 0,
        longestBulkInsertChars: trace.longestBulkInsertChars ?? 0,
        rewriteSegments: trace.rewriteSegments ?? 0,
        durationMs: trace.durationMs,
      }
    : {};
  if (existing) {
    await db
      .update(diagnosticAnswersTable)
      .set({ answer, ...traceFields, updatedAt: new Date() })
      .where(eq(diagnosticAnswersTable.id, existing.id));
  } else {
    await db
      .insert(diagnosticAnswersTable)
      .values({ attemptId: id, questionId, answer, ...traceFields });
  }
  res.json({ ok: true });
});

// POST /assessments/attempts/:id/submit — grade (instructive), detect, complete.
router.post("/assessments/attempts/:id/submit", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const id = parseIdParam(req.params.id);
  const [attempt] = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.id, id));
  if (!attempt || attempt.userId !== userId) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  if (attempt.status === "completed") {
    res.json(await buildAttemptDetail(attempt));
    return;
  }

  const questions = await db
    .select()
    .from(diagnosticQuestionsTable)
    .where(eq(diagnosticQuestionsTable.attemptId, id))
    .orderBy(asc(diagnosticQuestionsTable.position));
  const answers = await db
    .select()
    .from(diagnosticAnswersTable)
    .where(eq(diagnosticAnswersTable.attemptId, id));
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  const perQuestion = await Promise.all(
    questions.map(async (q) => {
      const ans = answerByQuestion.get(q.id);
      const userAnswer = ans?.answer ?? "";
      let correct: boolean;
      if (q.format === "mc") {
        correct =
          userAnswer.trim().length > 0 &&
          normalizeChoice(userAnswer) === normalizeChoice(q.correctAnswer);
      } else {
        const graded = await gradeAnswer({
          prompt: q.prompt,
          correctAnswer: q.correctAnswer,
          userAnswer,
        });
        correct = graded.correct;
      }

      // Best-effort AI-authorship detection on written answers only.
      let detection: {
        aiScore: number;
        aiFlagged: boolean;
        diachronicScore: number;
        diachronicFlagged: boolean;
        rationale: string;
      } | null = null;
      if (q.format === "written" && userAnswer.trim().length >= 8 && ans) {
        try {
          detection = await detect(userAnswer, {
            keystrokeCount: ans.keystrokeCount,
            eraseCount: ans.eraseCount,
            bulkInsertCount: ans.bulkInsertCount,
            longestBulkInsertChars: ans.longestBulkInsertChars,
            rewriteSegments: ans.rewriteSegments,
            durationMs: ans.durationMs,
          });
        } catch {
          detection = null;
        }
      }

      const feedback = correct
        ? "Correct."
        : userAnswer.trim().length === 0
        ? `Left blank. ${q.explanation}`
        : `Not quite. ${q.explanation}`;

      return { q, ans, userAnswer, correct, feedback, detection };
    }),
  );

  const correctCount = perQuestion.filter((x) => x.correct).length;
  const total = questions.length;
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Finalize in a single transaction so the in_progress -> completed claim,
  // the per-question outcome writes, and the per-topic profile deltas are
  // all-or-nothing. The atomic claim (UPDATE ... WHERE status='in_progress'
  // RETURNING) guarantees exactly-once: only the winning submit performs the
  // writes/deltas; concurrent or retried submits claim nothing and leave state
  // untouched. A crash mid-transaction rolls back the claim too, so retries can
  // re-finalize cleanly rather than stranding a completed attempt with partial
  // grading artifacts.
  const claimed = await db.transaction(async (tx) => {
    const won = await tx
      .update(diagnosticAttemptsTable)
      .set({ status: "completed", scorePercent: percent, completedAt: new Date() })
      .where(
        and(
          eq(diagnosticAttemptsTable.id, id),
          eq(diagnosticAttemptsTable.userId, userId),
          eq(diagnosticAttemptsTable.status, "in_progress"),
        ),
      )
      .returning();
    if (won.length === 0) return null;

    for (const pq of perQuestion) {
      const base = {
        correct: pq.correct,
        feedback: pq.feedback,
        aiScore: pq.detection?.aiScore ?? null,
        aiFlagged: pq.detection?.aiFlagged ?? null,
        diachronicScore: pq.detection?.diachronicScore ?? null,
        diachronicFlagged: pq.detection?.diachronicFlagged ?? null,
        detectionRationale: pq.detection?.rationale ?? null,
        updatedAt: new Date(),
      };
      if (pq.ans) {
        await tx
          .update(diagnosticAnswersTable)
          .set(base)
          .where(eq(diagnosticAnswersTable.id, pq.ans.id));
      } else {
        await tx.insert(diagnosticAnswersTable).values({
          attemptId: id,
          questionId: pq.q.id,
          answer: pq.userAnswer,
          ...base,
        });
      }
      // Feed diagnostic performance into the per-topic mastery profile.
      if (pq.q.topicId != null) {
        await bumpUserTopicProfile(tx, userId, pq.q.topicId, {
          practiceAttempts: 1,
          practiceCorrect: pq.correct ? 1 : 0,
        });
      }
    }
    return won[0]!;
  });

  if (!claimed) {
    // Another submit already completed this attempt — return its state untouched.
    const [done] = await db
      .select()
      .from(diagnosticAttemptsTable)
      .where(eq(diagnosticAttemptsTable.id, id));
    res.json(await buildAttemptDetail(done!));
    return;
  }

  res.json(await buildAttemptDetail(claimed));
});

// GET /gradebook — combined course grade: assignments (80%) + diagnostics (20%).
router.get("/gradebook", async (req, res): Promise<void> => {
  const userId = getUserId(req);

  // ---- Assignments (80%) ----
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .orderBy(asc(assignmentsTable.weekNumber), asc(assignmentsTable.position));
  const myAttempts = await db
    .select()
    .from(attemptsTable)
    .where(
      and(
        eq(attemptsTable.userId, userId),
        eq(attemptsTable.status, "submitted"),
      ),
    );
  const bestByAssignment = new Map<number, number>();
  for (const at of myAttempts) {
    if (typeof at.scorePercent !== "number") continue;
    const prev = bestByAssignment.get(at.assignmentId);
    if (prev == null || at.scorePercent > prev) {
      bestByAssignment.set(at.assignmentId, at.scorePercent);
    }
  }
  const assignmentRows = assignments.map((a) => {
    const best = bestByAssignment.get(a.id);
    return {
      id: a.id,
      title: a.title,
      kind: a.kind,
      weekNumber: a.weekNumber,
      attempted: best != null,
      bestScore: best ?? null,
    };
  });
  const attemptedScores = assignmentRows
    .filter((a) => a.attempted)
    .map((a) => a.bestScore as number);
  const assignmentsScore =
    attemptedScores.length > 0
      ? Math.round(
          attemptedScores.reduce((s, v) => s + v, 0) / attemptedScores.length,
        )
      : 0;

  // ---- Diagnostics (20%) — completion of the official versions ----
  const diagAttempts = await db
    .select()
    .from(diagnosticAttemptsTable)
    .where(eq(diagnosticAttemptsTable.userId, userId));
  const diagBySlug = new Map<string, typeof diagAttempts>();
  for (const d of diagAttempts) {
    const arr = diagBySlug.get(d.assessmentSlug) ?? [];
    arr.push(d);
    diagBySlug.set(d.assessmentSlug, arr);
  }
  const diagnosticRows = ASSESSMENTS.map((def) => {
    const list = diagBySlug.get(def.slug) ?? [];
    const completed = list.filter((a) => a.status === "completed");
    const officialCompleted = completed.some((a) => a.isOfficial);
    const scores = completed
      .map((a) => a.scorePercent)
      .filter((s): s is number => typeof s === "number");
    return {
      slug: def.slug,
      title: def.title,
      weekNumber: def.weekNumber,
      officialCompleted,
      attempts: list.length,
      bestScore: scores.length > 0 ? Math.max(...scores) : null,
    };
  });
  const officialDone = diagnosticRows.filter((d) => d.officialCompleted).length;
  const diagnosticsScore = Math.round((officialDone / ASSESSMENTS.length) * 100);

  const overall = Math.round(0.8 * assignmentsScore + 0.2 * diagnosticsScore);

  res.json({
    overallPercent: overall,
    letterGrade: letterFromPercent(overall),
    categories: [
      {
        key: "assignments",
        label: "Assignments (homework, tests, exams)",
        weightPercent: 80,
        scorePercent: assignmentsScore,
        completed: assignmentRows.filter((a) => a.attempted).length,
        total: assignmentRows.length,
      },
      {
        key: "diagnostics",
        label: "Diagnostic assessments",
        weightPercent: 20,
        scorePercent: diagnosticsScore,
        completed: officialDone,
        total: ASSESSMENTS.length,
      },
    ],
    assignments: assignmentRows,
    diagnostics: diagnosticRows,
  });
});

export default router;
