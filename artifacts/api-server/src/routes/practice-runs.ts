import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  db,
  assignmentsTable,
  problemsTable,
  topicsTable,
  practiceRunsTable,
  practiceRunProblemsTable,
  practiceRunAnswersTable,
  practiceRunMessagesTable,
  userTopicProfileTable,
  servedPromptsTable,
} from "@workspace/db";
import {
  CreatePracticeRunResponse,
  ListPracticeRunsResponse,
  GetPracticeRunResponse,
  SavePracticeRunAnswerBody,
  SavePracticeRunAnswerResponse,
  SubmitPracticeRunResponse,
  SendPracticeRunMessageBody,
  SendPracticeRunMessageResponse,
  GetAssignmentReadinessResponse,
} from "@workspace/api-zod";
import { chatJson, chatText } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";
import { getUserId } from "../middlewares/identifyUser";
import { bumpUserTopicProfile } from "../lib/profile";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

function normalizePrompt(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hashPrompt(s: string): string {
  return createHash("sha1").update(normalizePrompt(s)).digest("hex");
}

function difficultyLabel(d: number): string {
  return d <= 1.7
    ? "very easy"
    : d <= 2.5
    ? "easy"
    : d <= 3.3
    ? "medium"
    : d <= 4.1
    ? "hard"
    : "challenging";
}

type GeneratedProblem = {
  prompt: string;
  correctAnswer: string;
  explanation: string;
  hint: string | null;
};

async function generateOne(
  topicTitle: string,
  difficulty: number,
  avoidTexts: string[],
): Promise<GeneratedProblem> {
  const out = await chatJson<{
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>(
    `You generate ONE fresh developmental-mathematics problem for a student who is practicing for a graded assignment. ` +
      `The problem MUST be on the topic "${topicTitle}" at difficulty "${difficultyLabel(
        difficulty,
      )}" (${difficulty.toFixed(1)}/5), comparable in rigor to a graded test item. ` +
      `Use $...$ for inline LaTeX. The answer MUST be a short piece of math notation (a number, fraction, exponent, percent, expression, or equation) — never multi-paragraph. ` +
      `It MUST be different in numbers and wording from every problem in this avoid-list (do NOT reuse their scenarios or values): ${JSON.stringify(
        avoidTexts.slice(0, 30),
      )}. ` +
      `Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string, "hint": string}.`,
    `Generate a new ${difficultyLabel(difficulty)} problem on ${topicTitle}.`,
  );
  return {
    prompt: out.prompt,
    correctAnswer: out.correctAnswer,
    explanation: out.explanation,
    hint: out.hint?.trim() ? out.hint.trim() : null,
  };
}

async function generateForTopic(
  topicTitle: string,
  count: number,
  difficulty: number,
  avoidTexts: string[],
  forbiddenHashes: Set<string>,
): Promise<GeneratedProblem[]> {
  const results: GeneratedProblem[] = [];
  const localAvoid = [...avoidTexts];
  for (let i = 0; i < count; i++) {
    let chosen: GeneratedProblem | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const g = await generateOne(topicTitle, difficulty, localAvoid);
        const h = hashPrompt(g.prompt);
        if (!forbiddenHashes.has(h) && g.prompt.trim().length > 0) {
          chosen = g;
          forbiddenHashes.add(h);
          localAvoid.push(g.prompt);
          break;
        }
        localAvoid.push(g.prompt);
      } catch {
        // retry
      }
    }
    if (!chosen) {
      // Deterministic fallback keeps the run usable if the model stalls.
      // Walk a nonce until the generated prompt's hash is not already served,
      // so even the fallback never repeats a question for this user/topic.
      let nonce = 0;
      let fallback: GeneratedProblem;
      do {
        const a = Math.round(difficulty * 3) + i + nonce;
        const b = Math.round(difficulty * 7) + i + nonce * 2 + 1;
        fallback = {
          prompt: `Practice (${topicTitle}): If $x + ${a} = ${b}$, what is $x$?`,
          correctAnswer: String(b - a),
          explanation: "Subtract the constant from both sides.",
          hint: "Isolate $x$ by undoing the addition.",
        };
        nonce++;
      } while (forbiddenHashes.has(hashPrompt(fallback.prompt)) && nonce < 1000);
      chosen = fallback;
      forbiddenHashes.add(hashPrompt(chosen.prompt));
      localAvoid.push(chosen.prompt);
    }
    results.push(chosen);
  }
  return results;
}

