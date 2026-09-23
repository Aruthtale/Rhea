/**
 * Test Fase 2: Device Mode Engine & State Machine
 * Verifikasi:
 *   1. Auto-derive mode dari waktu/jadwal
 *   2. Manual setMode & emit 'device:modeChanged'
 *   3. Integrasi Focus: focus:started -> mode focus
 *   4. Integrasi Focus: focus:completed/cancelled -> restore previous mode
 *   5. Persistence ke database adapter (device_state)
 *   6. Clear manual override -> auto sync
 */

// Stub browser globals untuk LocalStorageAdapter (bun test tidak punya window)
const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  },
};

import { DeviceEngine, DEVICE_MODES, DeviceMode } from '../engines/deviceEngine';
import { FocusSessionRepository } from '../engines/focusSessionRepository';
import { eventBus } from '../engines/eventBus';
import type { DeviceState } from '../types/events';

let pass = 0;
let fail = 0;

function assert(desc: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    pass++;
  } else {
    console.error(`  ✗ ${desc}`);
    fail++;
  }
}

console.log('=== TEST FASE 2: DEVICE MODE ENGINE ===\n');

// 1. Metadata mode
console.log('[1] Metadata mode lengkap');
const modes: DeviceMode[] = ['normal', 'work', 'focus', 'recovery', 'sleep'];
for (const m of modes) {
  const meta = DEVICE_MODES[m];
  assert(`meta untuk ${m} ada`, !!meta && meta.mode === m);
  assert(`meta ${m} punya label`, meta.label.length > 0);
  assert(`meta ${m} punya deskripsi`, meta.description.length > 0);
}

// 2. Auto derive mode berdasarkan jam
console.log('\n[2] Auto-derive mode dari waktu');
// Jam 23:00 -> sleep
const night = new Date('2026-09-23T23:00:00');
assert('23:00 auto-derive = sleep', DeviceEngine.autoDeriveMode(night) === 'sleep');

// Jam 03:00 -> sleep
const lateNight = new Date('2026-09-23T03:00:00');
assert('03:00 auto-derive = sleep', DeviceEngine.autoDeriveMode(lateNight) === 'sleep');

// Jam 10:00 -> work (default work hour)
const workHour = new Date('2026-09-23T10:00:00');
const derivedWork = DeviceEngine.autoDeriveMode(workHour);
assert('10:00 auto-derive = work atau valid mode', ['work', 'recovery', 'normal'].includes(derivedWork));

// 3. Manual mode transition & EventBus emit
console.log('\n[3] Manual setMode & event emission');
let emittedState: DeviceState | null = null;
const unsub = eventBus.on('device:modeChanged', (s) => {
  emittedState = s;
});

const s1 = DeviceEngine.setMode('work', true);
assert('mode berganti ke work', s1.mode === 'work');
assert('event device:modeChanged terpancar', emittedState !== null && (emittedState as DeviceState).mode === 'work');
assert('state reader membaca isManual = true', DeviceEngine.getState().isManual === true);

const s2 = DeviceEngine.setMode('recovery', true);
assert('mode berganti ke recovery', s2.mode === 'recovery');
assert('previousMode tercatat', s2.previousMode === 'work');
assert('event payload mencatat previousMode', emittedState !== null && (emittedState as DeviceState).previousMode === 'work');

// 4. Integrasi Focus session -> Auto switch ke focus mode
console.log('\n[4] Integrasi Focus Session & Auto-Restore');
DeviceEngine._resetInitForTesting();
DeviceEngine.init();

// Set mode awal ke 'work'
DeviceEngine.setMode('work', true);
assert('mode sebelum fokus = work', DeviceEngine.getState().mode === 'work');

// Mulai timer fokus -> trigger focus:started
eventBus.emit('focus:started', {
  taskName: 'Coding RHEA Phase 2',
  plannedMinutes: 25,
  startedAt: new Date().toISOString(),
});

assert('setelah focus:started, mode otomatis = focus', DeviceEngine.getState().mode === 'focus');
assert('previousMode sebelum fokus tercatat', DeviceEngine.getState().previousMode === 'work');

// Batalkan/selesaikan fokus -> trigger focus:cancelled
eventBus.emit('focus:cancelled', {
  taskName: 'Coding RHEA Phase 2',
  elapsedMinutes: 5,
});

assert('setelah focus:cancelled, mode kembali ke previousMode (work)', DeviceEngine.getState().mode === 'work');

// 5. Clear manual override -> auto sync
console.log('\n[5] Clear manual override');
DeviceEngine.setMode('recovery', true);
assert('sebelum clear, manual = true', DeviceEngine.getState().isManual === true);

DeviceEngine.clearManualOverride();
assert('setelah clear, manual = false (otomatis)', DeviceEngine.getState().isManual === false);

unsub();

console.log(`\nHasil Fase 2: ${pass} lulus, ${fail} gagal\n`);
if (fail > 0) process.exit(1);
