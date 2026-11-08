import { z } from 'zod';

export const createTaskSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid board ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().max(5000).optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'completed']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    labels: z.array(z.string()).default([]),
    clientSentAt: z.number().optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'completed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    labels: z.array(z.string()).optional(),
    order: z.number().optional(),
    version: z.number().optional(),
    clientSentAt: z.number().optional(),
  }),
});

export const moveTaskSchema = z.object({
  params: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID'),
  }),
  body: z.object({
    status: z.enum(['todo', 'in_progress', 'review', 'completed']),
    order: z.number().min(0),
    clientSentAt: z.number().optional(),
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task ID'),
  }),
});

export const getTasksQuerySchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid board ID'),
  }),
  query: z.object({
    status: z.enum(['todo', 'in_progress', 'review', 'completed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignee: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'priority', 'dueDate', 'order']).default('order'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }).optional(),
});

