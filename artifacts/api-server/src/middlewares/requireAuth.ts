import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

declare module "express-session" {
  interface SessionData {
    guestId?: string;
    guestUsage?: number;
  }
}

// How many "heavy" interactions (AI feedback: tutor asks, graded answers,
// submissions) a guest gets before we ask them to sign in with Google.
export const GUEST_USAGE_LIMIT = 15;

const LOGIN_REQUIRED_BODY = {
  error: "login_required",
  code: "LOGIN_REQUIRED",
  message:
    "You've used your free preview of the course. Sign in with Google (it's free) to keep going and have your progress saved.",
};

// Identifies the caller. Logged-in users get their real id; anonymous
// visitors get a stable per-session guest id so the course still works
// (their progress lives under the guest id until they sign in).
export function identifyUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    (req as Request & { userId?: string }).userId = String(req.user.id);
    next();
    return;
  }
  if (!req.session.guestId) {
    req.session.guestId = `guest_${randomBytes(9).toString("hex")}`;
  }
  (req as Request & { userId?: string }).userId = req.session.guestId;
  next();
}

// Hard gate: only real (Google-authenticated) users. Used for progress
// charting (analytics, assessments/gradebook) and operator diagnostics.
// Responds with the LOGIN_REQUIRED code so the client can show the friendly
// sign-in reminder instead of a raw error.
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
  res.status(401).json({
    ...LOGIN_REQUIRED_BODY,
    message:
      "Sign in with Google (it's free) to see your progress and keep your work saved.",
  });
}

// Soft gate: guests may use the metered routes, but every mutating request
// (tutor question, graded answer, submission — the expensive AI feedback)
// counts against a per-session allowance. Past the limit they must sign in.
export function guestUsageGate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    next();
    return;
  }
  const mutating = req.method !== "GET" && req.method !== "HEAD";
  if (!mutating) {
    next();
    return;
  }
  // Practice-run creation and submission fan out into many AI calls each,
  // so they consume a bigger slice of the guest allowance than a single
  // tutor question or graded answer.
  const path = req.path;
  const heavy =
    /^\/assignments\/[^/]+\/practice-runs\/?$/.test(path) ||
    /^\/practice-runs\/[^/]+\/submit\/?$/.test(path);
  const cost = heavy ? 5 : 1;
  const used = req.session.guestUsage ?? 0;
  if (used + cost > GUEST_USAGE_LIMIT) {
    res.status(401).json(LOGIN_REQUIRED_BODY);
    return;
  }
  req.session.guestUsage = used + cost;
  next();
}

// Convenience accessor for handlers mounted behind identifyUser/requireAuth.
export function getUserId(req: Request): string {
  const stashed = (req as Request & { userId?: string }).userId;
  if (stashed) return stashed;
  return req.user ? String(req.user.id) : "";
}
