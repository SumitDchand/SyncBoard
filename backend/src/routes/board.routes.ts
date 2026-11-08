import { Router } from 'express';
import { BoardController } from '../controllers/board.controller';
import { TaskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createBoardSchema,
  updateBoardSchema,
  boardIdParamSchema,
  addMemberSchema,
  removeMemberSchema,
} from '../validators/board.validator';
import { createTaskSchema, getTasksQuerySchema } from '../validators/task.validator';

const router = Router();

// All board routes require authentication
router.use(authenticate);

// Board CRUD
router.post('/', validateRequest(createBoardSchema), BoardController.createBoard);
router.get('/', BoardController.getUserBoards);
router.get('/:boardId', validateRequest(boardIdParamSchema), BoardController.getBoardById);
router.patch('/:boardId', validateRequest(updateBoardSchema), BoardController.updateBoard);
router.delete('/:boardId', validateRequest(boardIdParamSchema), BoardController.deleteBoard);

// Board Member Management
router.get('/:boardId/members', validateRequest(boardIdParamSchema), BoardController.getMembers);
router.post('/:boardId/members', validateRequest(addMemberSchema), BoardController.addMember);
router.delete('/:boardId/members/:userId', validateRequest(removeMemberSchema), BoardController.removeMember);

// Board Tasks Sub-routes
router.post(
  '/:boardId/tasks',
  validateRequest(createTaskSchema),
  TaskController.createTask
);
router.get(
  '/:boardId/tasks',
  validateRequest(getTasksQuerySchema),
  TaskController.getTasks
);

export default router;

