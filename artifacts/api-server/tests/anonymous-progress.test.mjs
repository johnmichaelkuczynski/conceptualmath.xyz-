import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { test, before, after } from "node:test";
import pg from "pg";

const port = 38_000 + (process.pid % 1_000);
const apiUrl = `http://127.0.0.1:${port}/api`;
const schemaName = `anonymous_progress_${process.pid}_${Date.now()}`;
const tables = [
  "user_sessions",
  "users",
  "unique_visitors",
  "login_visits",
  "topics",
  "lectures",
  "assignments",
  "problems",
  "attempts",
  "answers",
  "practice_sessions",
  "practice_problems",
  "practice_attempts",
  "diagnostic_attempts",
  "diagnostic_questions",
  "diagnostic_answers",
  "practice_runs",
  "practice_run_problems",
  "practice_run_answers",
  "practice_run_messages",
  "user_topic_profile",
  "served_prompts",
];
const serialTables = tables.filter((table) => table !== "user_sessions");
const createdSessionIds = new Set();
const createdVisitorIds = new Set();
let server;
let db;
let adminDb;
let serverOutput = "";

function databaseOptions(connectionString) {
  assert.ok(connectionString, "DATABASE_URL is required to run anonymous-progress tests");
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  return {
    connectionString,
    ...(isLocal || process.env.DATABASE_SSL === "false"
      ? {}
      : { ssl: { rejectUnauthorized: false } }),
  };
}

function directDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  url.hostname = url.hostname.replace("-pooler.", ".");
  return url.toString();
}

function databaseUrlWithSearchPath(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.set("options", `-c search_path=${schemaName}`);
  return url.toString();
}

async function createIsolatedSchema() {
  const configuredUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  const connectionString = directDatabaseUrl(configuredUrl);
  adminDb = new pg.Client(databaseOptions(connectionString));
  await adminDb.connect();
  await adminDb.query(`create schema "${schemaName}"`);

  for (const table of tables) {
    await adminDb.query(
      `create table "${schemaName}"."${table}" (like public."${table}" including all)`,
    );
  }
  for (const table of serialTables) {
    await adminDb.query(`create sequence "${schemaName}"."${table}_id_seq"`);
    await adminDb.query(
      `alter sequence "${schemaName}"."${table}_id_seq"
       owned by "${schemaName}"."${table}".id`,
    );
    await adminDb.query(
      `alter table "${schemaName}"."${table}"
       alter column id set default nextval('"${schemaName}"."${table}_id_seq"')`,
    );
  }

  const foreignKeys = [
    ["lectures", "topic_id", "topics", "id", "cascade"],
    ["problems", "assignment_id", "assignments", "id", "cascade"],
    ["problems", "topic_id", "topics", "id", "no action"],
    ["attempts", "assignment_id", "assignments", "id", "cascade"],
    ["answers", "attempt_id", "attempts", "id", "cascade"],
    ["answers", "problem_id", "problems", "id", "cascade"],
    ["practice_problems", "session_id", "practice_sessions", "id", "cascade"],
    ["practice_attempts", "session_id", "practice_sessions", "id", "cascade"],
    ["practice_attempts", "problem_id", "practice_problems", "id", "cascade"],
    ["diagnostic_questions", "attempt_id", "diagnostic_attempts", "id", "cascade"],
    ["diagnostic_answers", "attempt_id", "diagnostic_attempts", "id", "cascade"],
    ["diagnostic_answers", "question_id", "diagnostic_questions", "id", "cascade"],
    ["practice_runs", "assignment_id", "assignments", "id", "cascade"],
    ["practice_run_problems", "run_id", "practice_runs", "id", "cascade"],
    ["practice_run_answers", "run_id", "practice_runs", "id", "cascade"],
    ["practice_run_answers", "problem_id", "practice_run_problems", "id", "cascade"],
    ["practice_run_messages", "run_id", "practice_runs", "id", "cascade"],
  ];
  for (const [table, column, parentTable, parentColumn, onDelete] of foreignKeys) {
    await adminDb.query(
      `alter table "${schemaName}"."${table}"
       add foreign key ("${column}")
       references "${schemaName}"."${parentTable}" ("${parentColumn}")
       on delete ${onDelete}`,
    );
  }
  return databaseUrlWithSearchPath(connectionString);
}

