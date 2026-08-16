import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    guestId?: string;
    guestAiText?: number;
    visitorTracked?: string;
  }
}

// Guests may keep using the course until the AI has generated roughly two
// paragraphs of text for them (tutor answers, graded feedback, explanations).
// After that, further AI-generating requests ask them to sign in.
export const GUEST_AI_TEXT_LIMIT = 2000; // characters of generated text

const LOGIN_REQUIRED_BODY = {
  error: "login_required",
  code: "LOGIN_REQUIRED",
  message:
    "You've used your free preview of the course. Sign in with Google (it's free) to keep going and have your progress saved.",
};

// Every distinct visitor (guest session or signed-in account) is recorded
// once per session for the owner-only unique-visitor counter.
function trackVisitor(req: Request, visitorId: string): void {
  if (req.session.visitorTracked === visitorId) return;
  req.session.visitorTracked = visitorId;
  storage.recordUniqueVisitor(visitorId).catch((err) => {
    console.error("Failed to record unique visitor:", err);
  });
}

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
    trackVisitor(req, `user_${req.user.id}`);
    next();
    return;
  }
  if (!req.session.guestId) {
    req.session.guestId = `guest_${randomBytes(9).toString("hex")}`;
  }
  (req as Request & { userId?: string }).userId = req.session.guestId;
  trackVisitor(req, req.session.guestId);
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

// Recursively totals the characters of every string in a JSON response —
// a close proxy for "how much text the AI generated for this guest".
function countText(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) {
    let n = 0;
    for (const v of value) n += countText(v);
    return n;
  }
  if (value && typeof value === "object") {
    let n = 0;
    for (const v of Object.values(value as Record<string, unknown>)) {
      n += countText(v);
    }
    return n;
  }
  return 0;
}

// Soft gate: guests may use the metered routes freely until the AI has
// generated more than GUEST_AI_TEXT_LIMIT characters of text for them
// (about two paragraphs). Reads (GET/HEAD) are always free; each mutating
// request's response text is added to the per-session tally, and once the
// tally is over the limit further mutating requests ask them to sign in.
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
  const used = req.session.guestAiText ?? 0;
  if (used >= GUEST_AI_TEXT_LIMIT) {
    res.status(401).json(LOGIN_REQUIRED_BODY);
    return;
  }
  // Reserve a slice of the budget up-front and persist it BEFORE the (slow)
  // AI work starts, so a burst of parallel guest requests can't all pass the
  // pre-check against the same stale tally. When the response is ready the
  // reservation is replaced by the actual generated-text size.
  const RESERVATION = 500;
  req.session.guestAiText = used + RESERVATION;
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const actual = res.statusCode < 400 ? countText(body) : 0;
    // Swap this request's reservation for its actual cost (never refund
    // below the reserved baseline of other in-flight requests).
    const current = req.session.guestAiText ?? used + RESERVATION;
    req.session.guestAiText = Math.max(
      current - RESERVATION + actual,
      used + actual,
    );
    return originalJson(body);
  }) as Response["json"];
  req.session.save(() => next());
}

// Convenience accessor for handlers mounted behind identifyUser/requireAuth.
export function getUserId(req: Request): string {
  const stashed = (req as Request & { userId?: string }).userId;
  if (stashed) return stashed;
  return req.user ? String(req.user.id) : "";
}