async function buildRunDetail(runId: number) {
  const [run] = await db
    .select()
    .from(practiceRunsTable)
    .where(eq(practiceRunsTable.id, runId));
  if (!run) return null;
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, run.assignmentId));
  const problems = await db
    .select()
    .from(practiceRunProblemsTable)
    .where(eq(practiceRunProblemsTable.runId, runId))
    .orderBy(asc(practiceRunProblemsTable.position));
  const answers = await db
    .select()
    .from(practiceRunAnswersTable)
    .where(eq(practiceRunAnswersTable.runId, runId));
  const messages = await db
    .select()
    .from(practiceRunMessagesTable)
    .where(eq(practiceRunMessagesTable.runId, runId))
    .orderBy(asc(practiceRunMessagesTable.id));

  const answerByProblem = new Map(answers.map((a) => [a.problemId, a]));
  const correctCount = answers.filter((a) => a.correct === true).length;
  const graded = run.status === "submitted";

  return {
    id: run.id,
    assignmentId: run.assignmentId,
    assignmentTitle: assignment?.title ?? "Practice",
    assignmentKind: assignment?.kind ?? "homework",
    weekNumber: assignment?.weekNumber ?? null,
    status: run.status === "submitted" ? "submitted" : "in_progress",
    scorePercent: run.scorePercent ?? null,
    score: graded ? correctCount : null,
    total: graded ? problems.length : null,
    feedbackNarrative: run.feedbackNarrative ?? null,
    focusPointers: Array.isArray(run.focusPointers)
      ? (run.focusPointers as Array<{
          topicId: number | null;
          topicTitle: string;
          pointer: string;
        }>)
      : [],
    problems: problems.map((p) => ({
      id: p.id,
      position: p.position,
      prompt: p.prompt,
      topicId: p.topicId,
      topicTitle: p.topicTitle ?? null,
      hint: p.hint ?? null,
      difficulty: p.difficulty,
    })),
    answers: problems.map((p) => {
      const a = answerByProblem.get(p.id);
      return {
        problemId: p.id,
        answer: a?.answer ?? "",
        correct: a?.correct ?? null,
        feedback: a?.feedback ?? null,
        correctAnswer: graded ? p.correctAnswer : null,
        explanation: graded ? p.explanation : null,
      };
    }),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    createdAt: run.createdAt.toISOString(),
    submittedAt: run.submittedAt ? run.submittedAt.toISOString() : null,
  };
}

