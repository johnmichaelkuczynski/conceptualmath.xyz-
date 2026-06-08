import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { assignmentsTable } from "./course";

// A practice run is a fresh, regenerable mirror of a graded assignment.
// Every run belongs to one user and one graded assignment it mirrors.
export const practiceRunsTable = pgTable("practice_runs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  scorePercent: doublePrecision("score_percent"),
  feedbackNarrative: text("feedback_narrative"),
  // Array of { topicId, topicTitle, pointer }
  focusPointers: jsonb("focus_pointers"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const practiceRunProblemsTable = pgTable("practice_run_problems", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => practiceRunsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  topicId: integer("topic_id").notNull(),
  topicTitle: text("topic_title"),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
  difficulty: doublePrecision("difficulty").notNull().default(3.0),
});

export const practiceRunAnswersTable = pgTable("practice_run_answers", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => practiceRunsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => practiceRunProblemsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  feedback: text("feedback"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Free-form dialogue with the AI about a finished run's feedback.
export const practiceRunMessagesTable = pgTable("practice_run_messages", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => practiceRunsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The evolving per-user, per-topic mastery profile. Updated after every
// practice run submission and every graded submission.
export const userTopicProfileTable = pgTable(
  "user_topic_profile",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    topicId: integer("topic_id").notNull(),
    practiceAttempts: integer("practice_attempts").notNull().default(0),
    practiceCorrect: integer("practice_correct").notNull().default(0),
    gradedAttempts: integer("graded_attempts").notNull().default(0),
    gradedCorrect: integer("graded_correct").notNull().default(0),
    lastDifficulty: doublePrecision("last_difficulty").notNull().default(2.5),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userTopicUnique: uniqueIndex("user_topic_profile_user_topic_unique").on(
      t.userId,
      t.topicId,
    ),
  }),
);

// History of prompts already served to a user, to guarantee non-repeating
// practice questions (and to exclude real graded prompts).
export const servedPromptsTable = pgTable(
  "served_prompts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    topicId: integer("topic_id").notNull(),
    promptHash: text("prompt_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    servedPromptUnique: uniqueIndex("served_prompts_user_topic_hash_unique").on(
      t.userId,
      t.topicId,
      t.promptHash,
    ),
  }),
);
