'use client';

import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Sparkles,
  Radio,
  Settings,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'focus', label: 'Focus Mode', icon: ShieldAlert },
    { id: 'ai', label: 'Rhea Companion', icon: Sparkles },
    { id: 'device', label: 'Device State', icon: Radio },
  ];

  return (
    <aside className="hidden md:flex w-64 border-r border-[#E7EAF0] bg-white flex-col justify-between p-5 min-h-screen shrink-0">
      <div>
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B7CF6] to-[#5B8DEF] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg font-heading tracking-wide">R</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-[#182033] leading-none">RHEA</h1>
            <p className="text-[11px] text-[#98A2B3] tracking-wide mt-1">Personal Life OS</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#EEEAFE] text-[#8B7CF6] font-semibold'
                    : 'text-[#667085] hover:bg-[#F2F4F7] hover:text-[#182033]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8B7CF6]' : 'text-[#667085]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Mini Profile & Settings */}
      <div className="pt-4 border-t border-[#E7EAF0] flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#EEEAFE] text-[#8B7CF6] font-semibold text-xs flex items-center justify-center border border-[#8B7CF6]/20">
            Z
          </div>
          <div>
            <p className="text-xs font-semibold text-[#182033]">Zennrch</p>
            <p className="text-[10px] text-[#48B985] flex items-center gap-1 font-mono-num">
              <span className="w-1.5 h-1.5 rounded-full bg-[#48B985] inline-block animate-pulse"></span>
              9Router Local
            </p>
          </div>
        </div>
        <button className="text-[#98A2B3] hover:text-[#182033] p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
