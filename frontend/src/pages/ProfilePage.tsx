import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { User, Mail, Shield, Calendar, Clock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">User Profile & Account</h1>
        <p className="text-sm text-slate-500 mb-8">
          Personal identification, authentication settings, and account details.
        </p>

        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="h-28 bg-gradient-to-r from-indigo-600 to-indigo-800" />

          {/* Profile Card Content */}
          <div className="p-6 sm:p-8 pt-0 -mt-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img
                  src={
                    user?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.name || 'User'
                    )}&background=6366f1&color=fff&size=80`
                  }
                  alt={user?.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md"
                />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="w-3.5 h-3.5" /> Authenticated via JWT
              </span>
            </div>

            {/* Account Details */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Full Name
                </div>
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address
                </div>
                <p className="text-sm font-semibold text-slate-800">{user?.email}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" /> Session Security
                </div>
                <p className="text-xs text-slate-700">
                  HTTP-Only Refresh Token Cookie with automatic token rotation and replay prevention.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Real-Time Engine
                </div>
                <p className="text-xs text-slate-700">
                  Connected to WebSocket room partition with sub-100ms state propagation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