// POST /assignments/:assignmentId/practice-runs — generate a fresh mirror.
router.post(
  "/assignments/:assignmentId/practice-runs",
  async (req, res): Promise<void> => {
    const userId = getUserId(req);
    const assignmentId = parseIdParam(req.params.assignmentId);
    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId));
    if (!assignment) {
      res.status(404).json({ error: "assignment not found" });
      return;
    }

    const realProblems = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.assignmentId, assignmentId))
      .orderBy(asc(problemsTable.position));
    if (realProblems.length === 0) {
      res.status(400).json({ error: "assignment has no problems" });
      return;
    }

    const topicIds = Array.from(new Set(realProblems.map((p) => p.topicId)));
    const topics = await db
      .select()
      .from(topicsTable)
      .where(inArray(topicsTable.id, topicIds));
    const topicById = new Map(topics.map((t) => [t.id, t]));

    // Per-topic mastery drives difficulty: weaker topics start a touch easier.
    const profiles = await db
      .select()
      .from(userTopicProfileTable)
      .where(eq(userTopicProfileTable.userId, userId));
    const profileByTopic = new Map(profiles.map((p) => [p.topicId, p]));

    function targetDifficulty(topicId: number): number {
      const p = profileByTopic.get(topicId);
      if (!p || p.practiceAttempts + p.gradedAttempts === 0) return 2.9;
      const correct = p.practiceCorrect + p.gradedCorrect;
      const attempts = p.practiceAttempts + p.gradedAttempts;
      const acc = attempts > 0 ? correct / attempts : 0.5;
      return Math.max(2, Math.min(4.2, 3.0 + (acc - 0.6) * 2));
    }

    // Forbidden = every real prompt on this assignment + all previously served
    // prompts for this user. Guarantees nothing matches the graded version.
    const served = await db
      .select()
      .from(servedPromptsTable)
      .where(eq(servedPromptsTable.userId, userId));
    const forbiddenByTopic = new Map<number, Set<string>>();
    for (const t of topicIds) forbiddenByTopic.set(t, new Set());
    for (const r of served) {
      if (!forbiddenByTopic.has(r.topicId))
        forbiddenByTopic.set(r.topicId, new Set());
      forbiddenByTopic.get(r.topicId)!.add(r.promptHash);
    }
    const avoidTextByTopic = new Map<number, string[]>();
    for (const t of topicIds) avoidTextByTopic.set(t, []);
    for (const rp of realProblems) {
      forbiddenByTopic.get(rp.topicId)!.add(hashPrompt(rp.prompt));
      avoidTextByTopic.get(rp.topicId)!.push(rp.prompt);
    }
    // Forbid EVERY graded problem across the whole course on these topics, not
    // just the mirrored assignment's — practice must never reproduce a graded
    // question the student could later be tested on, regardless of assignment.
    const allGradedOnTopics = await db
      .select({
        topicId: problemsTable.topicId,
        prompt: problemsTable.prompt,
      })
      .from(problemsTable)
      .where(inArray(problemsTable.topicId, topicIds));
    for (const gp of allGradedOnTopics) {
      forbiddenByTopic.get(gp.topicId)?.add(hashPrompt(gp.prompt));
    }
    // Also avoid recently served practice-run prompts (text) for context.
    const recentRunProblems = await db
      .select({
        topicId: practiceRunProblemsTable.topicId,
        prompt: practiceRunProblemsTable.prompt,
        runId: practiceRunProblemsTable.runId,
      })
      .from(practiceRunProblemsTable)
      .innerJoin(
        practiceRunsTable,
        eq(practiceRunProblemsTable.runId, practiceRunsTable.id),
      )
      .where(eq(practiceRunsTable.userId, userId))
      .orderBy(desc(practiceRunProblemsTable.id))
      .limit(60);
    for (const rp of recentRunProblems) {
      const arr = avoidTextByTopic.get(rp.topicId);
      if (arr && arr.length < 20) arr.push(rp.prompt);
    }

    // Group real problems by topic so same-topic generation stays sequential
    // (no intra-batch duplicates) while different topics run in parallel.
    const byTopic = new Map<number, number>();
    for (const rp of realProblems)
      byTopic.set(rp.topicId, (byTopic.get(rp.topicId) ?? 0) + 1);

    let generatedByTopic: Map<number, GeneratedProblem[]>;
    try {
      const entries = await Promise.all(
        Array.from(byTopic.entries()).map(async ([topicId, count]) => {
          const t = topicById.get(topicId);
          const list = await generateForTopic(
            t?.title ?? "developmental mathematics",
            count,
            targetDifficulty(topicId),
            avoidTextByTopic.get(topicId) ?? [],
            forbiddenByTopic.get(topicId) ?? new Set(),
          );
          return [topicId, list] as const;
        }),
      );
      generatedByTopic = new Map(entries);
    } catch {
      res.status(502).json({ error: "problem generation failed" });
      return;
    }

    const [run] = await db
      .insert(practiceRunsTable)
      .values({ userId, assignmentId, status: "in_progress" })
      .returning();
    if (!run) {
      res.status(500).json({ error: "failed to create run" });
      return;
    }

    // Assemble problems in the SAME order/topic layout as the graded one.
    const cursor = new Map<number, number>();
    const servedRows: Array<{
      userId: string;
      topicId: number;
      promptHash: string;
    }> = [];
    for (let i = 0; i < realProblems.length; i++) {
      const rp = realProblems[i]!;
      const idx = cursor.get(rp.topicId) ?? 0;
      cursor.set(rp.topicId, idx + 1);
      const gen = generatedByTopic.get(rp.topicId)?.[idx];
      if (!gen) continue;
      const t = topicById.get(rp.topicId);
      const [stored] = await db
        .insert(practiceRunProblemsTable)
        .values({
          runId: run.id,
          position: i,
          topicId: rp.topicId,
          topicTitle: t?.title ?? null,
          prompt: gen.prompt,
          correctAnswer: gen.correctAnswer,
          explanation: gen.explanation,
          hint: gen.hint,
          difficulty: targetDifficulty(rp.topicId),
        })
        .returning();
      if (stored) {
        await db.insert(practiceRunAnswersTable).values({
          runId: run.id,
          problemId: stored.id,
          answer: "",
        });
        servedRows.push({
          userId,
          topicId: rp.topicId,
          promptHash: hashPrompt(gen.prompt),
        });
      }
    }
    if (servedRows.length > 0) {
      await db
        .insert(servedPromptsTable)
        .values(servedRows)
        .onConflictDoNothing({
          target: [
            servedPromptsTable.userId,
            servedPromptsTable.topicId,
            servedPromptsTable.promptHash,
          ],
        });
    }

    const detail = await buildRunDetail(run.id);
    res.json(CreatePracticeRunResponse.parse(detail));
  },
);

