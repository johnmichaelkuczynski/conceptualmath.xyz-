import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "node:crypto";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    visitorId?: string;
    visitorTracked?: string;
    guestId?: string;
    guestAiText?: number;
    devLoggedOut?: boolean;
    passport?: { user?: number | string };
  }
}

function trackVisitor(req: Request, visitorId: string): void {
  if (req.session.visitorTracked) return;
  req.session.visitorTracked = visitorId;
  storage.recordUniqueVisitor(visitorId).catch((err) => {
    req.log.error({ err }, "Failed to record unique visitor");
  });
}

export function identifyUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.session.visitorId) {
    // Preserve saved progress for browsers that existed before account access
    // was removed. Progress was keyed by the numeric account id or guest id.
    const previousAccountId = req.session.passport?.user;
    req.session.visitorId =
      previousAccountId !== undefined
        ? String(previousAccountId)
        : req.session.guestId ||
          `visitor_${randomBytes(9).toString("hex")}`;
    delete req.session.passport;
    delete req.session.guestId;
    delete req.session.guestAiText;
    delete req.session.devLoggedOut;
  }
  (req as Request & { userId?: string }).userId = req.session.visitorId;
  trackVisitor(req, req.session.visitorId);
  next();
}

export function getUserId(req: Request): string {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    throw new Error("Anonymous visitor identity was not initialized");
  }
  return userId;
}