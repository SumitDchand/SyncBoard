import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  updateTaskSchema,
  moveTaskSchema,
  taskIdParamSchema,
} from '../validators/task.validator';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.get('/:taskId', validateRequest(taskIdParamSchema), TaskController.getTaskById);
router.patch('/:taskId', validateRequest(updateTaskSchema), TaskController.updateTask);
router.patch('/:taskId/move', validateRequest(moveTaskSchema), TaskController.moveTask);
router.delete('/:taskId', validateRequest(taskIdParamSchema), TaskController.deleteTask);

export default router;

