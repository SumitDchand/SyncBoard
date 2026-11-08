import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, TaskPriority } from '../../types';
import { Calendar, Tag, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  low: {
    label: 'Low',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  high: {
    label: 'High',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  critical: {
    label: 'Critical',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const priorityInfo = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isOverdue =
    task.dueDate &&
    task.status !== 'completed' &&
    new Date(task.dueDate).getTime() < Date.now();

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group relative bg-white rounded-xl p-4 shadow-xs border transition-all duration-150 mb-3 select-none ${
            snapshot.isDragging
              ? 'shadow-xl border-indigo-400 rotate-1 ring-2 ring-indigo-500/20 z-30'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {/* Top Row: Priority Badge & Actions Menu */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityInfo.bg} ${priorityInfo.text} ${priorityInfo.border}`}
            >
              {priorityInfo.label}
            </span>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="opacity-0 group-hover:opacity-100 transition p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Task options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-32 rounded-lg bg-white p-1 shadow-lg border border-slate-100 z-40 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-50 transition text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Task</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(task._id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
            {task.title}
          </h4>

          {/* Description Preview */}
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {task.labels.map((label, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Bottom Row: Due Date & Assignee Avatar */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              {formattedDueDate && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                  }`}
                  title={isOverdue ? 'Task is overdue' : 'Due date'}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {formattedDueDate}
                </span>
              )}
            </div>

            {task.assignee ? (
              <div
                className="flex items-center gap-1"
                title={`Assigned to ${task.assignee.name}`}
              >
                <img
                  src={
                    task.assignee.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      task.assignee.name
                    )}&background=818cf8&color=fff&size=24`
                  }
                  alt={task.assignee.name}
                  className="w-5 h-5 rounded-full object-cover border border-slate-200"
                />
                <span className="text-[11px] font-medium text-slate-700 hidden sm:inline max-w-[90px] truncate">
                  {task.assignee.name}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">Unassigned</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

