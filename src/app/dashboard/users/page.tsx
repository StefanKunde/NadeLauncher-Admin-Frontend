'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  X,
  Crown,
  Shield,
  ChevronDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { adminUsersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminUser, UserRole } from '@/lib/types';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterPremium, setFilterPremium] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminUsersApi.getAll();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Only admins can change user roles');
      return;
    }

    setUpdatingId(userId);
    try {
      const updated = await adminUsersApi.updateRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePremiumChange = async (userId: string, isPremium: boolean) => {
    setUpdatingId(userId);
    try {
      const updated = await adminUsersApi.updatePremium(userId, isPremium);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isPremium: updated.isPremium } : u))
      );
      toast.success(isPremium ? 'Premium enabled' : 'Premium disabled');
    } catch (error) {
      toast.error('Failed to update premium status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterPremium === 'premium' && !user.isPremium) return false;
    if (filterPremium === 'free' && user.isPremium) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        user.username.toLowerCase().includes(q) ||
        user.steamId.includes(q)
      );
    }
    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-admin"><Shield className="h-3 w-3" />Admin</span>;
      case 'worker':
        return <span className="badge badge-worker"><Crown className="h-3 w-3" />Worker</span>;
      default:
        return <span className="badge badge-user">User</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
            <Users className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-gold">Users</h1>
          </div>
        </div>
        <p className="text-[#6b6b8a] text-lg ml-[52px]">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Role filter */}
        <div className="relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-2 pr-10"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="worker">Worker</option>
            <option value="user">User</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
        </div>

        {/* Premium filter */}
        <div className="relative">
          <select
            value={filterPremium}
            onChange={(e) => setFilterPremium(e.target.value)}
            className="appearance-none bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] cursor-pointer hover:border-[#3a3a5e] transition-colors focus:outline-none focus:border-[#f0a500]/40 px-4 py-2 pr-10"
          >
            <option value="all">All Status</option>
            <option value="premium">Premium</option>
            <option value="free">Free</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b8a] pointer-events-none left-3"
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-[#12121a] border border-[#2a2a3e] rounded-xl text-sm text-[#e8e8e8] placeholder-[#6b6b8a]/50 w-64 focus:outline-none focus:border-[#f0a500]/40 transition-colors pl-10 pr-10 py-2"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b8a] hover:text-[#e8e8e8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <motion.div
        className="glass rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Steam ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#1a1a2e]">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.username}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#6b6b8a]">
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#e8e8e8]">{user.username}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <a
                    href={user.profileUrl || `https://steamcommunity.com/profiles/${user.steamId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#6b6b8a] hover:text-[#f0a500] transition-colors"
                  >
                    {user.steamId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td>{getRoleBadge(user.role)}</td>
                <td>
                  {user.isPremium ? (
                    <span className="badge badge-premium">
                      <Crown className="h-3 w-3" />
                      Premium
                    </span>
                  ) : (
                    <span className="badge badge-free">Free</span>
                  )}
                </td>
                <td className="text-[#6b6b8a]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {/* Role selector (admin only) */}
                    {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={updatingId === user.id}
                        className="appearance-none bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-xs text-[#e8e8e8] px-2 py-1.5 pr-6 cursor-pointer hover:border-[#3a3a5e] disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}

                    {/* Premium toggle */}
                    <button
                      onClick={() => handlePremiumChange(user.id, !user.isPremium)}
                      disabled={updatingId === user.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                        user.isPremium
                          ? 'bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/30 hover:bg-[#ff4444]/20'
                          : 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/30 hover:bg-[#f0a500]/20'
                      }`}
                    >
                      {updatingId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : user.isPremium ? (
                        'Remove Premium'
                      ) : (
                        'Add Premium'
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-[#6b6b8a]/30 mx-auto mb-4" />
            <p className="text-[#6b6b8a]">No users found</p>
          </div>
        )}
      </motion.div>

      {/* Stats row */}
      <div className="mt-4 flex items-center justify-between text-sm text-[#6b6b8a]">
        <p>
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>
    </div>
  );
}
