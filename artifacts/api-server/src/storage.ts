import { db, usersTable, loginVisitsTable, uniqueVisitorsTable } from "@workspace/db";
import { desc, eq, gte, sql } from "drizzle-orm";

// Storage adapter backing the canonical Google OAuth implementation in
// ./auth.ts. Provides user lookup/creation plus login-visit analytics.

export type AppUser = typeof usersTable.$inferSelect;

export const storage = {
  async getUserById(id: number): Promise<AppUser | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    return user;
  },

  async getUserByGoogleId(googleId: string): Promise<AppUser | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleId))
      .limit(1);
    return user;
  },

  async getUserByEmail(email: string): Promise<AppUser | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return user;
  },

  async createUserWithGoogle(data: {
    username: string;
    googleId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<AppUser> {
    const [user] = await db
      .insert(usersTable)
      .values({
        username: data.username,
        googleId: data.googleId,
        email: data.email,
        displayName: data.displayName,
      })
      .returning();
    return user;
  },

  async updateUserGoogle(
    id: number,
    patch: { googleId?: string; displayName?: string | null },
  ): Promise<AppUser> {
    const values: Partial<typeof usersTable.$inferInsert> = {};
    if (patch.googleId !== undefined) values.googleId = patch.googleId;
    if (patch.displayName !== undefined) values.displayName = patch.displayName;
    if (Object.keys(values).length === 0) {
      const existing = await this.getUserById(id);
      if (!existing) throw new Error(`User ${id} not found`);
      return existing;
    }
    const [user] = await db
      .update(usersTable)
      .set(values)
      .where(eq(usersTable.id, id))
      .returning();
    return user;
  },

  async recordVisit(userId: number, email: string | null): Promise<void> {
    await db.insert(loginVisitsTable).values({ userId, email });
  },

  async getVisits(limit: number) {
    return db
      .select()
      .from(loginVisitsTable)
      .orderBy(desc(loginVisitsTable.visitedAt))
      .limit(limit);
  },

  // One row per distinct visitor (guest session or signed-in user).
  async recordUniqueVisitor(visitorId: string): Promise<void> {
    await db
      .insert(uniqueVisitorsTable)
      .values({ visitorId })
      .onConflictDoUpdate({
        target: uniqueVisitorsTable.visitorId,
        set: { lastSeenAt: sql`now()` },
      });
  },

  async getUniqueVisitorStats() {
    const rows = await db
      .select({ lastSeenAt: uniqueVisitorsTable.lastSeenAt })
      .from(uniqueVisitorsTable);
    const now = Date.now();
    // Windows count visitors ACTIVE in the period (by last visit), while
    // total is all distinct visitors ever seen.
    const since = (ms: number) =>
      rows.filter((r) => r.lastSeenAt.getTime() >= now - ms).length;
    const DAY = 24 * 60 * 60 * 1000;
    return {
      total: rows.length,
      last24Hours: since(DAY),
      last7Days: since(7 * DAY),
      last30Days: since(30 * DAY),
    };
  },

  async getVisitTimestampsSince(since: Date | null): Promise<Date[]> {
    const rows = since
      ? await db
          .select({ visitedAt: loginVisitsTable.visitedAt })
          .from(loginVisitsTable)
          .where(gte(loginVisitsTable.visitedAt, since))
      : await db
          .select({ visitedAt: loginVisitsTable.visitedAt })
          .from(loginVisitsTable);
    return rows.map((r) => r.visitedAt);
  },
};