// GET /assignments/:assignmentId/practice-runs — list this user's runs.
router.get(
  "/assignments/:assignmentId/practice-runs",
  async (req, res): Promise<void> => {
    const userId = getUserId(req);
    const assignmentId = parseIdParam(req.params.assignmentId);
    const runs = await db
      .select()
      .from(practiceRunsTable)
      .where(
        and(
          eq(practiceRunsTable.userId, userId),
          eq(practiceRunsTable.assignmentId, assignmentId),
        ),
      )
      .orderBy(desc(practiceRunsTable.id));
    const counts =
      runs.length > 0
        ? await db
            .select({
              runId: practiceRunProblemsTable.runId,
              count: sql<number>`cast(count(*) as int)`,
            })
            .from(practiceRunProblemsTable)
            .where(
              inArray(
                practiceRunProblemsTable.runId,
                runs.map((r) => r.id),
              ),
            )
            .groupBy(practiceRunProblemsTable.runId)
        : [];
    const countByRun = new Map(counts.map((c) => [c.runId, c.count]));
    const result = runs.map((r) => ({
      id: r.id,
      assignmentId: r.assignmentId,
      status: r.status === "submitted" ? "submitted" : "in_progress",
      scorePercent: r.scorePercent ?? null,
      problemCount: countByRun.get(r.id) ?? 0,
      createdAt: r.createdAt.toISOString(),
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    }));
    res.json(ListPracticeRunsResponse.parse(result));
  },
);

// GET /practice-runs/:runId
router.get("/practice-runs/:runId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const runId = parseIdParam(req.params.runId);
  const [run] = await db
    .select()
    .from(practiceRunsTable)
    .where(eq(practiceRunsTable.id, runId));
  if (!run || run.userId !== userId) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  const detail = await buildRunDetail(runId);
  res.json(GetPracticeRunResponse.parse(detail));
});

// PUT /practice-runs/:runId/answers
router.put("/practice-runs/:runId/answers", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const runId = parseIdParam(req.params.runId);
  const parsed = SavePracticeRunAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [run] = await db
    .select()
    .from(practiceRunsTable)
    .where(eq(practiceRunsTable.id, runId));
  if (!run || run.userId !== userId) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  if (run.status !== "in_progress") {
    res.status(400).json({ error: "run already submitted" });
    return;
  }
  const { problemId, answer } = parsed.data;
  const [existing] = await db
    .select()
    .from(practiceRunAnswersTable)
    .where(
      and(
        eq(practiceRunAnswersTable.runId, runId),
        eq(practiceRunAnswersTable.problemId, problemId),
      ),
    );
  if (existing) {
    await db
      .update(practiceRunAnswersTable)
      .set({ answer, updatedAt: new Date() })
      .where(eq(practiceRunAnswersTable.id, existing.id));
  } else {
    await db
      .insert(practiceRunAnswersTable)
      .values({ runId, problemId, answer });
  }
  res.json(SavePracticeRunAnswerResponse.parse({ ok: true }));
});

