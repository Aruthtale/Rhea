'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'rhea_api_base';

/**
 * Mengembalikan base URL untuk API chat.
 *
 * Urutan prioritas:
 * 1. localStorage 'rhea_api_base' (pengguna tetapkan, misalnya http://192.168.18.9:3000)
 * 2. Jika di platform native (Capacitor/Android) → http://192.168.18.9:3000 (laptop dev server)
 * 3. Jika di browser/web → '' (relative, same-origin → Next.js /api/chat)
 */
/** Cek apakah base URL tersimpan valid (bukan placeholder lama). */
function isValidStoredBase(url: string): boolean {
  if (!url) return false;
  // 'localhost' adalah placeholder lama dari versi sebelumnya → tidak bisa dipakai di native
  if (/localhost/i.test(url)) return false;
  return true;
}

export function getApiBase(): string {
  if (typeof window === 'undefined') return '';

  // 1. User override (hanya jika valid)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidStoredBase(stored)) {
    return stored.replace(/\/+$/, '');
  }

  // Bersihkan nilai stale jika ada
  if (stored && !isValidStoredBase(stored)) {
    console.warn('[apiBase] Clearing stale value:', stored);
    localStorage.removeItem(STORAGE_KEY);
  }

  // 2. Deteksi platform native (Capacitor/Android)
  const win = window as any;
  const hasCapacitor = typeof win.Capacitor !== 'undefined';
  const platform = hasCapacitor ? (win.Capacitor.getPlatform?.() || 'unknown') : 'web';
  const isNative = hasCapacitor && platform !== 'web';

  console.log('[apiBase] Platform detection:', { hasCapacitor, platform, isNative });

  if (isNative) {
    // Prioritas 1: URL deployment publik (Vercel) — gak perlu laptop nyala.
    // NEXT_PUBLIC_* aman di-expose karena cuma berisi URL, bukan secret.
    const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (publicUrl && /^https?:\/\//.test(publicUrl)) {
      return publicUrl.replace(/\/+$/, '');
    }

    // Prioritas 2: LAN dev server (laptop di WiFi yang sama)
    return 'http://192.168.18.9:3000';
  }

  // 3. Web — relative path
  return '';
}

/** Simpan preferensi base URL ke localStorage. */
export function setApiBase(url: string): void {
  const clean = url.replace(/\/+$/, '');
  localStorage.setItem(STORAGE_KEY, clean);
}

/** Hapus override, kembali ke default. */
export function clearApiBase(): void {
  localStorage.removeItem(STORAGE_KEY);
}
