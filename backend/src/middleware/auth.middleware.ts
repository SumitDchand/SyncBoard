import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User, IUserDocument } from '../models/User.model';
import { Board, IBoardDocument } from '../models/Board.model';
import { ApiError } from '../utils/response';
import { UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  board?: IBoardDocument;
  memberRole?: UserRole;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token expired');
      }
      throw new ApiError(401, 'Invalid authentication token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export const requireBoardAccess = (minRole: UserRole = 'member') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User must be authenticated');
      }

      const boardId = req.params.boardId || req.body.boardId;
      if (!boardId) {
        throw new ApiError(400, 'Board ID parameter is required');
      }

      const board = await Board.findById(boardId);
      if (!board) {
        throw new ApiError(404, 'Board not found');
      }

      // Check if user is owner
      const isOwner = board.owner.toString() === req.user._id.toString();

      // Check if user is in members list
      const memberRecord = board.members.find(
        (m) => m.user.toString() === req.user!._id.toString()
      );

      const role: UserRole | null = isOwner ? 'owner' : memberRecord ? memberRecord.role : null;

      if (!role) {
        throw new ApiError(403, 'You do not have access to this board');
      }

      if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
        throw new ApiError(403, `Operation requires ${minRole} privileges or higher`);
      }

      req.board = board;
      req.memberRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

