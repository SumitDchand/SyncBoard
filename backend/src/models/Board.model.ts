import mongoose, { Schema, Document } from 'mongoose';
import { TaskStatus, UserRole } from '../types';

export interface IBoardDocument extends Document {
  title: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: Array<{
    user: mongoose.Types.ObjectId;
    role: UserRole;
    joinedAt: Date;
  }>;
  columns: Array<{
    id: TaskStatus;
    title: string;
    order: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_COLUMNS: Array<{ id: TaskStatus; title: string; order: number }> = [
  { id: 'todo', title: 'To Do', order: 0 },
  { id: 'in_progress', title: 'In Progress', order: 1 },
  { id: 'review', title: 'Review', order: 2 },
  { id: 'completed', title: 'Completed', order: 3 },
];

const BoardSchema = new Schema<IBoardDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    columns: {
      type: [
        {
          id: {
            type: String,
            enum: ['todo', 'in_progress', 'review', 'completed'],
            required: true,
          },
          title: {
            type: String,
            required: true,
          },
          order: {
            type: Number,
            required: true,
          },
        },
      ],
      default: DEFAULT_COLUMNS,
    },
  },
  {
    timestamps: true,
  }
);

BoardSchema.index({ 'members.user': 1 });
BoardSchema.index({ owner: 1, createdAt: -1 });

export const Board = mongoose.model<IBoardDocument>('Board', BoardSchema);

