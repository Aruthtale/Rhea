/**
 * MessageRepository — Persistensi riwayat percakapan Rhea & User.
 * Spec: docs 03 (Dual-Storage Architecture) — tabel `messages`.
 *
 * Menjaga riwayat obrolan tetap utuh saat:
 * 1. Halaman di-refresh / F5
 * 2. Navigasi antar-tab (Dashboard ⇄ Rhea Companion / Tab AI)
 * 3. Sesi berikutnya
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/database/adapters';

const TABLE = 'messages';
const DEFAULT_CONVERSATION_ID = 'default';

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'rhea';
  content: string;
  provider?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'rhea' | 'user';
  text: string;
  provider?: string;
  createdAt: string;
}

const SEED_MESSAGE: StoredMessage = {
  id: 'msg-seed-1',
  conversation_id: DEFAULT_CONVERSATION_ID,
  role: 'rhea',
  content: 'Hai Zen, hari ini udah siap apa nggak? Jangan lupa istirahat yaa kalau udah cape',
  provider: 'local',
  created_at: new Date().toISOString(),
};

function toChatMessage(row: StoredMessage): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    text: row.content,
    provider: row.provider,
    createdAt: row.created_at,
  };
}

export class MessageRepository {
  /**
   * Mengambil semua pesan percakapan yang diurutkan kronologis.
   */
  static getAll(conversationId = DEFAULT_CONVERSATION_ID): ChatMessage[] {
    const db = getDb();
    const rows = db.select<StoredMessage>(TABLE);
    const filtered = rows.filter(
      (r) => (r.conversation_id || DEFAULT_CONVERSATION_ID) === conversationId
    );

    if (filtered.length === 0) {
      db.insert<StoredMessage>(TABLE, SEED_MESSAGE);
      return [toChatMessage(SEED_MESSAGE)];
    }

    // Urutkan ascending berdasarkan created_at
    return filtered
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(toChatMessage);
  }

  /**
   * Menambahkan pesan baru ke database/localStorage.
   */
  static add(
    role: 'user' | 'rhea',
    content: string,
    provider?: string,
    conversationId = DEFAULT_CONVERSATION_ID
  ): ChatMessage {
    const text = content.trim();
    const newMsg: StoredMessage = {
      id: `msg-${uuidv4()}`,
      conversation_id: conversationId,
      role,
      content: text,
      provider: provider || (role === 'rhea' ? 'local' : undefined),
      created_at: new Date().toISOString(),
    };

    getDb().insert<StoredMessage>(TABLE, newMsg);
    return toChatMessage(newMsg);
  }

  /**
   * Mengambil N pesan terakhir dalam format ringkas untuk context injection LLM.
   */
  static getRecentHistory(limit = 10, conversationId = DEFAULT_CONVERSATION_ID): Array<{ role: string; content: string }> {
    const messages = this.getAll(conversationId);
    return messages.slice(-limit).map((m) => ({
      role: m.role === 'rhea' ? 'assistant' : 'user',
      content: m.text,
    }));
  }

  /**
   * Menghapus seluruh riwayat pesan untuk percakapan tertentu.
   */
  static clear(conversationId = DEFAULT_CONVERSATION_ID): void {
    const db = getDb();
    const rows = db.select<StoredMessage>(TABLE);
    const remaining = rows.filter(
      (r) => (r.conversation_id || DEFAULT_CONVERSATION_ID) !== conversationId
    );
    db.clear(TABLE);
    remaining.forEach((r) => db.insert<StoredMessage>(TABLE, r));
  }
}
