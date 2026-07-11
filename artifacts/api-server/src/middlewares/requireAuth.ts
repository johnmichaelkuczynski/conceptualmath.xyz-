import type { Request, Response, NextFunction } from "express";

// Reads the passport session off the request (setupAuth must run first) and
// rejects unauthenticated callers. The resolved user id is stashed on the
// request so downstream handlers can scope all data per user.
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    (req as Request & { userId?: string }).userId = String(req.user.id);
    next();
    return;
  }
  res.status(401).json({ error: "unauthorized" });
}

// Convenience accessor for handlers mounted behind requireAuth. Falls back to
// reading the passport session directly if the middleware did not run.
export function getUserId(req: Request): string {
  const stashed = (req as Request & { userId?: string }).userId;
  if (stashed) return stashed;
  return req.user ? String(req.user.id) : "";
}
