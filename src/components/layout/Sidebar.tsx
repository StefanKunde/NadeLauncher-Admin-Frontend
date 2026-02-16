'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  LogOut,
  Shield,
  Crown,
  Server,
  EyeOff,
  Activity,
  Database,
  Map,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/users', icon: Users, label: 'Users' },
  { href: '/dashboard/collections', icon: FolderOpen, label: 'Collections' },
  { href: '/dashboard/sessions', icon: Activity, label: 'Sessions' },
  { href: '/dashboard/editor', icon: Server, label: 'Editor' },
  { href: '/dashboard/zones', icon: Map, label: 'Map Zones' },
  { href: '/dashboard/hidden-lineups', icon: EyeOff, label: 'Hidden Lineups' },
  { href: '/dashboard/redis', icon: Database, label: 'Redis' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  const getRoleBadge = () => {
    if (user?.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#a78bfa]">
          <Shield className="h-3 w-3" />
          ADMIN
        </span>
      );
    }
    if (user?.role === 'worker') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#60a5fa]">
          <Crown className="h-3 w-3" />
          WORKER
        </span>
      );
    }
    return null;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[#2a2a3e] bg-[#0d0d14]">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <Link href="/dashboard" className="block">
          <h1 className="text-xl font-extrabold tracking-wider">
            <span className="text-gradient-gold">NADE</span>
            <span className="text-[#e8e8e8]">PRO</span>
          </h1>
          <p className="mt-1 text-xs font-medium tracking-widest text-[#6b6b8a] uppercase">
            Admin Panel
          </p>
        </Link>
      </div>

      {/* Gold separator */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#f0a500]/40 to-transparent" />

      {/* Navigation */}
      <nav className="mt-6 flex-1 space-y-1 px-4">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-[#f0a500]/8 text-[#f0a500]'
                  : 'text-[#6b6b8a] hover:bg-[#1a1a2e] hover:text-[#e8e8e8]'
              }`}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#f0a500]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-[#2a2a3e] px-4 py-4">
        {user && (
          <div className="mb-3 flex items-center gap-3">
            {/* Avatar */}
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
                  {initials}
                </div>
              )}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#e8e8e8]">
                {user.username}
              </p>
              {getRoleBadge()}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#6b6b8a] transition-all duration-200 hover:bg-[#ff4444]/10 hover:text-[#ff4444]"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
