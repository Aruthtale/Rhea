/**
 * DeviceEngine — State machine mode perangkat (Fase 2).
 * Spec: docs 02 (Arsitektur & Engine) & docs 04 (Automation & Focus).
 *
 * State Machine:
 *   NORMAL ⇄ WORK ⇄ FOCUS ⇄ RECOVERY ⇄ SLEEP
 *
 * Mode Otomatis diturunkan dari:
 *   1. Sesi fokus aktif (FocusSessionRepository / event focus:started) → FOCUS
 *   2. Jadwal harian (ScheduleEngine slot type) → WORK / SLEEP / RECOVERY / NORMAL
 *   3. Jam tidur (22:00 - 05:00) → SLEEP
 *
 * Mode Manual (User Override):
 *   User bisa memaksa ganti mode lewat UI kapan saja. Override bisa dibersihkan
 *   kembali ke otomatis.
 *
 * Event:
 *   Memancarkan 'device:modeChanged' setiap kali mode berganti via EventBus.
 */

import { eventBus } from '@/engines/eventBus';
import { ScheduleEngine } from '@/engines/scheduleEngine';
import { FocusSessionRepository } from '@/engines/focusSessionRepository';
import { getDb } from '@/database/adapters';
import type { DeviceState } from '@/types/events';

export type DeviceMode = DeviceState['mode'];

export interface DeviceModeMeta {
  mode: DeviceMode;
  label: string;
  tagline: string;
  description: string;
  color: string;
  badgeColor: string;
  accent: string;
  dndEnabled: boolean;
}

export const DEVICE_MODES: Record<DeviceMode, DeviceModeMeta> = {
  normal: {
    mode: 'normal',
    label: 'Normal',
    tagline: 'Santai & Standby',
    description: 'Aktivitas santai, notifikasi aktif normal.',
    color: 'text-[#8B7CF6] bg-[#EEEAFE]',
    badgeColor: 'bg-[#EEEAFE] text-[#8B7CF6]',
    accent: '#8B7CF6',
    dndEnabled: false,
  },
  work: {
    mode: 'work',
    label: 'Work',
    tagline: 'Kerja / PKL',
    description: 'Jam produktif aktif. Notifikasi prioritas tetap masuk.',
    color: 'text-[#5B8DEF] bg-[#EAF1FF]',
    badgeColor: 'bg-[#EAF1FF] text-[#5B8DEF]',
    accent: '#5B8DEF',
    dndEnabled: false,
  },
  focus: {
    mode: 'focus',
    label: 'Deep Focus',
    tagline: 'Fokus Penuh',
    description: 'Timer berjalan. Semua notifikasi sosial dibisukan (DND virtual).',
    color: 'text-[#8B7CF6] bg-[#EEEAFE]',
    badgeColor: 'bg-[#8B7CF6] text-white',
    accent: '#8B7CF6',
    dndEnabled: true,
  },
  recovery: {
    mode: 'recovery',
    label: 'Recovery',
    tagline: 'Istirahat & Workout',
    description: 'Waktu recharge energi, makan, atau olahraga ringan.',
    color: 'text-[#48B985] bg-[#E9F8F1]',
    badgeColor: 'bg-[#E9F8F1] text-[#48B985]',
    accent: '#48B985',
    dndEnabled: false,
  },
  sleep: {
    mode: 'sleep',
    label: 'Sleep',
    tagline: 'Waktu Istirahat',
    description: 'Layar redup, persiapan tidur. Hindari screen time berlebih.',
    color: 'text-[#F5A14B] bg-[#FFF3E4]',
    badgeColor: 'bg-[#FFF3E4] text-[#F5A14B]',
    accent: '#F5A14B',
    dndEnabled: true,
  },
};

const TABLE = 'device_state';
const STATE_ROW_ID = 'singleton_device_state';

interface StoredRow {
  id: string;
  mode: DeviceMode;
  previous_mode: DeviceMode | null;
  manual_override: number; // 0 | 1
  updated_at: string;
}

let initialized = false;

