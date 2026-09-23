/**
 * RheaEventMap — kontrak tipe payload untuk setiap event EventBus.
 * Sumber: spec docs 02 (Arsitektur & Engine) + 03 (Personal DNA).
 * Tambah event di sini agar emit/on type-safe di seluruh codebase.
 */

import type { TaskItem } from '@/engines/storageEngine';

export interface FocusSessionSummary {
  id: string;
  taskName: string;
  startedAt: string; // ISO
  endedAt: string | null; // ISO, null kalau masih berjalan
  durationMinutes: number;
  completed: boolean;
}

export interface DeviceState {
  mode: 'normal' | 'work' | 'focus' | 'recovery' | 'sleep';
  previousMode: DeviceState['mode'] | null;
}

export interface ScheduleTransition {
  from: string | null;
  to: string;
  day: string;
}

export interface ChatExchange {
  userMessage: string;
  rheaReply: string;
  provider: string;
  timestamp: string;
}

export interface RheaEventMap {
  // Focus Engine
  'focus:started': { taskName: string; plannedMinutes: number; startedAt: string };
  'focus:paused': { taskName: string; remainingSeconds: number };
  'focus:resumed': { taskName: string; remainingSeconds: number };
  'focus:completed': FocusSessionSummary;
  'focus:cancelled': { taskName: string; elapsedMinutes: number; reason?: string };

  // Scheduler Engine
  'schedule:tick': { now: string };
  'schedule:transition': ScheduleTransition;
  'schedule:changed': { day: string };

  // Task Engine
  'task:created': { task: TaskItem };
  'task:updated': { task: TaskItem };
  'task:deleted': { taskId: string };
  'task:toggled': { task: TaskItem };

  // Device Mode Engine
  'device:modeChanged': DeviceState;

  // AI Engine
  'ai:thinking': { message: string };
  'ai:responded': ChatExchange;

  // Calendar Engine (Fase 3)
  'calendar:eventStarted': { eventId: string; title: string; start: string; end: string };
  'calendar:eventEnded': { eventId: string; title: string };

  // Location Engine (Fase 3)
  'location:entered': { geofence: string };
  'location:left': { geofence: string };

  // GitHub Engine (Fase 3)
  'github:commitCreated': { repo: string; sha: string; message: string };

  // Media Engine (opsional)
  'media:trackPlayed': { title: string; artist?: string };

  // Notification Engine
  'notification:sent': { title: string; body: string; priority: 'silent' | 'normal' | 'urgent' };
}

export type RheaEventName = keyof RheaEventMap;
export type RheaEventListener<K extends RheaEventName> = (payload: RheaEventMap[K]) => void;
