import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ollamaRouter from "./ollama";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ollamaRouter);

export default router;
