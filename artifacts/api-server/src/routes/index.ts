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
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Open routers (no per-user scoping required).
router.use(healthRouter);
router.use(tutorRouter);
router.use(detectionRouter);
router.use(diagnosticsRouter);

// Everything below requires an authenticated user.
router.use(requireAuth);
router.use(courseRouter);
router.use(assignmentsRouter);
router.use(practiceRouter);
router.use(practiceRunsRouter);
router.use(analyticsRouter);

export default router;