// POST /practice-runs/:runId/submit — grade + rich feedback + focus pointers.
router.post("/practice-runs/:runId/submit", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const runId = parseIdParam(req.params.runId);
  const [run] = await db
    .select()
    .from(practiceRunsTable)
    .where(eq(practiceRunsTable.id, runId));
  if (!run || run.userId !== userId) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  if (run.status === "submitted") {
    // Idempotent no-op: a finished run keeps its graded result unchanged.
    const detail = await buildRunDetail(runId);
    res.json(SubmitPracticeRunResponse.parse(detail));
    return;
  }
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, run.assignmentId));
  const problems = await db
    .select()
    .from(practiceRunProblemsTable)
    .where(eq(practiceRunProblemsTable.runId, runId))
    .orderBy(asc(practiceRunProblemsTable.position));
  const answers = await db
    .select()
    .from(practiceRunAnswersTable)
    .where(eq(practiceRunAnswersTable.runId, runId));
  const answerByProblem = new Map(answers.map((a) => [a.problemId, a]));

  // Grade + per-problem feedback in parallel.
  const perProblem = await Promise.all(
    problems.map(async (p) => {
      const userAnswer = answerByProblem.get(p.id)?.answer ?? "";
      const graded = await gradeAnswer({
        prompt: p.prompt,
        correctAnswer: p.correctAnswer,
        userAnswer,
      });
      let feedback = "";
      try {
        const fb = await chatJson<{ feedback: string }>(
          "You are a precise, encouraging developmental-mathematics coach. Given a practice problem, the correct answer, the student's answer, and whether it was correct, write 2-4 sentences of feedback. " +
            "If wrong, name the SPECIFIC misconception or step they missed and show the right first move; if correct, reinforce WHY the method works and note one way it could get harder. Use $...$ for math. Respond as strict JSON: {\"feedback\": string}.",
          JSON.stringify({
            topic: p.topicTitle,
            prompt: p.prompt,
            correctAnswer: p.correctAnswer,
            studentAnswer: userAnswer || "(left blank)",
            correct: graded.correct,
          }),
        );
        feedback = fb.feedback;
      } catch {
        feedback = graded.explanation || `The correct answer is ${p.correctAnswer}.`;
      }
      return { problem: p, userAnswer, correct: graded.correct, feedback };
    }),
  );

  const correctCount = perProblem.filter((x) => x.correct).length;
  const total = problems.length;
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Persist per-problem correctness + feedback.
  for (const pp of perProblem) {
    const existing = answerByProblem.get(pp.problem.id);
    if (existing) {
      await db
        .update(practiceRunAnswersTable)
        .set({ correct: pp.correct, feedback: pp.feedback, updatedAt: new Date() })
        .where(eq(practiceRunAnswersTable.id, existing.id));
    } else {
      await db.insert(practiceRunAnswersTable).values({
        runId,
        problemId: pp.problem.id,
        answer: pp.userAnswer,
        correct: pp.correct,
        feedback: pp.feedback,
      });
    }
  }

  // Aggregate per-topic results (used for the narrative and the profile update).
  const byTopic = new Map<number, { attempts: number; correct: number; title: string }>();
  for (const pp of perProblem) {
    const cur = byTopic.get(pp.problem.topicId) ?? {
      attempts: 0,
      correct: 0,
      title: pp.problem.topicTitle ?? "",
    };
    cur.attempts += 1;
    if (pp.correct) cur.correct += 1;
    byTopic.set(pp.problem.topicId, cur);
  }

  // Overall narrative + surgical, analytics-based focus pointers.
  let narrative = "";
  let focusPointers: Array<{
    topicId: number | null;
    topicTitle: string;
    pointer: string;
  }> = [];
  const topicBreakdown = Array.from(byTopic.entries()).map(([topicId, agg]) => ({
    topicId,
    topicTitle: agg.title,
    accuracy: agg.attempts > 0 ? Math.round((agg.correct / agg.attempts) * 100) : 0,
    attempts: agg.attempts,
  }));
  try {
    const out = await chatJson<{
      narrative: string;
      focusPointers: Array<{ topicTitle: string; pointer: string }>;
    }>(
      "You are a developmental-mathematics coach writing a debrief after a practice run that mirrors a graded assignment. " +
        "Write an encouraging 3-5 sentence narrative summarizing how the student did and what to do before the real graded assignment. " +
        "Then give 1-4 surgically precise focus pointers, each tied to a specific weak topic, telling the student EXACTLY what concept or step to drill. " +
        "Use $...$ for math. Respond as strict JSON: {\"narrative\": string, \"focusPointers\": [{\"topicTitle\": string, \"pointer\": string}]}.",
      JSON.stringify({
        gradedAssignment: { title: assignment?.title, kind: assignment?.kind },
        scorePercent: percent,
        topicBreakdown,
        wrongProblems: perProblem
          .filter((x) => !x.correct)
          .map((x) => ({
            topic: x.problem.topicTitle,
            prompt: x.problem.prompt,
            correctAnswer: x.problem.correctAnswer,
            studentAnswer: x.userAnswer || "(blank)",
          })),
      }),
    );
    narrative = out.narrative ?? "";
    const titleToId = new Map(topicBreakdown.map((t) => [t.topicTitle, t.topicId]));
    focusPointers = (out.focusPointers ?? []).map((fp) => ({
      topicId: titleToId.get(fp.topicTitle) ?? null,
      topicTitle: fp.topicTitle,
      pointer: fp.pointer,
    }));
  } catch {
    narrative = `You scored ${percent}% on this practice run. Review the problems you missed and try another run when you're ready.`;
    focusPointers = topicBreakdown
      .filter((t) => t.accuracy < 70)
      .map((t) => ({
        topicId: t.topicId,
        topicTitle: t.topicTitle,
        pointer: `Drill more "${t.topicTitle}" problems — you got ${t.accuracy}% of them here.`,
      }));
  }

  // Finalize atomically. The profile increments are applied ONLY by the single
  // request that wins the in_progress -> submitted transition, so a concurrent
  // or repeated submit can never double-count mastery. Grading itself produces
  // no persisted side effects beyond the (idempotent) per-answer overwrites, so
  // a crash before this point simply leaves the run in_progress for a clean retry.
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(practiceRunsTable)
      .set({
        status: "submitted",
        scorePercent: percent,
        feedbackNarrative: narrative,
        focusPointers,
        submittedAt: new Date(),
      })
      .where(
        and(
          eq(practiceRunsTable.id, runId),
          eq(practiceRunsTable.userId, userId),
          eq(practiceRunsTable.status, "in_progress"),
        ),
      )
      .returning();
    if (!claimed) return; // Already finalized elsewhere — skip increments.
    for (const [topicId, agg] of byTopic.entries()) {
      await bumpUserTopicProfile(tx, userId, topicId, {
        practiceAttempts: agg.attempts,
        practiceCorrect: agg.correct,
        lastDifficulty: problems.find((p) => p.topicId === topicId)?.difficulty,
      });
    }
  });

  const detail = await buildRunDetail(runId);
  res.json(SubmitPracticeRunResponse.parse(detail));
});

