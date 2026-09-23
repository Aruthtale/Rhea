/**
 * FocusSessionRepository — CRUD sesi fokus penuh (docs 03 §Dual-Storage).
 * Menyimpan: taskName, startedAt, endedAt, durationMinutes, completed.
 *
 * Dipicu oleh EventBus events (docs 02 §Contoh Sinyal Event):
 *   - focus:started  → buka session (endedAt = null)
 *   - focus:completed → tutup session (durationMinutes, completed = true)
 *   - focus:cancelled → tutup session (durationMinutes, completed = false)
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/database/adapters';
import type { FocusSessionSummary } from '@/types/events';

const TABLE = 'focus_sessions';

export interface FocusSessionRow extends FocusSessionSummary {
  plannedMinutes: number;
  createdAt: string;
}

let currentSessionId: string | null = null;

function elapsedMinutes(startedAt: string, endedAt: string | null): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 60000 * 10) / 10);
}

export class FocusSessionRepository {
  static getAll(): FocusSessionRow[] {
    return getDb().select<FocusSessionRow>(TABLE);
  }

  static getToday(): FocusSessionRow[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.getAll().filter((s) => s.startedAt.startsWith(today));
  }

  static getActive(): FocusSessionRow | null {
    const sessions = this.getAll();
    return sessions.find((s) => s.endedAt === null) || null;
  }

  /**
   * Mulai sesi baru (jika sudah ada yang aktif, akhiri dulu).
   */
  static start(taskName: string, plannedMinutes: number): FocusSessionRow {
    const now = new Date().toISOString();
    const active = this.getActive();
    if (active) {
      this.complete(active.id, false);
    }
    const row: FocusSessionRow = {
      id: `fs-${uuidv4()}`,
      taskName,
      startedAt: now,
      endedAt: null,
      plannedMinutes,
      durationMinutes: 0,
      completed: false,
      createdAt: now,
    };
    getDb().insert<FocusSessionRow>(TABLE, row);
    currentSessionId = row.id;
    return row;
  }

  /**
   * Selesaikan sesi. Mengembalikan ringkasan sesi (atau null kalau tidak ketemu).
   */
  static complete(sessionId: string | null, completed = true): FocusSessionRow | null {
    if (!sessionId) return null;
    const rows = getDb().select<FocusSessionRow>(TABLE);
    const row = rows.find((r) => r.id === sessionId);
    if (!row || row.endedAt !== null) return null;

    const endedAt = new Date().toISOString();
    const duration = elapsedMinutes(row.startedAt, endedAt);
    const updated: Partial<FocusSessionRow> = {
      endedAt,
      durationMinutes: duration,
      completed,
    };
    getDb().update<FocusSessionRow>(TABLE, sessionId, updated);
    if (currentSessionId === sessionId) currentSessionId = null;

    return { ...row, ...updated };
  }
}

/** Helper hitung total fokus hari ini (dalam menit). */
export function totalFocusMinutesToday(): number {
  return FocusSessionRepository.getToday().reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
}
