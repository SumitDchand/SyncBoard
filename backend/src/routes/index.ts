import { Router } from 'express';
import authRoutes from './auth.routes';
import boardRoutes from './board.routes';
import taskRoutes from './task.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/boards', boardRoutes);
router.use('/tasks', taskRoutes);

export default router;

