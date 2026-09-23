'use client';

import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Sparkles,
  Radio,
  ShieldAlert,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'schedule', label: 'Jadwal', icon: Calendar },
    { id: 'tasks', label: 'Tugas', icon: CheckSquare },
    { id: 'focus', label: 'Fokus', icon: ShieldAlert },
    { id: 'ai', label: 'Rhea', icon: Sparkles },
    { id: 'device', label: 'State', icon: Radio },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#E7EAF0] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)] shadow-[0_-4px_20px_rgba(24,32,51,0.06)]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all press-fx min-w-[50px] ${
                isActive
                  ? 'text-[#8B7CF6]'
                  : 'text-[#98A2B3] hover:text-[#182033]'
              }`}
              aria-label={item.label}
            >
              <div
                className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#EEEAFE] shadow-sm scale-105'
                    : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8B7CF6]' : 'text-[#98A2B3]'}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 font-medium ${isActive ? 'font-bold text-[#8B7CF6]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
