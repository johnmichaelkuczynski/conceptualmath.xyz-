import { Router, type IRouter } from "express";
import healthRouter from "./health";
import courseRouter from "./course";
import assignmentsRouter from "./assignments";
import practiceRouter from "./practice";
import practiceRunsRouter from "./practice-runs";
import tutorRouter from "./tutor";
import detectionRouter from "./detection";
import analyticsRouter from "./analytics";
import diagnosticsRouter from "./diagnostics";
import assessmentsRouter from "./assessments";
import {
  identifyUser,
  requireAuth,
  guestUsageGate,
} from "../middlewares/requireAuth";

const router: IRouter = Router();

// Open routers (public, no user data or costly AI calls).
router.use(healthRouter);

// Browse-and-try tier: guests get a per-session identity and may read
// everything; their expensive interactions (tutor asks, graded answers,
// submissions) are metered by guestUsageGate. Past the allowance the API
// answers 401 LOGIN_REQUIRED and the client shows the sign-in reminder.
router.use(identifyUser);
router.use(guestUsageGate);
router.use(courseRouter);
router.use(tutorRouter);
router.use(detectionRouter);
router.use(assignmentsRouter);
router.use(practiceRouter);
router.use(practiceRunsRouter);

// Signed-in tier: progress charting and operator diagnostics require a real
// Google-authenticated user.
router.use(requireAuth);
router.use(analyticsRouter);
router.use(assessmentsRouter);
router.use(diagnosticsRouter);

export default router;
