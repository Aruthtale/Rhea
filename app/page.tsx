'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CheckSquare, Clock, MapPin, Zap, Sparkles, Sun, Moon, Coffee, Battery, Play, Pause, RotateCcw, Plus, Send, Trash2, Cpu, Wifi } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { RheaOrb } from '@/components/canvas/RheaOrb';
import { ScheduleEngine, ScheduleItem } from '@/engines/scheduleEngine';
import { TaskRepository } from '@/engines/taskRepository';
import { FocusSessionRepository, FocusSessionRow, totalFocusMinutesToday } from '@/engines/focusSessionRepository';
import type { TaskItem } from '@/types/tasks';
import { eventBus } from '@/engines/eventBus';
import { useRheaChat } from '@/hooks/useRheaChat';

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function statusColor(status: string) {
  if (status === 'Selesai') return 'bg-[#E9F8F1] text-[#48B985]';
  if (status === 'Sedang') return 'bg-[#EAF1FF] text-[#5B8DEF]';
  return 'bg-[#FFF3E4] text-[#F5A14B]';
}

function slotStatus(item: ScheduleItem, nowMin: number): string {
  const [sh, sm] = item.start.split(':').map(Number);
  const [eh, em] = item.end.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (nowMin >= s && nowMin < e) return 'Sedang';
  if (nowMin >= e) return 'Selesai';
  return 'Bermula';
}

function dotColor(status: string) {
  if (status === 'Selesai') return 'bg-[#48B985]';
  if (status === 'Sedang') return 'bg-[#5B8DEF]';
  return 'bg-[#F5A14B]';
}

