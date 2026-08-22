import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express } from "express";
import pg from "pg";
import { logger } from "./lib/logger";

export function setupSession(app: Express) {
  app.set("trust proxy", 1);

  const PgSession = connectPgSimple(session);
  const pool = new pg.Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  pool.on("error", (err) => {
    logger.error({ err }, "Session pool error");
  });

  const pgStore = new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
    errorLog: (err) => logger.error({ err }, "Session store error"),
  });

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  app.use(
    session({
      store: pgStore,
      secret:
        process.env.SESSION_SECRET ||
        "developmental-mathematics-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction || !!process.env.REPLIT_DEV_DOMAIN,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  logger.info(
    { secureCookies: isProduction || !!process.env.REPLIT_DEV_DOMAIN },
    "Anonymous sessions configured",
  );
}