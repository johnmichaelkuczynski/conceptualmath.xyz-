import { Router, type IRouter } from "express";
import { and, eq, asc, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  lecturesTable,
  assignmentsTable,
  attemptsTable,
  practiceRunsTable,
} from "@workspace/db";
import {
  GetCourseOverviewResponse,
  GetWeekResponse,
  GetLectureResponse,
  ListTopicsResponse,
} from "@workspace/api-zod";
import { getUserId } from "../middlewares/requireAuth";

const router: IRouter = Router();

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

const WEEK_TITLES: Record<number, { title: string; summary: string }> = {
  1: {
    title: "Week 1 — Whole numbers, integers, and operations",
    summary:
      "Place value, addition and subtraction, multiplication and division, factors, multiples and primes, negative numbers and the number line, order of operations, and problem-solving strategies.",
  },
  2: {
    title: "Week 2 — Fractions, decimals, percents, and ratios",
    summary:
      "Understanding fractions, adding, subtracting, multiplying and dividing fractions, decimals and place value, converting between fractions, decimals and percents, and ratios, rates, and proportions.",
  },
  3: {
    title: "Week 3 — Percents, measurement, and beginning algebra",
    summary:
      "Percent applications, units and conversion, variables and expressions, simplifying and evaluating expressions, solving one- and multi-step equations, and translating words into equations.",
  },
  4: {
    title: "Week 4 — Graphing, exponents, polynomials, and geometry",
    summary:
      "The coordinate plane, graphing linear equations, slope and intercepts, exponents and powers, polynomials, perimeter, area and volume, reading tables, charts and graphs, and a capstone synthesis.",
  },
};

async function buildWeek(weekNumber: number, userId: string) {
  const lectures = await db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      topicId: lecturesTable.topicId,
    })
    .from(lecturesTable)
    .where(eq(lecturesTable.weekNumber, weekNumber))
    .orderBy(asc(lecturesTable.id));

  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.weekNumber, weekNumber))
    .orderBy(asc(assignmentsTable.position));

  // This user's submitted practice runs for the week's assignments.
  const runs = await db
    .select()
    .from(practiceRunsTable)
    .where(eq(practiceRunsTable.userId, userId));
  const runsByAssignment = new Map<number, { count: number; best: number | null }>();
  for (const r of runs) {
    if (r.status !== "submitted" || r.scorePercent == null) continue;
    const cur = runsByAssignment.get(r.assignmentId) ?? { count: 0, best: null };
    cur.count += 1;
    cur.best = cur.best == null ? r.scorePercent : Math.max(cur.best, r.scorePercent);
    runsByAssignment.set(r.assignmentId, cur);
  }

  const assignmentSummaries = await Promise.all(
    assignments.map(async (a) => {
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
        (best, x) =>
          x.scorePercent != null && x.scorePercent > best ? x.scorePercent : best,
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

  const meta = WEEK_TITLES[weekNumber] ?? {
    title: `Week ${weekNumber}`,
    summary: "",
  };

  return {
    weekNumber,
    title: meta.title,
    summary: meta.summary,
    lectures,
    assignments: assignmentSummaries,
  };
}

router.get("/course/overview", async (req, res) => {
  const userId = getUserId(req);
  const weeks = await Promise.all(
    [1, 2, 3, 4].map((w) => buildWeek(w, userId)),
  );
  const assignmentsTotal = weeks.reduce((s, w) => s + w.assignments.length, 0);
  const assignmentsCompleted = weeks.reduce(
    (s, w) => s + w.assignments.filter((a) => a.status === "submitted").length,
    0,
  );
  const practiceCountRow = await db.execute(
    sql`select count(*)::int as n from practice_attempts pa join practice_sessions ps on pa.session_id = ps.id where ps.user_id = ${userId}`,
  );
  const practiceCount =
    (practiceCountRow.rows[0] as { n?: number } | undefined)?.n ?? 0;

  res.json(
    GetCourseOverviewResponse.parse({
      title: "Developmental Mathematics",
      weeks,
      totals: { assignmentsCompleted, assignmentsTotal, practiceCount },
    }),
  );
});

router.get("/course/weeks/:weekNumber", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.weekNumber)
    ? req.params.weekNumber[0]
    : req.params.weekNumber;
  const weekNumber = parseInt(raw ?? "", 10);
  if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    res.status(400).json({ error: "invalid weekNumber" });
    return;
  }
  const week = await buildWeek(weekNumber, userId);
  res.json(GetWeekResponse.parse(week));
});

router.get("/course/lectures/:lectureId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.lectureId)
    ? req.params.lectureId[0]
    : req.params.lectureId;
  const lectureId = parseInt(raw ?? "", 10);
  if (!Number.isFinite(lectureId)) {
    res.status(400).json({ error: "invalid lectureId" });
    return;
  }
  const [lecture] = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.id, lectureId));
  if (!lecture) {
    res.status(404).json({ error: "lecture not found" });
    return;
  }
  res.json(GetLectureResponse.parse(lecture));
});

router.get("/course/topics", async (_req, res) => {
  const rows = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.position));
  res.json(ListTopicsResponse.parse(rows));
});

export default router;