/* ---------- Chat panel (dipakai di dashboard & tab AI) ---------- */
function ChatPanel({ tall = false }: { tall?: boolean }) {
  const { messages, input, setInput, isLoading, provider, send } = useRheaChat();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  return (
    <div className={`rhea-card p-5 flex flex-col ${tall ? 'h-[70vh]' : 'h-[60%]'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B7CF6] to-[#5B8DEF] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-heading text-sm font-bold text-[#182033]">Rhea</h3>
          <p className="text-[10px] text-[#48B985]">
            {provider === 'local' ? 'Local • 9Router Connected' : provider === 'gemini-fallback' ? 'Cloud • Gemini Fallback' : 'Offline • Heuristic'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 bg-[#F2F4F7] rounded-xl p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'rhea'
              ? 'bg-[#EEEAFE] rounded-xl rounded-tl-none p-2.5 text-sm text-[#182033] shadow-sm'
              : 'bg-white rounded-xl rounded-tr-none p-2.5 text-sm text-[#182033] border border-[#E7EAF0] shadow-sm text-right ml-8'}
          >
            {m.text}
          </div>
        ))}
        {isLoading && (
          <div className="bg-[#EEEAFE] rounded-xl rounded-tl-none p-2.5 text-sm text-[#667085] shadow-sm flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            Rhea lagi mikir bentar yaa...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 bg-[#F2F4F7] border border-[#E7EAF0] rounded-xl px-4 py-2.5 text-sm text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#8B7CF6] focus:ring-1 focus:ring-[#8B7CF6]/30 transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-[#8B7CF6] hover:bg-[#7C6AE6] disabled:opacity-40 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors press-fx"
          aria-label="Kirim pesan"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardView({ now }: { now: Date }) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = useMemo(() => ScheduleEngine.getDaySchedule(), []);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [focusMin, setFocusMin] = useState(45);

  useEffect(() => {
    setTasks(TaskRepository.getAll());
    setFocusMin(totalFocusMinutesToday());
  }, []);

  const done = tasks.filter((t) => t.completed).length;
  const currentHour = now.getHours();
  const isFocusTime = currentHour >= 19 && currentHour < 21;
  const focusStatus = isFocusTime ? 'focus' : (currentHour >= 8 && currentHour < 17 ? 'idle' : 'rest');

  const toggleTask = (id: string) => {
    const updated = TaskRepository.toggle(id);
    if (!updated) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    eventBus.emit('task:toggled', { task: updated });
  };

  return (
    <div className="flex-1 p-6 grid grid-cols-12 gap-5">
      <div className="col-span-4 flex flex-col gap-5">
        <div className="rhea-card p-6 flex flex-col items-center justify-center">
          <RheaOrb status={focusStatus} size={260} />
          <p className="font-heading text-lg font-semibold text-[#182033] mt-4">Rhea Companion</p>
          <p className="text-xs text-[#98A2B3] mt-1">
            {focusStatus === 'focus' ? 'Focus Mode aktif' : focusStatus === 'rest' ? 'Waktu recharge' : 'Zen siap berkolaborasi'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rhea-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#EEEAFE] flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#8B7CF6]" />
              </div>
              <span className="text-[11px] text-[#98A2B3] uppercase tracking-wider font-semibold">Focus Hari Ini</span>
            </div>
            <p className="font-heading text-2xl font-bold text-[#182033] font-mono-num">{focusMin}<span className="text-sm text-[#98A2B3]"> min</span></p>
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

      <div className="col-span-5 flex flex-col gap-5">
        <div className="rhea-card p-5 flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#8B7CF6]" />
              <h3 className="font-heading text-lg font-bold text-[#182033]">Today&apos;s Timeline</h3>
            </div>
            <span className="text-xs font-mono-num text-[#48B985] bg-[#E9F8F1] px-2.5 py-1 rounded-full font-semibold">Sekarang</span>
          </div>

          <div className="space-y-3">
            {todaySchedule.slice(0, 6).map((item) => {
              const st = slotStatus(item, nowMin);
              return (
                <div key={item.id} className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${dotColor(st)} border-2 border-white shadow-sm`} />
                    <div className="w-px h-full bg-[#E7EAF0] mt-1" />
                  </div>
                  <div className={`flex-1 glass p-3 rounded-xl border border-[#E7EAF0] hover:border-[#8B7CF6]/30 transition-colors ${st === 'Bermula' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-semibold text-[#8B7CF6]">{item.start.replace(':', '.')}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(st)}`}>{st}</span>
                    </div>
                    <p className="text-sm font-medium text-[#182033] mt-1">{item.title}</p>
                    <p className="text-xs text-[#98A2B3] mt-0.5">{item.location}{item.description ? ` • ${item.description.slice(0, 48)}` : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rhea-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#8B7CF6]" />
              <h3 className="font-heading text-sm font-bold text-[#182033]">Tugas Hari Ini</h3>
            </div>
            <span className="text-[11px] font-mono-num text-[#98A2B3]">{done} dari {tasks.length}</span>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 4).map((task) => (
              <button key={task.id} onClick={() => toggleTask(task.id)} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F2F4F7] transition-colors text-left">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${task.completed ? 'bg-[#8B7CF6] border-[#8B7CF6]' : 'border-[#E7EAF0] bg-[#F2F4F7]'}`}>
                  {task.completed && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={`text-sm ${task.completed ? 'line-through text-[#98A2B3]' : 'text-[#182033]'}`}>{task.title}</span>
              </button>
            ))}
            {tasks.length === 0 && <p className="text-xs text-[#98A2B3]">Belum ada tugas. Tambah lewat tab Tasks yaa.</p>}
          </div>
        </div>
      </div>

      <div className="col-span-3 flex flex-col gap-5">
        <ChatPanel />
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
  );
}

