'use client';

import React, { useState } from 'react';
import { Calendar, CheckSquare, Clock, MapPin, Zap, Sparkles, Sun, Moon, Coffee, Battery } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { RheaOrb } from '@/components/canvas/RheaOrb';

const today = new Date();
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  const dayName = dayNames[today.getDay()];
  const dateString = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  // Greeting based on time
  const getGreeting = () => {
    if (currentHour < 10) return 'Selamat pagi Zen';
    if (currentHour < 15) return 'Selamat siang Zen';
    if (currentHour < 18) return 'Selamat sore Zen';
    return 'Selamat malam Zen';
  };

  // Focus status indicator
  const isFocusTime = currentHour >= 19 && currentHour < 21;
  const focusStatus = isFocusTime ? 'focus' : (currentHour >= 8 && currentHour < 17 ? 'idle' : 'rest');

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header Bar */}
        <header className="sticky top-0 z-20 bg-[#F7F8FA] border-b border-[#E7EAF0] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#182033]">{getGreeting()}</h2>
            <p className="text-sm text-[#98A2B3] font-mono-num">{dayName}, {dateString}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 glass-pill px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-[#8B7CF6]" />
              <span className="font-mono-num text-sm font-semibold text-[#182033]">{timeString}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8B7CF6] to-[#5B8DEF] flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 transition-transform">
              <span className="text-white font-heading font-bold text-sm">Z</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6 grid grid-cols-12 gap-5">
          {/* Left Column - RheaOrb + Quick Stats */}
          <div className="col-span-4 flex flex-col gap-5">
            {/* Rhea Orb */}
            <div className="rhea-card p-6 flex flex-col items-center justify-center">
              <RheaOrb status={focusStatus} size={260} />
              <p className="font-heading text-lg font-semibold text-[#182033] mt-4">Rhea Companion</p>
              <p className="text-xs text-[#98A2B3] mt-1">
                {focusStatus === 'focus' ? 'Focus Mode aktif' : focusStatus === 'rest' ? 'Waktu recharge' : 'Zen siap berkolaborasi'}
              </p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rhea-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EEEAFE] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#8B7CF6]" />
                  </div>
                  <span className="text-[11px] text-[#98A2B3] uppercase tracking-wider font-semibold">Focus Hari Ini</span>
                </div>
                <p className="font-heading text-2xl font-bold text-[#182033] font-mono-num">45<span className="text-sm text-[#98A2B3]"> min</span></p>
              </div>
              <div className="rhea-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E9F8F1] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#48B985]" />
                  </div>
                  <span className="text-[11px] text-[#98A2B3] uppercase tracking-wider font-semibold">Energy</span>
                </div>
                <p className="font-heading text-2xl font-bold text-[#182033] font-mono-num">78<span className="text-sm text-[#98A2B3]">%</span></p>
              </div>
            </div>
          </div>

          {/* Center Column - Timeline & Tasks */}
          <div className="col-span-5 flex flex-col gap-5">
            {/* Today's Schedule */}
            <div className="rhea-card p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#8B7CF6]" />
                  <h3 className="font-heading text-lg font-bold text-[#182033]">Today's Timeline</h3>
                </div>
                <span className="text-xs font-mono-num text-[#48B985] bg-[#E9F8F1] px-2.5 py-1 rounded-full font-semibold">Sekarang</span>
              </div>

              <div className="space-y-3">
                {/* Morning */}
                <div className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#48B985] border-2 border-white shadow-sm"></div>
                    <div className="w-px h-full bg-[#E7EAF0] mt-1"></div>
                  </div>
                  <div className="flex-1 glass p-3 rounded-xl border border-[#E7EAF0] hover:border-[#8B7CF6]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-semibold text-[#8B7CF6]">05.00</span>
                      <span className="text-[10px] bg-[#E9F8F1] text-[#48B985] px-2 py-0.5 rounded-full font-medium">Selesai</span>
                    </div>
                    <p className="text-sm font-medium text-[#182033] mt-1">Bangun & Persiapan Subuh</p>
                    <p className="text-xs text-[#98A2B3] mt-0.5">Workout pagi • Gym</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#5B8DEF] border-2 border-white shadow-sm"></div>
                    <div className="w-px h-full bg-[#E7EAF0] mt-1"></div>
                  </div>
                  <div className="flex-1 glass p-3 rounded-xl border border-[#E7EAF0] hover:border-[#8B7CF6]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-semibold text-[#8B7CF6]">08.00</span>
                      <span className="text-[10px] bg-[#EAF1FF] text-[#5B8DEF] px-2 py-0.5 rounded-full font-medium">Sedang</span>
                    </div>
                    <p className="text-sm font-medium text-[#182033] mt-1">PKL • Kampus</p>
                    <p className="text-xs text-[#98A2B3] mt-0.5">Kuliah • Meeting kelas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#F5A14B] border-2 border-white shadow-sm"></div>
                    <div className="w-px h-full bg-[#E7EAF0] mt-1"></div>
                  </div>
                  <div className="flex-1 glass p-3 rounded-xl border border-[#E7EAF0] hover:border-[#8B7CF6]/30 transition-colors opacity-60">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-semibold text-[#8B7CF6]">19.00</span>
                      <span className="text-[10px] bg-[#FFF3E4] text-[#F5A14B] px-2 py-0.5 rounded-full font-medium">Bermula</span>
                    </div>
                    <p className="text-sm font-medium text-[#182033] mt-1">Focus Mode • Coding</p>
                    <p className="text-xs text-[#98A2B3] mt-0.5">RHEA Development • Deep Work</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Task List Mini */}
            <div className="rhea-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#8B7CF6]" />
                  <h3 className="font-heading text-sm font-bold text-[#182033]">Tugas Hari Ini</h3>
                </div>
                <span className="text-[11px] font-mono-num text-[#98A2B3]">2 dari 3</span>
              </div>
              <div className="space-y-2">
                {['Implementasi Arsitektur RHEA Personal OS', 'Review rutinitas mingguan'].map((task, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F2F4F7] transition-colors">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${i === 0 ? 'bg-[#8B7CF6] border-[#8B7CF6]' : 'border-[#E7EAF0] bg-[#F2F4F7]'}`}>
                      {i === 0 && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`text-sm ${i === 0 ? 'line-through text-[#98A2B3]' : 'text-[#182033]'}`}>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - AI & Context */}
          <div className="col-span-3 flex flex-col gap-5">
            {/* Rhea Companion Chat */}
            <div className="rhea-card p-5 flex flex-col h-[60%]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B7CF6] to-[#5B8DEF] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#182033]">Rhea</h3>
                  <p className="text-[10px] text-[#48B985]">Local • 9Router Connected</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-3 bg-[#F2F4F7] rounded-xl p-3">
                <div className="bg-[#EEEAFE] rounded-xl rounded-tl-none p-2.5 text-sm text-[#182033] shadow-sm">
                  Hai Zen, hari ini udah siap apa nggak? Jangan lupa istirahat yaa kalau udah lelah
                </div>
                <div className="bg-white rounded-xl rounded-tl-none p-2.5 text-sm text-[#182033] border border-[#E7EAF0] shadow-sm text-right">
                  Semangat yaa Rhea, codingan mau dimulai nih
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  className="flex-1 bg-[#F2F4F7] border border-[#E7EAF0] rounded-xl px-4 py-2.5 text-sm text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#8B7CF6] focus:ring-1 focus:ring-[#8B7CF6]/30 transition-colors"
                />
                <button className="bg-[#8B7CF6] hover:bg-[#7C6AE6] text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors press-fx">
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Context Widgets */}
            <div className="rhea-card p-5 flex-1">
              <h3 className="font-heading text-sm font-bold text-[#182033] mb-3 flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#F5A14B]" />
                Konteks Hari Ini
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Battery className="w-4 h-4 text-[#48B985]" />
                  <span className="text-[#667085]">Battery: 78% — Laptop ready</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Coffee className="w-4 h-4 text-[#F5A14B]" />
                  <span className="text-[#667085]">Kafe ☕ — Siap fokus</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-4 h-4 text-[#5B8DEF]" />
                  <span className="text-[#667085]">Rumah — WiFi stabil</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Moon className="w-4 h-4 text-[#8B7CF6]" />
                  <span className="text-[#667085]">Jam tidur target: 22.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}