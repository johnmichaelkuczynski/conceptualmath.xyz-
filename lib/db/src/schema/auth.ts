import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  json,
  index,
} from "drizzle-orm/pg-core";

// Express session storage for connect-pg-simple (matches its table.sql).
// Defined here so `db push` creates it in every environment — the bundled
// server can't read connect-pg-simple's table.sql at runtime.
export const userSessionsTable = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("IDX_user_sessions_expire").on(table.expire)],
);

// Local user accounts created via Google OAuth sign-in. The numeric id is the
// session identity; all per-user data tables reference String(id) in their
// text user_id columns.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  googleId: text("google_id").unique(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per distinct visitor (guest session or signed-in user) — powers the
// owner-only unique-visitor counter. visitorId is the guest session id or
// `user_<id>` for signed-in accounts.
export const uniqueVisitorsTable = pgTable("unique_visitors", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull().unique(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per successful Google sign-in (admin visitor analytics).
export const loginVisitsTable = pgTable("login_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: text("email"),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
});
