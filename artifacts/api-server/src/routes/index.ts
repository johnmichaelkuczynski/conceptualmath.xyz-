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
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Open routers (public, no user data or costly AI calls).
router.use(healthRouter);

// Everything below requires an authenticated user. Tutor, detection, and
// diagnostics make paid OpenAI calls (and diagnostics can reset data), so
// they must not be publicly callable.
router.use(requireAuth);
router.use(tutorRouter);
router.use(detectionRouter);
router.use(diagnosticsRouter);
router.use(courseRouter);
router.use(assignmentsRouter);
router.use(practiceRouter);
router.use(practiceRunsRouter);
router.use(analyticsRouter);
router.use(assessmentsRouter);

export default router;
