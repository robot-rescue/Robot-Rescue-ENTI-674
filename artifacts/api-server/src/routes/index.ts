import { Router, type IRouter } from "express";
import healthRouter from "./health";
import incidentsRouter from "./incidents";
import analyticsRouter from "./analytics";
import { seedIfEmpty } from "./store";

const router: IRouter = Router();

router.use(healthRouter);
router.use(incidentsRouter);
router.use(analyticsRouter);

// Seed the database with initial data if it is empty.
// Runs once at startup; subsequent restarts are no-ops because rows already exist.
seedIfEmpty().catch((err) => console.error("[seed] failed:", err));

export default router;
