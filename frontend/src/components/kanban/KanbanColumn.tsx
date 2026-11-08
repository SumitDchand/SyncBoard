import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus, CheckCircle2, Clock, CircleDot, AlertCircle } from 'lucide-react';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMN_ICONS: Record<TaskStatus, { icon: React.ReactNode; color: string }> = {
  todo: {
    icon: <CircleDot className="w-4 h-4 text-slate-500" />,
    color: 'border-t-slate-400',
  },
  in_progress: {
    icon: <Clock className="w-4 h-4 text-indigo-500" />,
    color: 'border-t-indigo-500',
  },
  review: {
    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    color: 'border-t-amber-500',
  },
  completed: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    color: 'border-t-emerald-500',
  },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const meta = COLUMN_ICONS[status] || COLUMN_ICONS.todo;

  return (
    <div
      className={`flex flex-col h-full bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 border-t-4 ${meta.color} min-w-[280px] w-full lg:w-[320px] flex-shrink-0`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-2">
          {meta.icon}
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-slate-600 border border-slate-200 shadow-2xs">
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition"
          aria-label={`Add task to ${title}`}
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Task Container */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-0.5 min-h-[300px] rounded-xl transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-50/50 ring-2 ring-indigo-300 ring-dashed' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-36 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">No tasks in this column</p>
                <button
                  onClick={() => onAddTask(status)}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  + Add task
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

