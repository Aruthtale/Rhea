/**
 * EventBus Engine — pub/sub terpusat & type-safe untuk arsitektur terdekoppel RHEA.
 * Spec: docs 02 (Arsitektur & Engine) — engine tidak pernah panggil langsung,
 * semua komunikasi lewat sinyal event.
 *
 * - Type-safe: payload tiap event dicek di compile time via RheaEventMap.
 * - Fire-and-forget: listener sync dijalankan berurutan, listener async (save DB
 *   dll) boleh return Promise tapi tidak di-await (tidak memblokir emitter).
 * - Error isolated: satu listener meledak tidak mematikan listener lain.
 * - History ringkas untuk debugging + context injection AI.
 */

import type { RheaEventName, RheaEventMap, RheaEventListener } from '@/types/events';

const HISTORY_LIMIT = 50;

interface HistoryEntry {
  event: RheaEventName;
  payload: unknown;
  at: string;
}

class EventBus {
  private listeners: Map<RheaEventName, Set<RheaEventListener<any>>> = new Map();
  private history: HistoryEntry[] = [];
  private muted = false;

  /** Berlangganan event. Return fungsi unsubscribe. */
  on<K extends RheaEventName>(event: K, callback: RheaEventListener<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback as RheaEventListener<any>);
    return () => this.listeners.get(event)?.delete(callback as RheaEventListener<any>);
  }

  /** Berlangganan sekali — auto-unsubscribe setelah emit pertama. */
  once<K extends RheaEventName>(event: K, callback: RheaEventListener<K>): () => void {
    const off = this.on(event, (payload) => {
      off();
      callback(payload);
    });
    return off;
  }

  /** Memancarkan event ke semua listener. */
  emit<K extends RheaEventName>(event: K, payload: RheaEventMap[K]): void {
    this.history.push({ event, payload, at: new Date().toISOString() });
    if (this.history.length > HISTORY_LIMIT) this.history.shift();

    if (this.muted) return;
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] listener [${event}] error:`, err);
      }
    }
  }

  /** Matikan semua listener sementara (testing / mode senyap). */
  mute(): void { this.muted = true; }
  unmute(): void { this.muted = false; }

  /** Bersihkan semua listener (testing). */
  offAll(): void { this.listeners.clear(); }

  /** Ambil N event terakhir untuk debugging / context AI. */
  getHistory(limit = 20): HistoryEntry[] {
    return this.history.slice(-limit);
  }

  /** Jumlah listener aktif per event (diagnostik). */
  listenerCount(event: RheaEventName): number {
    return this.listeners.get(event)?.size || 0;
  }
}

export const eventBus = new EventBus();
