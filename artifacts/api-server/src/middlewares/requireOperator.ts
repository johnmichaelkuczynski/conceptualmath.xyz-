import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const OPERATOR_KEY_HEADER = "x-course-operator-key";
const OPERATOR_KEY_PURPOSE = "developmental-math-operations";

function expectedOperatorKey(): Buffer | null {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) return null;
  return Buffer.from(
    createHmac("sha256", sessionSecret)
      .update(OPERATOR_KEY_PURPOSE)
      .digest("base64url"),
  );
}

export const requireOperator: RequestHandler = (req, res, next) => {
  const expected = expectedOperatorKey();
  const provided = req.get(OPERATOR_KEY_HEADER);
  const received = provided ? Buffer.from(provided) : null;

  if (
    !expected ||
    !received ||
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    res.status(403).json({ error: "Operator authorization required" });
    return;
  }

  next();
};