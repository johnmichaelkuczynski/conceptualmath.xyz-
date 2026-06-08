import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

// Reads the Clerk session off the request (clerkMiddleware must run first) and
// rejects unauthenticated callers. The resolved user id is stashed on the
// request so downstream handlers can scope all data per user.
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as Request & { userId?: string }).userId = userId;
  next();
}

// Convenience accessor for handlers mounted behind requireAuth. Falls back to
// reading the Clerk session directly if the middleware did not run.
export function getUserId(req: Request): string {
  const stashed = (req as Request & { userId?: string }).userId;
  if (stashed) return stashed;
  const { userId } = getAuth(req);
  return userId ?? "";
}
