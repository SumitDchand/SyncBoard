import mongoose, { Schema, Document } from 'mongoose';
import { TaskPriority, TaskStatus } from '../types';

export interface ITaskDocument extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  boardId: mongoose.Types.ObjectId;
  creator: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId | null;
  dueDate?: Date | null;
  labels: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    labels: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound indexes for board task retrieval and filtering
TaskSchema.index({ boardId: 1, status: 1, order: 1 });
TaskSchema.index({ boardId: 1, priority: 1 });
TaskSchema.index({ boardId: 1, assignee: 1 });
TaskSchema.index({ boardId: 1, createdAt: -1 });

// Increment version on update
TaskSchema.pre<ITaskDocument>('save', function () {
  if (this.isModified() && !this.isNew) {
    this.version = (this.version || 0) + 1;
  }
});

export const Task = mongoose.model<ITaskDocument>('Task', TaskSchema);