export class DeviceEngine {
  /**
   * Turunkan mode yang seharusnya aktif berdasarkan konteks waktu & jadwal.
   */
  static autoDeriveMode(now: Date = new Date()): DeviceMode {
    // 1. Cek sesi fokus aktif lebih dulu (prioritas tertinggi)
    try {
      const activeSession = FocusSessionRepository.getActive();
      if (activeSession) return 'focus';
    } catch {
      // safe fallback saat testing tanpa DB penuh
    }

    const currentHour = now.getHours();

    // 2. Jam tidur malam (22:00 - 05:00)
    if (currentHour >= 22 || currentHour < 5) {
      return 'sleep';
    }

    // 3. Cek slot jadwal hari ini
    try {
      const slot = ScheduleEngine.getCurrentAndNextSlot().current;
      if (slot) {
        const type = (slot.type || '').toLowerCase();
        if (type === 'sleep') return 'sleep';
        if (type === 'work' || type === 'study') return 'work';
        if (['exercise', 'recovery', 'meal', 'break', 'rest'].includes(type)) {
          return 'recovery';
        }
      }
    } catch {
      // safe fallback
    }

    // 4. Jam kerja default (08:00 - 17:00)
    if (currentHour >= 8 && currentHour < 17) {
      return 'work';
    }

    return 'normal';
  }

  /**
   * Baca state tersimpan dari database.
   */
  static getState(): DeviceState & { isManual: boolean; updatedAt: string } {
    try {
      const rows = getDb().select<StoredRow>(TABLE);
      const row = rows.find((r) => r.id === STATE_ROW_ID);
      if (row) {
        return {
          mode: row.mode,
          previousMode: row.previous_mode,
          isManual: row.manual_override === 1,
          updatedAt: row.updated_at,
        };
      }
    } catch {
      // fallback
    }

    const initialMode = this.autoDeriveMode();
    return {
      mode: initialMode,
      previousMode: null,
      isManual: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Ganti mode secara manual atau otomatis. Memancarkan event 'device:modeChanged'.
   */
  static setMode(mode: DeviceMode, manual = false): DeviceState {
    const current = this.getState();
    if (current.mode === mode && current.isManual === manual) {
      return { mode: current.mode, previousMode: current.previousMode };
    }

    const previousMode = current.mode;
    const now = new Date().toISOString();

    const row: StoredRow = {
      id: STATE_ROW_ID,
      mode,
      previous_mode: previousMode,
      manual_override: manual ? 1 : 0,
      updated_at: now,
    };

    try {
      getDb().insert<StoredRow>(TABLE, row);
    } catch (err) {
      console.error('[DeviceEngine] gagal simpan state:', err);
    }

    const payload: DeviceState = {
      mode,
      previousMode,
    };

    eventBus.emit('device:modeChanged', payload);
    return payload;
  }

  /**
   * Sinkronisasi otomatis dengan jadwal (skip jika sedang dalam manual override,
   * kecuali jika force = true).
   */
  static sync(force = false): DeviceState {
    const current = this.getState();
    if (current.isManual && !force) {
      return { mode: current.mode, previousMode: current.previousMode };
    }

    const derived = this.autoDeriveMode();
    return this.setMode(derived, false);
  }

  /**
   * Hapus manual override dan kembalikan mode ke sinkronisasi otomatis.
   */
  static clearManualOverride(): DeviceState {
    return this.sync(true);
  }

  /**
   * Inisialisasi listener EventBus (idempotent, aman dipanggil berulang kali).
   */
  static init(): void {
    if (initialized) return;
    initialized = true;

    // Saat timer fokus dimulai → otomatis pindah ke mode 'focus'
    eventBus.on('focus:started', () => {
      this.setMode('focus', false);
    });

    // Saat timer fokus selesai/dibatalkan → kembalikan ke mode sebelumnya atau auto
    const restoreAfterFocus = () => {
      const state = this.getState();
      if (state.mode === 'focus') {
        const target = state.previousMode && state.previousMode !== 'focus'
          ? state.previousMode
          : this.autoDeriveMode();
        this.setMode(target, state.isManual);
      }
    };

    eventBus.on('focus:completed', restoreAfterFocus);
    eventBus.on('focus:cancelled', restoreAfterFocus);

    // Initial sync
    this.sync(false);
  }

  /** Reset internal flag untuk unit testing */
  static _resetInitForTesting(): void {
    initialized = false;
  }
}