// POST /practice-runs/:runId/messages — dialogue about the feedback.
router.post(
  "/practice-runs/:runId/messages",
  async (req, res): Promise<void> => {
    const userId = getUserId(req);
    const runId = parseIdParam(req.params.runId);
    const parsed = SendPracticeRunMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [run] = await db
      .select()
      .from(practiceRunsTable)
      .where(eq(practiceRunsTable.id, runId));
    if (!run || run.userId !== userId) {
      res.status(404).json({ error: "run not found" });
      return;
    }
    const content = parsed.data.content.trim();
    if (!content) {
      res.status(400).json({ error: "empty message" });
      return;
    }

    const problems = await db
      .select()
      .from(practiceRunProblemsTable)
      .where(eq(practiceRunProblemsTable.runId, runId))
      .orderBy(asc(practiceRunProblemsTable.position));
    const answers = await db
      .select()
      .from(practiceRunAnswersTable)
      .where(eq(practiceRunAnswersTable.runId, runId));
    const answerByProblem = new Map(answers.map((a) => [a.problemId, a]));
    const priorMessages = await db
      .select()
      .from(practiceRunMessagesTable)
      .where(eq(practiceRunMessagesTable.runId, runId))
      .orderBy(asc(practiceRunMessagesTable.id));

    await db
      .insert(practiceRunMessagesTable)
      .values({ runId, role: "user", content });

    const context = {
      scorePercent: run.scorePercent,
      narrative: run.feedbackNarrative,
      focusPointers: run.focusPointers,
      problems: problems.map((p) => {
        const a = answerByProblem.get(p.id);
        return {
          topic: p.topicTitle,
          prompt: p.prompt,
          correctAnswer: p.correctAnswer,
          studentAnswer: a?.answer ?? "",
          correct: a?.correct ?? null,
          feedback: a?.feedback ?? null,
        };
      }),
    };
    const sys =
      "You are an encouraging developmental-mathematics tutor continuing a conversation about a student's practice-run feedback. " +
      "Use the run context to answer specifically about THEIR problems and mistakes. Explain step by step with $...$ for math, keep replies focused (3-6 sentences unless asked for more). " +
      "If they explicitly ask for the answer, give it plainly.";
    const history = priorMessages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n");
    const userPrompt =
      `RUN CONTEXT (JSON):\n${JSON.stringify(context)}\n\n` +
      (history ? `CONVERSATION SO FAR:\n${history}\n\n` : "") +
      `Student's new message: ${content}`;

    let reply = "";
    try {
      reply = await chatText(sys, userPrompt);
    } catch {
      reply =
        "I'm having trouble reaching the tutor right now. Try again in a moment.";
    }
    const [stored] = await db
      .insert(practiceRunMessagesTable)
      .values({ runId, role: "assistant", content: reply })
      .returning();
    res.json(
      SendPracticeRunMessageResponse.parse({
        id: stored?.id ?? 0,
        role: "assistant",
        content: reply,
        createdAt: (stored?.createdAt ?? new Date()).toISOString(),
      }),
    );
  },
);

