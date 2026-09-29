import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ollamaRouter from "./ollama";
import controlRouter from "./control";
import toolsRouter from "./tools";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ollamaRouter);
router.use(controlRouter);
router.use(toolsRouter);

export default router;
