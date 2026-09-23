/**
 * Test Suite: MessageRepository & Chat Persistence
 * Memverifikasi penyimpanan riwayat chat ke SQLite/LocalStorage adapter:
 *   1. Initial seed message saat database kosong
 *   2. Penambahan pesan user (add 'user')
 *   3. Penambahan balasan Rhea (add 'rhea') dengan metadata provider
 *   4. Pengambilan urutan pesan kronologis (getAll)
 *   5. Formatting context untuk LLM (getRecentHistory)
 *   6. Pembersihan riwayat obrolan (clear)
 *   7. Isolasi percakapan antar conversationId
 */

const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  },
};

import { MessageRepository } from '../engines/messageRepository';

let pass = 0;
let fail = 0;

function check(label: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}`);
  }
}

console.log('=== TEST CHAT PERSISTENCE (MESSAGES) ===\n');

// 1. Initial seed message
console.log('[1] Initial seed message');
const initialMsgs = MessageRepository.getAll('default');
check('Memiliki pesan awal (seed)', initialMsgs.length >= 1);
check('Pesan awal berasal dari Rhea', initialMsgs[0].role === 'rhea');
check('Pesan awal memiliki ID unik', !!initialMsgs[0].id);

// 2. Tambah pesan user
console.log('\n[2] Tambah pesan user');
const userMsg = MessageRepository.add('user', 'Halo Rhea, apa kabar?', undefined, 'default');
check('Pesan user berhasil dibuat', userMsg.role === 'user' && userMsg.text === 'Halo Rhea, apa kabar?');
const msgsAfterUser = MessageRepository.getAll('default');
check('Total pesan bertambah menjadi 2', msgsAfterUser.length === 2);
check('Pesan kedua adalah pesan user', msgsAfterUser[1].text === 'Halo Rhea, apa kabar?');

// 3. Tambah balasan Rhea
console.log('\n[3] Tambah balasan Rhea');
const rheaReply = MessageRepository.add('rhea', 'Halo Zen! Aku siap temenin kamu hari ini!', 'local', 'default');
check('Balasan Rhea tersimpan', rheaReply.role === 'rhea' && rheaReply.provider === 'local');
const msgsAfterRhea = MessageRepository.getAll('default');
check('Total pesan sekarang 3', msgsAfterRhea.length === 3);

// 4. Riwayat ringkas untuk LLM context
console.log('\n[4] getRecentHistory');
const history = MessageRepository.getRecentHistory(2, 'default');
check('Mengambil 2 pesan terakhir', history.length === 2);
check('Pesan pertama di history adalah user', history[0].role === 'user' && history[0].content === 'Halo Rhea, apa kabar?');
check('Pesan kedua di history adalah assistant', history[1].role === 'assistant' && history[1].content.includes('Halo Zen'));

// 5. Isolasi conversationId
console.log('\n[5] Isolasi conversationId');
MessageRepository.add('user', 'Pesan di room lain', undefined, 'custom-room');
const customMsgs = MessageRepository.getAll('custom-room');
check('Room custom hanya berisi pesan room tersebut', customMsgs.some((m) => m.text === 'Pesan di room lain'));
const defaultMsgs = MessageRepository.getAll('default');
check('Room default tidak terpengaruh room custom', !defaultMsgs.some((m) => m.text === 'Pesan di room lain'));

// 6. Pembersihan riwayat
console.log('\n[6] Clear riwayat default');
MessageRepository.clear('default');
const clearedDefault = MessageRepository.getAll('default');
check('Setelah di-clear dan dimuat ulang, kembali ke seed message', clearedDefault.length === 1 && clearedDefault[0].id === 'msg-seed-1');

console.log(`\n========================================`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
console.log(`========================================\n`);

if (fail > 0) {
  process.exit(1);
}