async function waitForApi() {
  let lastError;
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${apiUrl}/healthz`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API server did not start: ${lastError ?? "health check failed"}`);
}

async function waitForCourseSeed() {
  for (let i = 0; i < 100; i += 1) {
    const result = await db.query(
      `select
        (select count(*)::int from topics) as topics,
        (select count(*)::int from assignments) as assignments,
        (select count(*)::int from problems) as problems`,
    );
    const counts = result.rows[0];
    if (counts.topics >= 28 && counts.assignments > 0 && counts.problems > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `isolated course database was not seeded\n${serverOutput.slice(-4_000)}`,
  );
}

class BrowserSession {
  cookie = "";

  async request(path, init = {}) {
    const headers = new Headers(init.headers);
    if (this.cookie) headers.set("cookie", this.cookie);
    const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const sessionCookie = setCookie.find((cookie) => cookie.startsWith("connect.sid="));
    if (sessionCookie) this.cookie = sessionCookie.split(";")[0];
    return response;
  }

  sessionId() {
    assert.ok(this.cookie, "session cookie was not set");
    const encoded = this.cookie.slice("connect.sid=".length);
    const value = decodeURIComponent(encoded);
    assert.ok(value.startsWith("s:"), "session cookie is not signed");
    const sessionId = value.slice(2).split(".")[0];
    assert.ok(sessionId, "session id is missing");
    createdSessionIds.add(sessionId);
    return sessionId;
  }
}

async function json(session, path, init) {
  const response = await session.request(path, init);
  const body = await response.json();
  return { response, body };
}

async function visitorIdFor(session) {
  const sessionId = session.sessionId();
  for (let i = 0; i < 20; i += 1) {
    const result = await db.query("select sess from user_sessions where sid = $1", [sessionId]);
    if (result.rowCount === 1) {
      const sess = typeof result.rows[0].sess === "string"
        ? JSON.parse(result.rows[0].sess)
        : result.rows[0].sess;
      if (sess.visitorId) {
        if (/^visitor_[a-f0-9]{18}$/.test(sess.visitorId)) {
          createdVisitorIds.add(sess.visitorId);
        }
        return sess.visitorId;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("visitor identity was not saved to the session store");
}

async function replaceWithLegacyIdentity(session, legacySession) {
  const sessionId = session.sessionId();
  await db.query(
    `update user_sessions
     set sess = (
       (sess::jsonb - 'visitorId' - 'visitorTracked' - 'passport' - 'guestId' - 'guestAiText' - 'devLoggedOut')
       || $2::jsonb
     )::json
     where sid = $1`,
    [sessionId, JSON.stringify(legacySession)],
  );
}

async function progressCounts(userId) {
  const result = await db.query(
    `select
      (select count(*)::int from attempts where user_id = $1) as attempts,
      (select count(*)::int from answers a join attempts t on t.id = a.attempt_id where t.user_id = $1) as answers,
      (select count(*)::int from practice_sessions where user_id = $1) as practice_sessions,
      (select count(*)::int from practice_problems pp join practice_sessions ps on ps.id = pp.session_id where ps.user_id = $1) as practice_problems,
      (select count(*)::int from practice_attempts pa join practice_sessions ps on ps.id = pa.session_id where ps.user_id = $1) as practice_attempts,
      (select count(*)::int from diagnostic_attempts where user_id = $1) as diagnostic_attempts,
      (select count(*)::int from diagnostic_questions dq join diagnostic_attempts da on da.id = dq.attempt_id where da.user_id = $1) as diagnostic_questions,
      (select count(*)::int from diagnostic_answers da join diagnostic_attempts dat on dat.id = da.attempt_id where dat.user_id = $1) as diagnostic_answers,
      (select count(*)::int from practice_runs where user_id = $1) as practice_runs,
      (select count(*)::int from practice_run_problems prp join practice_runs pr on pr.id = prp.run_id where pr.user_id = $1) as practice_run_problems,
      (select count(*)::int from practice_run_answers pra join practice_runs pr on pr.id = pra.run_id where pr.user_id = $1) as practice_run_answers,
      (select count(*)::int from practice_run_messages prm join practice_runs pr on pr.id = prm.run_id where pr.user_id = $1) as practice_run_messages,
      (select count(*)::int from user_topic_profile where user_id = $1) as topic_profiles,
      (select count(*)::int from served_prompts where user_id = $1) as served_prompts`,
    [userId],
  );
  return result.rows[0];
}

async function seedAllProgressTypes(userId, suffix) {
  const ids = await db.query(
    `select
       (select id from topics order by id limit 1) as topic_id,
       (select id from assignments order by id limit 1) as assignment_id,
       (select p.id from problems p join assignments a on a.id = p.assignment_id order by p.id limit 1) as problem_id`,
  );
  const { topic_id: topicId, assignment_id: assignmentId, problem_id: problemId } = ids.rows[0];
  assert.ok(topicId && assignmentId && problemId, "seeded course content is required");

  const practiceSession = await db.query(
    `insert into practice_sessions (user_id, topic_id, tutor_enabled, focus_on_weaknesses, difficulty)
     values ($1, $2, false, true, 2) returning id`,
    [userId, topicId],
  );
  const practiceProblem = await db.query(
    `insert into practice_problems (session_id, topic_id, prompt, correct_answer, explanation, difficulty)
     values ($1, $2, $3, '4', 'test explanation', 2) returning id`,
    [practiceSession.rows[0].id, topicId, `anonymous-progress-practice-${suffix}`],
  );
  await db.query(
    `insert into practice_attempts (session_id, problem_id, topic_id, answer, correct, difficulty)
     values ($1, $2, $3, '4', true, 2)`,
    [practiceSession.rows[0].id, practiceProblem.rows[0].id, topicId],
  );

  const attempt = await db.query(
    `insert into attempts (user_id, assignment_id, status)
     values ($1, $2, 'in_progress') returning id`,
    [userId, assignmentId],
  );
  await db.query(
    `insert into answers (attempt_id, problem_id, answer)
     values ($1, $2, '4')`,
    [attempt.rows[0].id, problemId],
  );

  const diagnosticAttempt = await db.query(
    `insert into diagnostic_attempts (user_id, assessment_slug, assessment_title, version, is_official, is_custom, status)
     values ($1, $2, 'Anonymous reset coverage', 'multiple_choice', false, false, 'in_progress')
     returning id`,
    [userId, `anonymous-reset-${suffix}`],
  );
  const diagnosticQuestion = await db.query(
    `insert into diagnostic_questions (attempt_id, position, format, prompt, correct_answer, explanation)
     values ($1, 1, 'mc', '2 + 2', '4', 'test explanation') returning id`,
    [diagnosticAttempt.rows[0].id],
  );
  await db.query(
    `insert into diagnostic_answers (attempt_id, question_id, answer)
     values ($1, $2, '4')`,
    [diagnosticAttempt.rows[0].id, diagnosticQuestion.rows[0].id],
  );

  const run = await db.query(
    `insert into practice_runs (user_id, assignment_id, status)
     values ($1, $2, 'in_progress') returning id`,
    [userId, assignmentId],
  );
  const runProblem = await db.query(
    `insert into practice_run_problems (run_id, position, topic_id, prompt, correct_answer, explanation, difficulty)
     values ($1, 1, $2, $3, '4', 'test explanation', 2) returning id`,
    [run.rows[0].id, topicId, `anonymous-progress-run-${suffix}`],
  );
  await db.query(
    `insert into practice_run_answers (run_id, problem_id, answer)
     values ($1, $2, '4')`,
    [run.rows[0].id, runProblem.rows[0].id],
  );
  await db.query(
    `insert into practice_run_messages (run_id, role, content)
     values ($1, 'user', 'anonymous progress test')`,
    [run.rows[0].id],
  );
  await db.query(
    `insert into user_topic_profile (user_id, topic_id)
     values ($1, $2)
     on conflict (user_id, topic_id) do nothing`,
    [userId, topicId],
  );
  await db.query(
    `insert into served_prompts (user_id, topic_id, prompt_hash)
     values ($1, $2, $3)
     on conflict (user_id, topic_id, prompt_hash) do nothing`,
    [userId, topicId, `anonymous-progress-${suffix}`],
  );
}

async function cleanupProgress(userId) {
  await db.query("delete from practice_sessions where user_id = $1", [userId]);
  await db.query("delete from attempts where user_id = $1", [userId]);
  await db.query("delete from diagnostic_attempts where user_id = $1", [userId]);
  await db.query("delete from practice_runs where user_id = $1", [userId]);
  await db.query("delete from user_topic_profile where user_id = $1", [userId]);
  await db.query("delete from served_prompts where user_id = $1", [userId]);
}

before(async () => {
  assert.notEqual(
    process.env.NODE_ENV,
    "production",
    "anonymous-progress tests must not run in a production process",
  );
  const isolatedDatabaseUrl = await createIsolatedSchema();
  db = new pg.Client(databaseOptions(isolatedDatabaseUrl));
  await db.connect();
  server = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
    cwd: process.cwd(),
    // The preview domain turns on secure cookies. This local HTTP-only test
    // server intentionally clears it so Node's cookie jar can exercise a
    // persisted session without pretending to be HTTPS.
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      REPLIT_DEV_DOMAIN: "",
      DATABASE_URL: isolatedDatabaseUrl,
      NEON_DATABASE_URL: isolatedDatabaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  await waitForApi();
  await waitForCourseSeed();
});

after(async () => {
  if (db) {
    for (const visitorId of createdVisitorIds) {
      await cleanupProgress(visitorId);
    }
    if (createdSessionIds.size) {
      await db.query("delete from user_sessions where sid = any($1::text[])", [[...createdSessionIds]]);
    }
    if (createdVisitorIds.size) {
      await db.query("delete from unique_visitors where visitor_id = any($1::text[])", [[...createdVisitorIds]]);
    }
  }
  if (server && !server.killed) {
    server.kill("SIGTERM");
    await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
  if (db) await db.end();
  if (adminDb) {
    await adminDb.query(`drop schema if exists "${schemaName}" cascade`);
    await adminDb.end();
  }
});

test("two fresh browser sessions keep assignment progress separate", async () => {
  const first = new BrowserSession();
  const second = new BrowserSession();
  const { response: firstAssignments, body: assignments } = await json(first, "/assignments");
  assert.equal(firstAssignments.status, 200);
  const assignment = assignments[0];
  assert.ok(assignment?.id, "at least one assignment is required");

  const { response: firstStarted, body: firstAttempt } = await json(
    first,
    `/assignments/${assignment.id}/start`,
    { method: "POST" },
  );
  const { response: secondStarted, body: secondAttempt } = await json(
    second,
    `/assignments/${assignment.id}/start`,
    { method: "POST" },
  );
  assert.equal(firstStarted.status, 200);
  assert.equal(secondStarted.status, 200);
  assert.notEqual(firstAttempt.id, secondAttempt.id);

  const firstVisitor = await visitorIdFor(first);
  const secondVisitor = await visitorIdFor(second);
  assert.match(firstVisitor, /^visitor_[a-f0-9]{18}$/);
  assert.match(secondVisitor, /^visitor_[a-f0-9]{18}$/);
  assert.notEqual(firstVisitor, secondVisitor);

  const { response: ownAttempt } = await json(first, `/assignments/attempts/${firstAttempt.id}`);
  const { response: foreignAttempt } = await json(second, `/assignments/attempts/${firstAttempt.id}`);
  assert.equal(ownAttempt.status, 200);
  assert.equal(foreignAttempt.status, 404);

  const { body: firstList } = await json(first, "/assignments");
  const { body: secondList } = await json(second, "/assignments");
  assert.equal(firstList.find((item) => item.id === assignment.id)?.lastAttemptId, firstAttempt.id);
  assert.equal(secondList.find((item) => item.id === assignment.id)?.lastAttemptId, secondAttempt.id);

  await cleanupProgress(firstVisitor);
  await cleanupProgress(secondVisitor);
});

test("legacy account and guest sessions retain their original progress identity", async () => {
  const legacyAccountId = 1_900_000_000 + (process.pid % 100_000);
  const legacyGuestId = `legacy-guest-${schemaName}`;
  const migratedVisitorId = `already-migrated-${schemaName}`;
  const account = new BrowserSession();
  await json(account, "/course/topics");
  await replaceWithLegacyIdentity(account, {
    passport: { user: legacyAccountId },
    guestId: "legacy-guest-that-must-not-win",
  });
  const { response: accountResponse } = await json(account, "/course/topics");
  assert.equal(accountResponse.status, 200);
  assert.equal(await visitorIdFor(account), String(legacyAccountId));

  const guest = new BrowserSession();
  await json(guest, "/course/topics");
  await replaceWithLegacyIdentity(guest, { guestId: legacyGuestId });
  const { response: guestResponse } = await json(guest, "/course/topics");
  assert.equal(guestResponse.status, 200);
  assert.equal(await visitorIdFor(guest), legacyGuestId);

  const existing = new BrowserSession();
  await json(existing, "/course/topics");
  await replaceWithLegacyIdentity(existing, {
    visitorId: migratedVisitorId,
    passport: { user: 99 },
    guestId: "ignored-guest",
  });
  const { response: existingResponse } = await json(existing, "/course/topics");
  assert.equal(existingResponse.status, 200);
  assert.equal(await visitorIdFor(existing), migratedVisitorId);
});

test("learning pages that were previously login-gated remain available anonymously", async () => {
  const session = new BrowserSession();
  const routes = [
    "/course/overview",
    "/course/weeks/1",
    "/course/topics",
    "/assignments",
    "/assessments",
    "/analytics/summary",
    "/analytics/topics",
    "/analytics/activity",
    "/gradebook",
    "/unique-visitors",
  ];
  for (const route of routes) {
    const response = await session.request(route);
    assert.notEqual(response.status, 401, `${route} must not require login`);
    assert.notEqual(response.status, 403, `${route} must not require login`);
    assert.equal(response.status, 200, `${route} should be available to a fresh visitor`);
  }

  const routeSource = await readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(routeSource, /requireAuth|requireLogin|isAuthenticated/);
  for (const routeGroup of [
    "courseRouter",
    "tutorRouter",
    "detectionRouter",
    "assignmentsRouter",
    "practiceRouter",
    "practiceRunsRouter",
    "analyticsRouter",
    "assessmentsRouter",
    "diagnosticsRouter",
  ]) {
    assert.match(routeSource, new RegExp(`router\\.use\\(${routeGroup}\\)`));
  }
});

test("Reset Course removes every current visitor progress type and preserves another visitor", async () => {
  const owner = new BrowserSession();
  const other = new BrowserSession();
  await json(owner, "/course/topics");
  await json(other, "/course/topics");
  const ownerId = await visitorIdFor(owner);
  const otherId = await visitorIdFor(other);
  const contentBefore = await db.query(
    "select (select count(*)::int from topics) as topics, (select count(*)::int from assignments) as assignments, (select count(*)::int from problems) as problems",
  );

  await seedAllProgressTypes(ownerId, `owner-${process.pid}`);
  await seedAllProgressTypes(otherId, `other-${process.pid}`);
  const ownerBefore = await progressCounts(ownerId);
  const otherBefore = await progressCounts(otherId);
  for (const [name, count] of Object.entries(ownerBefore)) {
    assert.ok(count > 0, `owner fixture should include ${name}`);
    assert.ok(otherBefore[name] > 0, `other fixture should include ${name}`);
  }

  const { response, body } = await json(owner, "/diagnostics/reset", { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(!Number.isNaN(Date.parse(body.resetAt)), "reset should return an ISO timestamp");

  const ownerAfter = await progressCounts(ownerId);
  const otherAfter = await progressCounts(otherId);
  for (const [name, count] of Object.entries(ownerAfter)) {
    assert.equal(count, 0, `reset should remove owner ${name}`);
    assert.equal(otherAfter[name], otherBefore[name], `reset must preserve other visitor ${name}`);
  }
  const contentAfter = await db.query(
    "select (select count(*)::int from topics) as topics, (select count(*)::int from assignments) as assignments, (select count(*)::int from problems) as problems",
  );
  assert.deepEqual(contentAfter.rows[0], contentBefore.rows[0], "reset must preserve course content");

  await cleanupProgress(otherId);
});