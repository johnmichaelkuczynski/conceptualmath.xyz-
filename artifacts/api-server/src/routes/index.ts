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
import { identifyUser } from "../middlewares/identifyUser";
import { storage } from "../storage";

const router: IRouter = Router();

// Health checks do not need a visitor session.
router.use(healthRouter);

// Every course feature is open. A stable anonymous identity keeps each
// visitor's progress, practice, assessments, and analytics separate.
router.use(identifyUser);
router.get("/unique-visitors", async (req, res) => {
  try {
    res.json(await storage.getUniqueVisitorStats());
  } catch (err) {
    req.log.error({ err }, "Failed to load unique visitor data");
    res.status(500).json({ error: "Failed to load unique visitor data" });
  }
});
router.use(courseRouter);
router.use(tutorRouter);
router.use(detectionRouter);
router.use(assignmentsRouter);
router.use(practiceRouter);
router.use(practiceRunsRouter);
router.use(analyticsRouter);
router.use(assessmentsRouter);
router.use(diagnosticsRouter);

export default router;
