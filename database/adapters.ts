/**
 * Database adapter layer — abstraksi penyimpanan agar engine tidak peduli
 * di mana data disimpan.
 *
 * - Web (Next.js dev / PWA): LocalStorageAdapter — tiap tabel = satu key JSON.
 * - Native Android (Fase 2+): SQLiteAdapter via @capacitor-community/sqlite.
 *
 * Saat aplikasi dibungkus Capacitor, cukup tambahkan implementasi SQLiteAdapter
 * di file ini; engine konsumen tidak perlu berubah sama sekali.
 */

export interface StorageAdapter {
  /** Ambil seluruh baris tabel sebagai array objek. */
  select<T>(table: string): T[];
  /** Sisipkan atau ganti satu baris (upsert by id). */
  insert<T extends { id: string }>(table: string, row: T): void;
  /** Update sebagian field baris by id. */
  update<T>(table: string, id: string, patch: Partial<T>): void;
  /** Hapus baris by id. */
  remove(table: string, id: string): void;
  /** Hapus seluruh baris tabel. */
  clear(table: string): void;
}

/* ----------------------------- Web Adapter ----------------------------- */

const PREFIX = 'rhea_db_v1';

class LocalStorageAdapter implements StorageAdapter {
  private key(table: string): string {
    return `${PREFIX}:${table}`;
  }

  private read<T>(table: string): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(this.key(table));
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch (err) {
      console.error(`[db:web] gagal baca tabel ${table}:`, err);
      return [];
    }
  }

  private write<T>(table: string, rows: T[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(this.key(table), JSON.stringify(rows));
    } catch (err) {
      console.error(`[db:web] gagal tulis tabel ${table}:`, err);
    }
  }

  select<T>(table: string): T[] {
    return this.read<T>(table);
  }

  insert<T extends { id: string }>(table: string, row: T): void {
    const rows = this.read<T>(table).filter((r) => r.id !== row.id);
    rows.push(row);
    this.write(table, rows);
  }

  update<T extends { id: string }>(table: string, id: string, patch: Partial<T>): void {
    const rows = this.read<T>(table).map((r) => (r.id === id ? { ...r, ...patch } : r));
    this.write(table, rows);
  }

  remove(table: string, id: string): void {
    const rows = this.read<{ id: string }>(table).filter((r) => r.id !== id);
    this.write(table, rows);
  }

  clear(table: string): void {
    this.write(table, []);
  }
}

/* --------------------------- Native (stub) ----------------------------- */
// Implementasi nyata: @capacitor-community/sqlite → executeSet(SCHEMA_SQL),
// lalu select/insert via prepared statements. Aktifkan saat Capacitor setup.

/* --------------------------- Selection ----------------------------- */

function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNative;
}

let adapter: StorageAdapter | null = null;

export function getDb(): StorageAdapter {
  if (!adapter) {
    adapter = isNativeCapacitor()
      ? new LocalStorageAdapter() // TODO: ganti ke SQLiteAdapter saat Capacitor aktif
      : new LocalStorageAdapter();
  }
  return adapter;
}