/* ---------- Schedule ---------- */
function ScheduleView({ now }: { now: Date }) {
  const [dayKey, setDayKey] = useState(() => dayKeys[now.getDay()]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = dayKey === dayKeys[now.getDay()];
  const items = useMemo(() => ScheduleEngine.getDaySchedule(dayKey), [dayKey]);

  return (
    <div className="flex-1 p-6 flex flex-col gap-5">
      <div className="rhea-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[#8B7CF6]" />
          <h3 className="font-heading text-lg font-bold text-[#182033]">Jadwal Mingguan</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {dayKeys.map((k, i) => (
            <button
              key={k}
              onClick={() => setDayKey(k)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${dayKey === k ? 'bg-[#8B7CF6] text-white shadow-sm' : 'bg-[#F2F4F7] text-[#667085] hover:bg-[#EEEAFE] hover:text-[#8B7CF6]'}`}
            >
              {dayNames[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="rhea-card p-5">
        <p className="text-xs text-[#98A2B3] mb-4 font-mono-num">{items.length} agenda • {dayNames[dayKeys.indexOf(dayKey)]}</p>
        <div className="space-y-3">
          {items.map((item) => {
            const st = isToday ? slotStatus(item, nowMin) : 'Bermula';
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${dotColor(st)} border-2 border-white shadow-sm`} />
                  <div className="w-px h-full bg-[#E7EAF0] mt-1" />
                </div>
                <div className="flex-1 glass p-4 rounded-xl border border-[#E7EAF0] hover:border-[#8B7CF6]/30 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono-num text-xs font-semibold text-[#8B7CF6]">{item.start} – {item.end}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(st)}`}>{st}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#182033] mt-1">{item.title}</p>
                  <p className="text-xs text-[#98A2B3] mt-0.5">{item.location}{item.description ? ` • ${item.description}` : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tasks ---------- */
function TasksView() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setTasks(TaskRepository.getAll());
  }, []);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    const created = TaskRepository.create({ title });
    setTasks((prev) => [...prev, created]);
    eventBus.emit('task:created', { task: created });
    setDraft('');
  };

  const toggle = (id: string) => {
    const updated = TaskRepository.toggle(id);
    if (!updated) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    eventBus.emit('task:toggled', { task: updated });
  };

  const remove = (id: string) => {
    TaskRepository.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    eventBus.emit('task:deleted', { taskId: id });
  };

  const done = tasks.filter((t) => t.completed).length;

  return (
    <div className="flex-1 p-6 flex flex-col gap-5">
      <div className="rhea-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#8B7CF6]" />
            <h3 className="font-heading text-lg font-bold text-[#182033]">Semua Tugas</h3>
          </div>
          <span className="text-xs font-mono-num text-[#98A2B3]">{done} dari {tasks.length} selesai</span>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tambah tugas baru..."
            className="flex-1 bg-[#F2F4F7] border border-[#E7EAF0] rounded-xl px-4 py-2.5 text-sm text-[#182033] placeholder-[#98A2B3] focus:outline-none focus:border-[#8B7CF6] focus:ring-1 focus:ring-[#8B7CF6]/30"
          />
          <button type="submit" className="bg-[#8B7CF6] hover:bg-[#7C6AE6] text-white px-4 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </form>
      </div>

      <div className="rhea-card p-5">
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F2F4F7] transition-colors group">
              <button
                onClick={() => toggle(t.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${t.completed ? 'bg-[#8B7CF6] border-[#8B7CF6]' : 'border-[#E7EAF0] bg-white'}`}
                aria-label="Toggle tugas"
              >
                {t.completed && <span className="text-white text-xs">✓</span>}
              </button>
              <span className={`text-sm flex-1 ${t.completed ? 'line-through text-[#98A2B3]' : 'text-[#182033]'}`}>{t.title}</span>
              {t.tag && <span className="text-[10px] bg-[#EEEAFE] text-[#8B7CF6] px-2 py-0.5 rounded-full font-medium">{t.tag}</span>}
              <button
                onClick={() => remove(t.id)}
                className="opacity-0 group-hover:opacity-100 text-[#98A2B3] hover:text-red-500 p-1 transition-all"
                aria-label="Hapus tugas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-[#98A2B3] text-center py-6">Belum ada tugas. Tambah yang pertama di atas yaa.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Focus ---------- */
function FocusView() {
  const PRESETS = [25, 50, 90];
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskName, setTaskName] = useState('RHEA Development');
  const [sessions, setSessions] = useState<FocusSessionRow[]>([]);
  const sessionRef = useRef<string | null>(null);

  // Tampilkan log sesi fokus hari ini (todo Fase 1: log sesi penuh)
  useEffect(() => {
    setSessions(FocusSessionRepository.getToday());
  }, []);

  const handleStart = () => {
    // Pencet "Mulai" → buka session & emit focus:started
    const session = FocusSessionRepository.start(taskName, minutes);
    sessionRef.current = session.id;
    eventBus.emit('focus:started', {
      taskName,
      plannedMinutes: minutes,
      startedAt: session.startedAt,
    });
    setRunning(true);
  };

  const handleComplete = () => {
    // Timer habis → selesaikan session & emit focus:completed
    setRunning(false);
    FocusSessionRepository.complete(sessionRef.current, true);
    sessionRef.current = null;
    setSessions(FocusSessionRepository.getToday());
  };

  const handleCancel = () => {
    // "Reset" saat masih jalan → emit focus:cancelled
    if (sessionRef.current && running) {
      eventBus.emit('focus:cancelled', {
        taskName,
        elapsedMinutes: Math.max(1, Math.round((minutes * 60 - secondsLeft) / 60)),
      });
      FocusSessionRepository.complete(sessionRef.current, false);
      sessionRef.current = null;
    }
    setSessions(FocusSessionRepository.getToday());
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, minutes]);

  const pick = (m: number) => {
    handleCancel();
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = 1 - secondsLeft / (minutes * 60);

  return (
    <div className="flex-1 p-6 grid grid-cols-12 gap-5">
      <div className="col-span-7 rhea-card p-8 flex flex-col items-center justify-center gap-6">
        <RheaOrb status={running ? 'focus' : 'idle'} size={220} />
        <p className="font-mono-num text-6xl font-bold text-[#182033] tracking-tight">{mm}:{ss}</p>
        <p className="text-sm text-[#667085]">{taskName}</p>
        <div className="w-full max-w-sm h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#8B7CF6] to-[#5B8DEF] rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => pick(p)} className={`px-4 py-2 rounded-xl text-sm font-medium ${minutes === p ? 'bg-[#8B7CF6] text-white' : 'bg-[#F2F4F7] text-[#667085] hover:bg-[#EEEAFE]'}`}>
              {p}m
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={handleStart}
              disabled={secondsLeft === 0}
              className="bg-[#8B7CF6] hover:bg-[#7C6AE6] disabled:opacity-40 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              <Play className="w-4 h-4" /> Mulai
            </button>
          ) : (
            <button
              onClick={() => { handleCancel(); setRunning(false); setSecondsLeft(minutes * 60); }}
              className="bg-[#E9F8F1] hover:bg-[#D4F2E7] text-[#48B985] px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              <Pause className="w-4 h-4" /> Stop
            </button>
          )}
          <button onClick={() => { handleCancel(); setRunning(false); setSecondsLeft(minutes * 60); }} className="bg-[#F2F4F7] hover:bg-[#E7EAF0] text-[#667085] px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>
      <div className="col-span-5 flex flex-col gap-5">
        <div className="rhea-card p-5">
          <h3 className="font-heading text-sm font-bold text-[#182033] mb-3">Task Fokus</h3>
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            disabled={running}
            className="w-full bg-[#F2F4F7] border border-[#E7EAF0] rounded-xl px-4 py-2.5 text-sm text-[#182033] focus:outline-none focus:border-[#8B7CF6] disabled:opacity-50"
          />
          <div className="mt-4 space-y-2 text-xs text-[#667085]">
            <p>• Notifikasi sosial dibisukan saat timer jalan</p>
            <p>• Sesi tercatat lengkap: mulai, selesai, durasi, task</p>
            <p>• Istirahat 5 menit tiap 25 menit yaa Zen</p>
          </div>
        </div>

        {/* Log sesi fokus hari ini */}
        <div className="rhea-card p-5">
          <h3 className="font-heading text-sm font-bold text-[#182033] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8B7CF6]" />
            Sesi Hari Ini
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-xs text-[#98A2B3]">Belum ada sesi hari ini. Mulai timer yaa Zen!</p>
            ) : (
              [...sessions].reverse().map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 text-xs p-2 rounded-lg bg-[#F7F8FA]">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.completed ? 'bg-[#48B985]' : 'bg-[#F5A14B]'}`} />
                  <span className="font-mono-num font-semibold text-[#667085] shrink-0">
                    {new Date(s.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[#182033] flex-1 truncate">{s.taskName}</span>
                  <span className={`font-mono-num font-semibold shrink-0 ${s.completed ? 'text-[#48B985]' : 'text-[#F5A14B]'}`}>
                    {s.durationMinutes || Math.max(1, Math.round((minutes * 60 - secondsLeft) / 60))}m
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- AI full ---------- */
function AIView() {
  return (
    <div className="flex-1 p-6 grid grid-cols-12 gap-5">
      <div className="col-span-8"><ChatPanel tall /></div>
      <div className="col-span-4 rhea-card p-5">
        <h3 className="font-heading text-sm font-bold text-[#182033] mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#8B7CF6]" /> Cara Rhea mikir
        </h3>
        <div className="space-y-2.5 text-xs text-[#667085] leading-relaxed">
          <p>1. Baca jadwal aktif + tugas fokus kamu</p>
          <p>2. Ambil persona Renatha (Tier 1) — bukan seluruh chat history</p>
          <p>3. Coba jawab lewat Hermes lokal (9Router) dulu</p>
          <p>4. Kalau laptop offline &gt; 2 detik, otomatis pindah ke Gemini Cloud</p>
          <p>5. Kalau dua-duanya mati, jawab heuristic offline yang hangat</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Device ---------- */
function DeviceView() {
  const cards = [
    { icon: Battery, label: 'Battery', value: '78% — Laptop ready', color: 'text-[#48B985] bg-[#E9F8F1]' },
    { icon: Wifi, label: 'Network', value: 'WiFi stabil — Rumah', color: 'text-[#5B8DEF] bg-[#EAF1FF]' },
    { icon: Moon, label: 'Mode', value: 'Normal — siap fokus 19.00', color: 'text-[#8B7CF6] bg-[#EEEAFE]' },
    { icon: Sun, label: 'Wind-down', value: 'Target tidur 22.00', color: 'text-[#F5A14B] bg-[#FFF3E4]' },
  ];
  return (
    <div className="flex-1 p-6 grid grid-cols-12 gap-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="col-span-3 rhea-card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#98A2B3]">{c.label}</p>
            <p className="text-sm font-semibold text-[#182033] mt-1">{c.value}</p>
          </div>
        );
      })}
      <div className="col-span-12 rhea-card p-5">
        <h3 className="font-heading text-sm font-bold text-[#182033] mb-2">State Machine</h3>
        <p className="text-xs text-[#667085] font-mono-num">NORMAL → WORK → FOCUS → RECOVERY → SLEEP → NORMAL</p>
      </div>
    </div>
  );
}

/* ---------- Root ---------- */
export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const now = useNow();

  const currentHour = now.getHours();
  const timeString = `${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateString = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const getGreeting = () => {
    if (currentHour < 10) return 'Selamat pagi Zen';
    if (currentHour < 15) return 'Selamat siang Zen';
    if (currentHour < 18) return 'Selamat sore Zen';
    return 'Selamat malam Zen';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 bg-[#F7F8FA] border-b border-[#E7EAF0] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#182033]">{getGreeting()}</h2>
            <p className="text-sm text-[#98A2B3] font-mono-num">{dayNames[now.getDay()]}, {dateString}</p>
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

        {activeTab === 'dashboard' && <DashboardView now={now} />}
        {activeTab === 'schedule' && <ScheduleView now={now} />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'focus' && <FocusView />}
        {activeTab === 'ai' && <AIView />}
        {activeTab === 'device' && <DeviceView />}
      </main>
    </div>
  );
}
