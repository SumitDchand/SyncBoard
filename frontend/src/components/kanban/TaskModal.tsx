import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Task, TaskPriority, TaskStatus, BoardMember } from '../../types';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialTask?: Task | null;
  defaultStatus?: TaskStatus;
  members: BoardMember[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  defaultStatus = 'todo',
  members,
}) => {
  const isEditing = Boolean(initialTask);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'medium',
      assignee: '',
      dueDate: '',
      labels: '',
    },
  });

  useEffect(() => {
    if (initialTask) {
      reset({
        title: initialTask.title,
        description: initialTask.description || '',
        status: initialTask.status,
        priority: initialTask.priority,
        assignee: initialTask.assignee ? initialTask.assignee.id || (initialTask.assignee as any)._id : '',
        dueDate: initialTask.dueDate ? initialTask.dueDate.slice(0, 10) : '',
        labels: initialTask.labels ? initialTask.labels.join(', ') : '',
      });
    } else {
      reset({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'medium',
        assignee: '',
        dueDate: '',
        labels: '',
      });
    }
  }, [initialTask, defaultStatus, reset]);

  const onFormSubmit = async (values: TaskFormData) => {
    const labelsArray = values.labels
      ? values.labels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

    const formattedPayload: any = {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      assignee: values.assignee ? values.assignee : null,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      labels: labelsArray,
      clientSentAt: Date.now(),
    };

    if (isEditing && initialTask) {
      formattedPayload.version = initialTask.version;
    }

    await onSubmit(formattedPayload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create New Task'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Implement WebSocket reconnection handler"
            {...register('title')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Provide context, acceptance criteria, or relevant links..."
            {...register('description')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.description.message}</p>
          )}
        </div>

        {/* Status & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Column Status
            </label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              {...register('priority')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Assignee & Due Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assignee
            </label>
            <select
              {...register('assignee')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
            >
              <option value="">Unassigned</option>
              {members.map((m) => {
                const u = m.user;
                const uid = u?.id || (u as any)?._id;
                return (
                  <option key={uid} value={uid}>
                    {u?.name} ({m.role})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Due Date
            </label>
            <input
              type="date"
              {...register('dueDate')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
            />
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Labels (comma separated)
          </label>
          <input
            type="text"
            placeholder="Frontend, Bug, HighPriority"
            {...register('labels')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm shadow-indigo-200 transition"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

