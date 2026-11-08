import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { boardService } from '../services/board.service';
import { taskService } from '../services/task.service';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { BoardHeader } from '../components/kanban/BoardHeader';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { TaskModal } from '../components/kanban/TaskModal';
import { MemberModal } from '../components/kanban/MemberModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Board, Task, TaskStatus } from '../types';

const COLUMN_KEYS: Array<{ id: TaskStatus; title: string }> = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'completed', title: 'Completed' },
];

export const BoardPage: React.FC = () => {
  const { boardId = '' } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, joinBoard, leaveBoard, onlineUsers, recordUpdateLatency } = useSocket();

  // Local filter & search state
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortBy, setSortBy] = useState('order');

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  // Fetch Board Details
  const {
    data: board,
    isLoading: isBoardLoading,
    error: boardError,
  } = useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardById(boardId),
    enabled: Boolean(boardId),
    retry: 1,
  });

  // Fetch Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', boardId],
    queryFn: () => taskService.getTasks(boardId),
    enabled: Boolean(boardId),
  });

  // Real-Time Socket.IO Synchronization Lifecycle
  useEffect(() => {
    if (!boardId || !socket) return;

    joinBoard(boardId);

    // Socket Event Listeners for authoritative real-time updates
    const handleTaskCreated = (newTask: Task) => {
      recordUpdateLatency(newTask._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (oldTasks = []) => {
        // Prevent duplicates
        if (oldTasks.some((t) => t._id === newTask._id)) return oldTasks;
        return [...oldTasks, newTask];
      });
    };

    const handleTaskUpdated = (updatedTask: Task) => {
      recordUpdateLatency(updatedTask._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (oldTasks = []) => {
        return oldTasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));
      });
    };

    const handleTaskMoved = (movedTask: Task) => {
      recordUpdateLatency(movedTask._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (oldTasks = []) => {
        return oldTasks.map((t) => (t._id === movedTask._id ? movedTask : t));
      });
    };

    const handleTaskDeleted = (data: { taskId: string; boardId: string; _metrics?: any }) => {
      recordUpdateLatency(data._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (oldTasks = []) => {
        return oldTasks.filter((t) => t._id !== data.taskId);
      });
    };

    const handleStateSync = (syncData: { board: Board; tasks: Task[] }) => {
      if (syncData.board) {
        queryClient.setQueryData(['board', boardId], syncData.board);
      }
      if (syncData.tasks) {
        queryClient.setQueryData(['tasks', boardId], syncData.tasks);
      }
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('board:state-sync', handleStateSync);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('board:state-sync', handleStateSync);
      leaveBoard(boardId);
    };
  }, [boardId, socket, joinBoard, leaveBoard, queryClient, recordUpdateLatency]);

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => taskService.createTask(boardId, data),
    onSuccess: (savedTask) => {
      recordUpdateLatency(savedTask._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (old = []) => {
        if (old.some((t) => t._id === savedTask._id)) return old;
        return [...old, savedTask];
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      taskService.updateTask(taskId, data),
    onSuccess: (updatedTask) => {
      recordUpdateLatency(updatedTask._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (old = []) =>
        old.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
      order,
    }: {
      taskId: string;
      status: TaskStatus;
      order: number;
    }) => taskService.moveTask(taskId, status, order),
    onSuccess: (movedTask) => {
      recordUpdateLatency(movedTask._metrics);
      queryClient.setQueryData<Task[]>(['tasks', boardId], (old = []) =>
        old.map((t) => (t._id === movedTask._id ? movedTask : t))
      );
    },
    onError: () => {
      // Revert to authoritative state on failure
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(taskId),
    onSuccess: (result) => {
      queryClient.setQueryData<Task[]>(['tasks', boardId], (old = []) =>
        old.filter((t) => t._id !== result.taskId)
      );
    },
  });

  // Member Mutations
  const addMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'member' }) =>
      boardService.addMember(boardId, email, role),
    onSuccess: (updatedBoard) => {
      queryClient.setQueryData(['board', boardId], updatedBoard);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => boardService.removeMember(boardId, userId),
    onSuccess: (updatedBoard) => {
      queryClient.setQueryData(['board', boardId], updatedBoard);
    },
  });

  // Drag and Drop Handler
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const destStatus = destination.droppableId as TaskStatus;
      const destOrder = destination.index;

      // Optimistic cache update for instant UI feedback
      queryClient.setQueryData<Task[]>(['tasks', boardId], (oldTasks = []) => {
        const cloned = [...oldTasks];
        const taskIdx = cloned.findIndex((t) => t._id === draggableId);
        if (taskIdx === -1) return oldTasks;

        const [moved] = cloned.splice(taskIdx, 1);
        moved.status = destStatus;
        moved.order = destOrder;

        cloned.splice(destOrder, 0, moved);
        return cloned;
      });

      // Dispatch authoritative mutation to server
      moveTaskMutation.mutate({
        taskId: draggableId,
        status: destStatus,
        order: destOrder,
      });
    },
    [boardId, moveTaskMutation, queryClient]
  );

  // Modal Triggers
  const openNewTaskModal = (status: TaskStatus = 'todo') => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleTaskSubmit = async (data: any) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({ taskId: editingTask._id, data });
    } else {
      await createTaskMutation.mutateAsync(data);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTaskMutation.mutateAsync(taskId);
    }
  };

  // Filtered & Sorted Tasks by Column
  const columnTasksMap = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      completed: [],
    };

    // Filter tasks
    const filtered = tasks.filter((t) => {
      if (priorityFilter && t.priority !== priorityFilter) return false;

      if (assigneeFilter) {
        if (assigneeFilter === 'unassigned') {
          if (t.assignee) return false;
        } else {
          const assigneeId =
            (t.assignee as any)?._id || (t.assignee as any)?.id || t.assignee;
          if (String(assigneeId) !== String(assigneeFilter)) return false;
        }
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchLabel = t.labels?.some((l) => l.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchLabel) return false;
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 };
        return weights[b.priority] - weights[a.priority];
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // default: order
      return a.order - b.order;
    });

    // Group by column status
    filtered.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    });

    return map;
  }, [tasks, priorityFilter, assigneeFilter, search, sortBy]);

  if (isBoardLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading board & tasks..." />
        </div>
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-800">Board Not Found or Access Denied</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            You may not have authorization to view this private board, or it may have been deleted.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Navbar />

      {/* Board Top Header & Controls */}
      <BoardHeader
        board={board}
        search={search}
        onSearchChange={setSearch}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onlineUsers={onlineUsers}
        onOpenMembers={() => setMemberModalOpen(true)}
        onOpenNewTask={() => openNewTaskModal('todo')}
      />

      {/* Kanban Board Columns Area */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex items-start gap-5 h-[calc(100vh-210px)] pb-4 min-w-max">
            {COLUMN_KEYS.map((col) => (
              <KanbanColumn
                key={col.id}
                status={col.id}
                title={col.title}
                tasks={columnTasksMap[col.id] || []}
                onAddTask={openNewTaskModal}
                onEditTask={openEditTaskModal}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        initialTask={editingTask}
        defaultStatus={newTaskStatus}
        members={board.members}
      />

      {/* Member Management Modal */}
      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        board={board}
        currentUserId={user?.id || ''}
        onlineUsers={onlineUsers}
        onAddMember={async (email, role) => {
          await addMemberMutation.mutateAsync({ email, role });
        }}
        onRemoveMember={async (userId) => {
          await removeMemberMutation.mutateAsync(userId);
        }}
      />
    </div>
  );
};

