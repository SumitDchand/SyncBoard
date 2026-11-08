import { Response, NextFunction } from 'express';
import { BoardService } from '../services/board.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class BoardController {
  static async createBoard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description } = req.body;
      const board = await BoardService.createBoard(title, description, req.user!._id.toString());
      sendSuccess(res, board, 'Board created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getUserBoards(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boards = await BoardService.getUserBoards(req.user!._id.toString());
      sendSuccess(res, boards, 'Boards retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBoardById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const board = await BoardService.getBoardById(boardId, req.user!._id.toString());
      sendSuccess(res, board, 'Board retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateBoard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const { title, description } = req.body;
      const board = await BoardService.updateBoard(boardId, req.user!._id.toString(), {
        title,
        description,
      });
      sendSuccess(res, board, 'Board updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteBoard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const result = await BoardService.deleteBoard(boardId, req.user!._id.toString());
      sendSuccess(res, result, 'Board deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const { email, role } = req.body;
      const board = await BoardService.addMember(
        boardId,
        req.user!._id.toString(),
        email,
        role
      );
      sendSuccess(res, board, 'Member added to board successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const targetUserId = String(req.params.userId);
      const board = await BoardService.removeMember(
        boardId,
        req.user!._id.toString(),
        targetUserId
      );
      sendSuccess(res, board, 'Member removed from board successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const boardId = String(req.params.boardId);
      const members = await BoardService.getMembers(boardId, req.user!._id.toString());
      sendSuccess(res, members, 'Board members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
