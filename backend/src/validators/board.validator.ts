import { z } from 'zod';

export const createBoardSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Board title is required').max(100),
    description: z.string().max(1000).optional(),
  }),
});

export const updateBoardSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid board ID'),
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
  }),
});

export const boardIdParamSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid board ID'),
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid board ID'),
  }),
  body: z.object({
    email: z.string().email('Valid user email is required'),
    role: z.enum(['admin', 'member']).default('member'),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid board ID'),
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  }),
});

