import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

// A diagnostic attempt is one ungraded, regenerable assessment a user takes.
// Assessment *definitions* (the 7 placements) live in server config, so the
// attempt snapshots the slug/title/coverage it was generated from.
export const diagnosticAttemptsTable = pgTable("diagnostic_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  assessmentSlug: text("assessment_slug").notNull(), // one of the 7, or "custom"
  assessmentTitle: text("assessment_title").notNull(),
  version: text("version").notNull(), // multiple_choice | written | hybrid | official | custom
  isOfficial: boolean("is_official").notNull().default(false),
  isCustom: boolean("is_custom").notNull().default(false),
  customScope: text("custom_scope"),
  coverageFromWeek: integer("coverage_from_week"),
  coverageToWeek: integer("coverage_to_week"),
  status: text("status").notNull().default("in_progress"), // in_progress | completed
  scorePercent: doublePrecision("score_percent"), // instructive only; completion = full credit
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const diagnosticQuestionsTable = pgTable("diagnostic_questions", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => diagnosticAttemptsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  format: text("format").notNull(), // mc | written
  topicId: integer("topic_id"),
  topicTitle: text("topic_title"),
  prompt: text("prompt").notNull(),
  // For MC questions: an array of choice strings. Null for written questions.
  choices: jsonb("choices"),
  correctAnswer: text("correct_answer").notNull(), // MC: exact correct choice text
  explanation: text("explanation").notNull(),
});

export const diagnosticAnswersTable = pgTable("diagnostic_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => diagnosticAttemptsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => diagnosticQuestionsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  feedback: text("feedback"),
  // Keystroke trace metrics (written answers) — mirrors answersTable.
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  bulkInsertCount: integer("bulk_insert_count").notNull().default(0),
  longestBulkInsertChars: integer("longest_bulk_insert_chars").notNull().default(0),
  rewriteSegments: integer("rewrite_segments").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  aiScore: doublePrecision("ai_score"),
  aiFlagged: boolean("ai_flagged"),
  diachronicScore: doublePrecision("diachronic_score"),
  diachronicFlagged: boolean("diachronic_flagged"),
  detectionRationale: text("detection_rationale"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
