import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Board, BoardMember, UserRole, User } from '../../types';
import { UserPlus, Shield, User as UserIcon, Trash2, Crown } from 'lucide-react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  currentUserId: string;
  onlineUsers: User[];
  onAddMember: (email: string, role: 'admin' | 'member') => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  board,
  currentUserId,
  onlineUsers,
  onAddMember,
  onRemoveMember,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerId = (board.owner as any)?._id || (board.owner as any)?.id || board.owner;
  const isOwner = String(ownerId) === String(currentUserId);
  const userMember = board.members.find((m) => {
    const uid = (m.user as any)?._id || (m.user as any)?.id || m.user;
    return String(uid) === String(currentUserId);
  });
  const isAdmin = isOwner || userMember?.role === 'admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddMember(email, role);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    if (window.confirm('Are you sure you want to remove this member from the board?')) {
      try {
        await onRemoveMember(targetUserId);
      } catch (err: any) {
        alert(err.message || 'Failed to remove member');
      }
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some((u) => {
      const uid = u.id || (u as any)._id;
      return String(uid) === String(userId);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Board Collaborators & Roles" maxWidth="md">
      <div className="space-y-6">
        {/* Invite Member Section (Only for owner/admin) */}
        {isAdmin && (
          <form onSubmit={handleInvite} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" /> Invite Collaborator
            </h4>

            {error && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition"
              >
                {isSubmitting ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Members List */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Current Members ({board.members.length})
          </h4>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
            {board.members.map((member) => {
              const u = member.user;
              const uid = u?.id || (u as any)?._id;
              const isOwnerUser = String(uid) === String(ownerId);
              const online = isUserOnline(uid);

              return (
                <div key={uid} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={
                          u?.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            u?.name || 'User'
                          )}&background=6366f1&color=fff&size=32`
                        }
                        alt={u?.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      {/* Real-time online presence dot */}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          online ? 'bg-emerald-500 ring-1 ring-emerald-300' : 'bg-slate-300'
                        }`}
                        title={online ? 'Online now' : 'Offline'}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        {u?.name}
                        {isOwnerUser && (
                          <span title="Board Owner">
                            <Crown className="w-3.5 h-3.5 text-amber-500 inline" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{u?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                        isOwnerUser
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : member.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isOwnerUser ? 'Owner' : member.role}
                    </span>

                    {isAdmin && !isOwnerUser && String(uid) !== String(currentUserId) && (
                      <button
                        onClick={() => handleRemove(uid)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
