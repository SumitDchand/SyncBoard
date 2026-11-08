import { Task, ITaskDocument } from '../models/Task.model';
import { Board } from '../models/Board.model';
import { ApiError } from '../utils/response';
import { TaskPriority, TaskStatus } from '../types';
import mongoose from 'mongoose';

export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  search?: string;
  sortBy?: 'createdAt' | 'priority' | 'dueDate' | 'order';
  sortOrder?: 'asc' | 'desc';
}

export class TaskService {
  /**
   * Helper to verify if user has access to the board containing the task
   */
  static async verifyBoardMember(boardId: string | mongoose.Types.ObjectId, userId: string) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new ApiError(404, 'Board not found');
    }

    const isOwner = board.owner.toString() === userId;
    const isMember = board.members.some((m) => m.user.toString() === userId);

    if (!isOwner && !isMember) {
      throw new ApiError(403, 'You do not have access to this board');
    }

    return board;
  }

  static async createTask(
    boardId: string,
    creatorId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee?: string | null;
      dueDate?: Date | null;
      labels?: string[];
    }
  ) {
    await this.verifyBoardMember(boardId, creatorId);

    const status = data.status || 'todo';

    // Find highest order in target column to place new task at the bottom
    const maxOrderTask = await Task.findOne({ boardId, status })
      .sort({ order: -1 })
      .select('order');

    const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await Task.create({
      title: data.title,
      description: data.description || '',
      status,
      priority: data.priority || 'medium',
      order: nextOrder,
      boardId: new mongoose.Types.ObjectId(boardId),
      creator: new mongoose.Types.ObjectId(creatorId),
      assignee: data.assignee ? new mongoose.Types.ObjectId(data.assignee) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      labels: data.labels || [],
      version: 1,
    });

    return await task.populate('creator assignee', 'name email avatar');
  }

  static async getTasks(boardId: string, userId: string, filters: TaskFilterOptions = {}) {
    await this.verifyBoardMember(boardId, userId);

    const query: Record<string, any> = { boardId: new mongoose.Types.ObjectId(boardId) };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.assignee) {
      if (filters.assignee === 'unassigned') {
        query.assignee = null;
      } else {
        query.assignee = new mongoose.Types.ObjectId(filters.assignee);
      }
    }

    if (filters.search && filters.search.trim() !== '') {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { labels: searchRegex }];
    }

    const sortField = filters.sortBy || 'order';
    const sortDirection = filters.sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .populate('creator assignee', 'name email avatar')
      .sort({ [sortField]: sortDirection });

    return tasks;
  }

  static async getTaskById(taskId: string, userId: string) {
    const task = await Task.findById(taskId).populate('creator assignee', 'name email avatar');
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    await this.verifyBoardMember(task.boardId, userId);
    return task;
  }

  static async updateTask(
    taskId: string,
    userId: string,
    updateData: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee?: string | null;
      dueDate?: Date | null;
      labels?: string[];
      order?: number;
      version?: number;
    }
  ) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    await this.verifyBoardMember(task.boardId, userId);

    // Concurrency control: if client passed an expected version, check for conflicts
    if (updateData.version !== undefined && task.version !== updateData.version) {
      throw new ApiError(
        409,
        `Conflict detected: Task has been modified by another collaborator (Current version: ${task.version}, Provided: ${updateData.version})`
      );
    }

    if (updateData.title !== undefined) task.title = updateData.title;
    if (updateData.description !== undefined) task.description = updateData.description;
    if (updateData.priority !== undefined) task.priority = updateData.priority;
    if (updateData.labels !== undefined) task.labels = updateData.labels;

    if (updateData.assignee !== undefined) {
      task.assignee = updateData.assignee ? new mongoose.Types.ObjectId(updateData.assignee) : null;
    }

    if (updateData.dueDate !== undefined) {
      task.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
    }

    // Status or order change via updateTask
    if (updateData.status !== undefined && updateData.status !== task.status) {
      task.status = updateData.status;
    }

    if (updateData.order !== undefined) {
      task.order = updateData.order;
    }

    await task.save();
    return await task.populate('creator assignee', 'name email avatar');
  }

  static async moveTask(
    taskId: string,
    userId: string,
    newStatus: TaskStatus,
    newOrder: number
  ) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    await this.verifyBoardMember(task.boardId, userId);

    const oldStatus = task.status;
    const oldOrder = task.order;
    const boardId = task.boardId;

    if (oldStatus === newStatus) {
      // Reordering in same column
      if (newOrder > oldOrder) {
        // Shift tasks between oldOrder and newOrder down
        await Task.updateMany(
          {
            boardId,
            status: oldStatus,
            order: { $gt: oldOrder, $lte: newOrder },
            _id: { $ne: task._id },
          },
          { $inc: { order: -1 } }
        );
      } else if (newOrder < oldOrder) {
        // Shift tasks between newOrder and oldOrder up
        await Task.updateMany(
          {
            boardId,
            status: oldStatus,
            order: { $gte: newOrder, $lt: oldOrder },
            _id: { $ne: task._id },
          },
          { $inc: { order: 1 } }
        );
      }
    } else {
      // Moving across columns
      // 1. Shift tasks in old column above oldOrder down
      await Task.updateMany(
        {
          boardId,
          status: oldStatus,
          order: { $gt: oldOrder },
          _id: { $ne: task._id },
        },
        { $inc: { order: -1 } }
      );

      // 2. Shift tasks in new column at or above newOrder up
      await Task.updateMany(
        {
          boardId,
          status: newStatus,
          order: { $gte: newOrder },
          _id: { $ne: task._id },
        },
        { $inc: { order: 1 } }
      );
    }

    task.status = newStatus;
    task.order = newOrder;
    await task.save();

    return await task.populate('creator assignee', 'name email avatar');
  }

  static async deleteTask(taskId: string, userId: string) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    await this.verifyBoardMember(task.boardId, userId);

    const { boardId, status, order } = task;

    await Task.findByIdAndDelete(taskId);

    // Reorder remaining tasks in that column
    await Task.updateMany(
      {
        boardId,
        status,
        order: { $gt: order },
      },
      { $inc: { order: -1 } }
    );

    return {
      taskId: task._id.toString(),
      boardId: boardId.toString(),
      status,
      order,
    };
  }
}

