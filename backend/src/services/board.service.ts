import { Board } from '../models/Board.model';
import { User } from '../models/User.model';
import { Task } from '../models/Task.model';
import { ApiError } from '../utils/response';
import { UserRole } from '../types';
import mongoose from 'mongoose';

export class BoardService {
  static async createBoard(title: string, description: string | undefined, ownerId: string) {
    const board = await Board.create({
      title,
      description: description || '',
      owner: new mongoose.Types.ObjectId(ownerId),
      members: [
        {
          user: new mongoose.Types.ObjectId(ownerId),
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
    });

    return await board.populate('owner members.user', 'name email avatar');
  }

  static async getUserBoards(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const boards = await Board.find({
      $or: [{ owner: userObjectId }, { 'members.user': userObjectId }],
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    return boards;
  }

  static async getBoardById(boardId: string, userId: string) {
    const board = await Board.findById(boardId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!board) {
      throw new ApiError(404, 'Board not found');
    }

    // Verify access
    const isOwner = board.owner._id.toString() === userId;
    const isMember = board.members.some(
      (m: any) => m.user._id?.toString() === userId || m.user.toString() === userId
    );

    if (!isOwner && !isMember) {
      throw new ApiError(403, 'You do not have access to this board');
    }

    return board;
  }

  static async updateBoard(
    boardId: string,
    userId: string,
    data: { title?: string; description?: string }
  ) {
    const board = await this.getBoardById(boardId, userId);

    // Only owner or admin can update board metadata
    const userMember = board.members.find(
      (m: any) => (m.user._id?.toString() || m.user.toString()) === userId
    );
    const role: UserRole = board.owner._id.toString() === userId ? 'owner' : userMember?.role || 'member';

    if (role !== 'owner' && role !== 'admin') {
      throw new ApiError(403, 'Only board owner or admins can modify board settings');
    }

    if (data.title !== undefined) board.title = data.title;
    if (data.description !== undefined) board.description = data.description;

    await board.save();
    return board;
  }

  static async deleteBoard(boardId: string, userId: string) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new ApiError(404, 'Board not found');
    }

    if (board.owner.toString() !== userId) {
      throw new ApiError(403, 'Only the board owner can delete this board');
    }

    // Delete all tasks associated with this board
    await Task.deleteMany({ boardId: board._id });

    // Delete the board
    await Board.findByIdAndDelete(boardId);

    return { message: 'Board and associated tasks successfully deleted' };
  }

  static async addMember(
    boardId: string,
    requesterId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new ApiError(404, 'Board not found');
    }

    const reqIdStr = String(requesterId);
    const ownerIdStr = (board.owner as any)._id ? (board.owner as any)._id.toString() : board.owner.toString();

    // Verify requester permission (owner or admin)
    const isOwner = ownerIdStr === reqIdStr;
    const requesterMember = board.members.find(
      (m) => ((m.user as any)._id ? (m.user as any)._id.toString() : m.user.toString()) === reqIdStr
    );
    const requesterRole = isOwner ? 'owner' : requesterMember?.role;

    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      throw new ApiError(403, 'Only board owner or admins can invite new members');
    }

    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      throw new ApiError(404, 'User with this email was not found');
    }

    // Check if already member
    const existing = board.members.find(
      (m) => m.user.toString() === targetUser._id.toString()
    );
    if (existing) {
      throw new ApiError(400, 'User is already a member of this board');
    }

    board.members.push({
      user: targetUser._id,
      role,
      joinedAt: new Date(),
    });

    await board.save();
    return await board.populate('members.user', 'name email avatar');
  }

  static async removeMember(boardId: string, requesterId: string, targetUserId: string) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new ApiError(404, 'Board not found');
    }

    const reqIdStr = String(requesterId);
    const targetIdStr = String(targetUserId);
    const ownerIdStr = (board.owner as any)._id ? (board.owner as any)._id.toString() : board.owner.toString();

    if (ownerIdStr === targetIdStr) {
      throw new ApiError(400, 'Cannot remove the board owner');
    }

    const isSelfRemoval = reqIdStr === targetIdStr;
    const isOwner = ownerIdStr === reqIdStr;
    const requesterMember = board.members.find(
      (m) => ((m.user as any)._id ? (m.user as any)._id.toString() : m.user.toString()) === reqIdStr
    );
    const requesterRole = isOwner ? 'owner' : requesterMember?.role;

    if (!isSelfRemoval && requesterRole !== 'owner' && requesterRole !== 'admin') {
      throw new ApiError(403, 'Only owner or admin can remove other members');
    }

    board.members = board.members.filter(
      (m) => ((m.user as any)._id ? (m.user as any)._id.toString() : m.user.toString()) !== targetIdStr
    );

    // Unassign tasks assigned to removed user on this board
    await Task.updateMany(
      { boardId: board._id, assignee: targetUserId },
      { $set: { assignee: null } }
    );

    await board.save();
    return await board.populate('members.user', 'name email avatar');
  }

  static async getMembers(boardId: string, userId: string) {
    const board = await this.getBoardById(boardId, userId);
    return board.members;
  }
}

