/**
 * Test runtime untuk EventBus + FocusSessionRepository + TaskRepository.
 * Simulasi alur: mulai fokus → selesai → cek log; tambah/toggle task.
 */

// Stub browser globals untuk LocalStorageAdapter
const store = new Map<string, string>();
(globalThis as any).window = { localStorage: {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
} };

import { eventBus } from '@/engines/eventBus';
import { FocusSessionRepository, totalFocusMinutesToday } from '@/engines/focusSessionRepository';
import { TaskRepository } from '@/engines/taskRepository';

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
}

// 1. EventBus: listener menerima payload type-safe
console.log('\n[1] EventBus emit/on');
let received = '';
eventBus.on('focus:started', (p) => { received = p.taskName; });
eventBus.emit('focus:started', { taskName: 'Test task', plannedMinutes: 25, startedAt: new Date().toISOString() });
check('listener menerima payload focus:started', received === 'Test task');
check('history buffer terisi', eventBus.getHistory().length >= 1);
check('listenerCount akurat', eventBus.listenerCount('focus:started') === 1);

// 2. FocusSessionRepository.start
console.log('\n[2] FocusSessionRepository.start');
const session = FocusSessionRepository.start('RHEA Development', 25);
check('session dibuat', !!session.id);
check('endedAt masih null (sedang berjalan)', session.endedAt === null);
check('getActive() menemukan session', FocusSessionRepository.getActive()?.id === session.id);

// 3. FocusSessionRepository.complete
console.log('\n[3] FocusSessionRepository.complete');
const finished = FocusSessionRepository.complete(session.id, true);
check('session selesai', finished?.endedAt !== null);
check('completed = true', finished?.completed === true);
check('durationMinutes >= 0', (finished?.durationMinutes ?? -1) >= 0);
check('getActive() sekarang null', FocusSessionRepository.getActive() === null);

// 4. Log sesi tersimpan
console.log('\n[4] Log sesi fokus');
const today = FocusSessionRepository.getToday();
check('getToday() mengandung sesi', today.length === 1);
check('sesi punya taskName', today[0].taskName === 'RHEA Development');

// 5. TaskRepository
console.log('\n[5] TaskRepository');
const created = TaskRepository.create({ title: 'Belajar Next.js' });
check('task dibuat', created.title === 'Belajar Next.js');
check('getAll() mengandung seed + baru', TaskRepository.getAll().length >= 1);
const toggled = TaskRepository.toggle(created.id);
check('toggle membalik completed', toggled?.completed === true);
TaskRepository.delete(created.id);
check('delete menghapus', !TaskRepository.getAll().some((t) => t.id === created.id));

// 6. Event task:toggled via EventBus listener
console.log('\n[6] Integrasi EventBus × TaskRepository');
let toggledHeard = false;
eventBus.on('task:toggled', () => { toggledHeard = true; });
const t2 = TaskRepository.create({ title: 'Cek event' });
TaskRepository.toggle(t2.id);
eventBus.emit('task:toggled', { task: TaskRepository.getAll().find((t) => t.id === t2.id)! });
check('task:toggled terdengar', toggledHeard);

console.log(`\nHasil: ${pass} lulus, ${fail} gagal\n`);
if (fail > 0) process.exit(1);
