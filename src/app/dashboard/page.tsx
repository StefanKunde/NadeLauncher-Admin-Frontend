'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Crown,
  FolderOpen,
  Target,
  Activity,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { adminStatsApi } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';
import toast from 'react-hot-toast';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminStatsApi.getDashboard();
        setStats(data);
      } catch (error) {
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a500]" />
          <p className="text-[#6b6b8a]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: '#e8e8e8',
      bgColor: 'rgba(232, 232, 232, 0.1)',
    },
    {
      label: 'Premium Users',
      value: stats?.premiumUsers ?? 0,
      icon: Crown,
      color: '#f0a500',
      bgColor: 'rgba(240, 165, 0, 0.1)',
    },
    {
      label: 'Free Users',
      value: stats?.freeUsers ?? 0,
      icon: Users,
      color: '#6b6b8a',
      bgColor: 'rgba(107, 107, 138, 0.1)',
    },
    {
      label: 'Collections',
      value: stats?.totalCollections ?? 0,
      icon: FolderOpen,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
    {
      label: 'Total Lineups',
      value: stats?.totalLineups ?? 0,
      icon: Target,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
    },
    {
      label: 'Active Sessions',
      value: stats?.activeSessions ?? 0,
      icon: Activity,
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.1)',
    },
    {
      label: 'Total Sessions',
      value: stats?.totalSessions ?? 0,
      icon: TrendingUp,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      label: 'Subscriptions',
      value: stats?.totalSubscriptions ?? 0,
      icon: FolderOpen,
      color: '#f43f5e',
      bgColor: 'rgba(244, 63, 94, 0.1)',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient-gold mb-2">Dashboard</h1>
        <p className="text-[#6b6b8a]">Overview of NadeLauncher statistics</p>
      </div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="glass rounded-xl p-5 card-hover"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#6b6b8a] text-sm font-medium mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Role Distribution */}
      <motion.div
        className="mt-8 glass rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-[#e8e8e8] mb-4">
          Role Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#a78bfa]" />
              <span className="text-[#6b6b8a] text-sm">Admins</span>
            </div>
            <p className="text-2xl font-bold text-[#a78bfa]">
              {stats?.adminCount ?? 0}
            </p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#60a5fa]" />
              <span className="text-[#6b6b8a] text-sm">Workers</span>
            </div>
            <p className="text-2xl font-bold text-[#60a5fa]">
              {stats?.workerCount ?? 0}
            </p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#6b6b8a]" />
              <span className="text-[#6b6b8a] text-sm">Regular Users</span>
            </div>
            <p className="text-2xl font-bold text-[#e8e8e8]">
              {(stats?.totalUsers ?? 0) - (stats?.adminCount ?? 0) - (stats?.workerCount ?? 0)}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
