import { db, uniqueVisitorsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export const storage = {
  // One row per distinct anonymous browser session.
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

};
