import { Response, NextFunction } from 'express';
import { TaskService, TaskFilterOptions } from '../services/task.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitWithLatencyMetrics } from '../sockets/socket.events';
import { SOCKET_EVENTS } from '../types';

export class TaskController {
  static async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const serverReceivedAt = Date.now();
    try {
      const { title, description, status, priority, assignee, dueDate, labels, clientSentAt } = req.body;
      const boardId = String(req.params.boardId);

      const task = await TaskService.createTask(boardId, req.user!._id.toString(), {
        title,
        description,
        status,
        priority,
        assignee,
        dueDate,
        labels,
      });

      const serverDbWrittenAt = Date.now();

      // Broadcast real-time event to board room with latency metrics
      emitWithLatencyMetrics(
        boardId,
        SOCKET_EVENTS.TASK_CREATED,
        task,
        {
          clientSentAt,
          serverReceivedAt,
          serverDbWrittenAt,
        }
      );

      sendSuccess(res, task, 'Task created successfully', 201, {
        serverReceivedAt,
        serverDbWrittenAt,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const filters: TaskFilterOptions = {
        status: req.query.status as any,
        priority: req.query.priority as any,
        assignee: req.query.assignee as string,
        search: req.query.search as string,
        sortBy: (req.query.sortBy as any) || 'order',
        sortOrder: (req.query.sortOrder as any) || 'asc',
      };

      const tasks = await TaskService.getTasks(boardId, req.user!._id.toString(), filters);
      sendSuccess(res, tasks, 'Tasks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTaskById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = String(req.params.taskId);
      const task = await TaskService.getTaskById(taskId, req.user!._id.toString());
      sendSuccess(res, task, 'Task retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const serverReceivedAt = Date.now();
    try {
      const taskId = String(req.params.taskId);
      const { title, description, status, priority, assignee, dueDate, labels, order, version, clientSentAt } =
        req.body;

      const updatedTask = await TaskService.updateTask(taskId, req.user!._id.toString(), {
        title,
        description,
        status,
        priority,
        assignee,
        dueDate,
        labels,
        order,
        version,
      });

      const serverDbWrittenAt = Date.now();

      // Broadcast real-time event
      emitWithLatencyMetrics(
        updatedTask.boardId.toString(),
        SOCKET_EVENTS.TASK_UPDATED,
        updatedTask,
        {
          clientSentAt,
          serverReceivedAt,
          serverDbWrittenAt,
        }
      );

      sendSuccess(res, updatedTask, 'Task updated successfully', 200, {
        serverReceivedAt,
        serverDbWrittenAt,
      });
    } catch (error) {
      next(error);
    }
  }

  static async moveTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const serverReceivedAt = Date.now();
    try {
      const taskId = String(req.params.taskId);
      const { status, order, clientSentAt } = req.body;

      const movedTask = await TaskService.moveTask(taskId, req.user!._id.toString(), status, order);

      const serverDbWrittenAt = Date.now();

      // Broadcast real-time moved event
      emitWithLatencyMetrics(
        movedTask.boardId.toString(),
        SOCKET_EVENTS.TASK_MOVED,
        movedTask,
        {
          clientSentAt,
          serverReceivedAt,
          serverDbWrittenAt,
        }
      );

      sendSuccess(res, movedTask, 'Task moved successfully', 200, {
        serverReceivedAt,
        serverDbWrittenAt,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const serverReceivedAt = Date.now();
    try {
      const taskId = String(req.params.taskId);
      const result = await TaskService.deleteTask(taskId, req.user!._id.toString());

      const serverDbWrittenAt = Date.now();

      // Broadcast real-time deleted event
      emitWithLatencyMetrics(
        result.boardId,
        SOCKET_EVENTS.TASK_DELETED,
        result,
        {
          serverReceivedAt,
          serverDbWrittenAt,
        }
      );

      sendSuccess(res, result, 'Task deleted successfully', 200, {
        serverReceivedAt,
        serverDbWrittenAt,
      });
    } catch (error) {
      next(error);
    }
  }
}
