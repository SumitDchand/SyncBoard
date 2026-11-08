import React from 'react';
import { Board, BoardMember, User, TaskPriority } from '../../types';
import {
  Search,
  Filter,
  Plus,
  Users,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';

interface BoardHeaderProps {
  board: Board;
  search: string;
  onSearchChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  onlineUsers: User[];
  onOpenMembers: () => void;
  onOpenNewTask: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  sortBy,
  onSortByChange,
  onlineUsers,
  onOpenMembers,
  onOpenNewTask,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        {/* Top Row: Title, Description, Presence & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {board.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Real-Time Sync
              </span>
            </div>
            {board.description && (
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
                {board.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Online Collaborators Stack */}
            <div
              onClick={onOpenMembers}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
              title="Click to view all board collaborators"
            >
              <div className="flex -space-x-2 overflow-hidden">
                {onlineUsers.slice(0, 4).map((u, i) => {
                  const uid = u.id || (u as any)._id || i;
                  return (
                    <div key={uid} className="relative inline-block">
                      <img
                        src={
                          u.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            u.name
                          )}&background=6366f1&color=fff&size=24`
                        }
                        alt={u.name}
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                    </div>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {onlineUsers.length} Online
              </span>
            </div>

            {/* Manage Team Button */}
            <button
              onClick={onOpenMembers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Team ({board.members.length})</span>
            </button>

            {/* Create Task Button */}
            <button
              onClick={onOpenNewTask}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Search, Filters & Sorting Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks or tags..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Priority Filter */}
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={priorityFilter}
                onChange={(e) => onPriorityFilterChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => onAssigneeFilterChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {board.members.map((m) => {
                const u = m.user;
                const uid = u?.id || (u as any)?._id;
                return (
                  <option key={uid} value={uid}>
                    {u?.name}
                  </option>
                );
              })}
            </select>

            {/* Sort Order */}
            <div className="flex items-center gap-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="order">Custom Order</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
                <option value="createdAt">Date Created</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

