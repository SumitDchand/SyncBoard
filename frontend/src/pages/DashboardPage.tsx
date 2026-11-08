import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '../services/board.service';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Board } from '../types';
import { Plus, Trello, Users, ArrowRight, Trash2, Calendar, Crown } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: boards = [], isLoading } = useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: boardService.getBoards,
  });

  const createBoardMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      boardService.createBoard(data.title, data.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId: string) => boardService.deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createBoardMutation.mutateAsync({
      title: newTitle.trim(),
      description: newDesc.trim(),
    });
  };

  const handleDeleteBoard = async (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm(`Are you sure you want to delete "${board.title}" and all its tasks?`)) {
      await deleteBoardMutation.mutateAsync(board._id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your collaborative boards, tasks, and real-time sprint workflows.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Board</span>
          </button>
        </div>

        {/* Boards Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Your Boards ({boards.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="py-20">
              <LoadingSpinner size="lg" text="Loading boards..." />
            </div>
          ) : boards.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 max-w-lg mx-auto mt-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Trello className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No boards yet</h3>
              <p className="mt-1 text-xs text-slate-500">
                Get started by creating your first collaborative Kanban board.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Board</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board) => {
                const isOwner =
                  String((board.owner as any)?._id || (board.owner as any)?.id || board.owner) ===
                  String(user?.id);

                return (
                  <Link
                    key={board._id}
                    to={`/boards/${board._id}`}
                    className="group relative bg-white rounded-2xl p-6 shadow-xs border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar with Icon & Role */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                          <Trello className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isOwner && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Crown className="w-3 h-3 text-amber-500" /> Owner
                            </span>
                          )}

                          {isOwner && (
                            <button
                              onClick={(e) => handleDeleteBoard(e, board)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete board"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {board.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {board.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5" title="Members">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{board.members.length} members</span>
                      </div>

                      <span className="flex items-center gap-1 font-semibold text-indigo-600 group-hover:translate-x-1 transition">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Board Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Collaborative Board"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateBoard} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Board Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Q4 Growth & Infrastructure Sprint"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Sprint goals, milestones, or project purpose..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBoardMutation.isPending || !newTitle.trim()}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs"
            >
              {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