// GET /assignments/:assignmentId/readiness
router.get(
  "/assignments/:assignmentId/readiness",
  async (req, res): Promise<void> => {
    const userId = getUserId(req);
    const assignmentId = parseIdParam(req.params.assignmentId);
    const realProblems = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.assignmentId, assignmentId));
    const topicIds = Array.from(new Set(realProblems.map((p) => p.topicId)));
    const topics =
      topicIds.length > 0
        ? await db
            .select()
            .from(topicsTable)
            .where(inArray(topicsTable.id, topicIds))
        : [];
    const topicById = new Map(topics.map((t) => [t.id, t]));

    const profiles =
      topicIds.length > 0
        ? await db
            .select()
            .from(userTopicProfileTable)
            .where(eq(userTopicProfileTable.userId, userId))
        : [];
    const profileByTopic = new Map(profiles.map((p) => [p.topicId, p]));

    const runs = await db
      .select()
      .from(practiceRunsTable)
      .where(
        and(
          eq(practiceRunsTable.userId, userId),
          eq(practiceRunsTable.assignmentId, assignmentId),
        ),
      )
      .orderBy(desc(practiceRunsTable.id));
    const submitted = runs.filter(
      (r) => r.status === "submitted" && r.scorePercent != null,
    );
    const bestPracticeScore =
      submitted.length > 0
        ? Math.max(...submitted.map((r) => r.scorePercent as number))
        : null;
    const lastPracticeScore = submitted[0]?.scorePercent ?? null;

    function labelFor(acc: number | null, attempts: number) {
      if (attempts === 0 || acc == null) return "untested" as const;
      if (acc >= 0.9) return "strong" as const;
      if (acc >= 0.75) return "solid" as const;
      if (acc >= 0.55) return "developing" as const;
      return "weak" as const;
    }

    const topicReadiness = topicIds.map((tid) => {
      const p = profileByTopic.get(tid);
      const attempts = (p?.practiceAttempts ?? 0) + (p?.gradedAttempts ?? 0);
      const correct = (p?.practiceCorrect ?? 0) + (p?.gradedCorrect ?? 0);
      const acc = attempts > 0 ? correct / attempts : null;
      return {
        topicId: tid,
        topicTitle: topicById.get(tid)?.title ?? "Topic",
        practiceAttempts: attempts,
        practiceAccuracy: acc,
        label: labelFor(acc, attempts),
      };
    });

    let readinessLabel: "not_ready" | "building" | "almost" | "ready";
    let message: string;
    if (submitted.length === 0) {
      readinessLabel = "not_ready";
      message =
        "You haven't practiced this one yet. Run a practice version first — it's unlimited and never repeats the real questions.";
    } else {
      const score = bestPracticeScore ?? 0;
      const weakCount = topicReadiness.filter(
        (t) => t.label === "weak" || t.label === "developing",
      ).length;
      if (score >= 85 && weakCount === 0) {
        readinessLabel = "ready";
        message =
          "You're ready. Your practice scores are strong across every topic on this assignment.";
      } else if (score >= 70) {
        readinessLabel = "almost";
        message =
          weakCount > 0
            ? `Almost there — tighten up ${weakCount} topic${weakCount > 1 ? "s" : ""} below, then take the graded version.`
            : "Almost there — one more solid practice run should do it.";
      } else if (score >= 50) {
        readinessLabel = "building";
        message =
          "You're building. Keep practicing the weaker topics below before the graded version counts.";
      } else {
        readinessLabel = "not_ready";
        message =
          "Not ready yet — keep practicing. Use the always-on tutor while you work through more runs.";
      }
    }

    res.json(
      GetAssignmentReadinessResponse.parse({
        assignmentId,
        practiceRunCount: submitted.length,
        bestPracticeScore,
        lastPracticeScore,
        readinessLabel,
        message,
        topics: topicReadiness,
      }),
    );
  },
);

export default router;
