import { sql } from "drizzle-orm";
import { db, userTopicProfileTable } from "@workspace/db";

export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ProfileDelta {
  practiceAttempts?: number;
  practiceCorrect?: number;
  gradedAttempts?: number;
  gradedCorrect?: number;
  lastDifficulty?: number;
}

/**
 * Atomic upsert of the per-user, per-topic mastery profile. Concurrent or
 * repeated callers add their deltas without lost updates. Relies on the unique
 * index on user_topic_profile(user_id, topic_id). Callers that must apply a
 * delta exactly once should run this inside the same transaction that performs
 * the one-time status transition (in_progress -> submitted) and only call it
 * when that transition is actually claimed.
 */
export async function bumpUserTopicProfile(
  exec: DbExecutor,
  userId: string,
  topicId: number,
  delta: ProfileDelta,
): Promise<void> {
  const pA = delta.practiceAttempts ?? 0;
  const pC = delta.practiceCorrect ?? 0;
  const gA = delta.gradedAttempts ?? 0;
  const gC = delta.gradedCorrect ?? 0;
  await exec
    .insert(userTopicProfileTable)
    .values({
      userId,
      topicId,
      practiceAttempts: pA,
      practiceCorrect: pC,
      gradedAttempts: gA,
      gradedCorrect: gC,
      lastDifficulty: delta.lastDifficulty ?? 2.5,
    })
    .onConflictDoUpdate({
      target: [userTopicProfileTable.userId, userTopicProfileTable.topicId],
      set: {
        practiceAttempts: sql`${userTopicProfileTable.practiceAttempts} + ${pA}`,
        practiceCorrect: sql`${userTopicProfileTable.practiceCorrect} + ${pC}`,
        gradedAttempts: sql`${userTopicProfileTable.gradedAttempts} + ${gA}`,
        gradedCorrect: sql`${userTopicProfileTable.gradedCorrect} + ${gC}`,
        lastDifficulty:
          delta.lastDifficulty ?? sql`${userTopicProfileTable.lastDifficulty}`,
        updatedAt: new Date(),
      },
    });
}
