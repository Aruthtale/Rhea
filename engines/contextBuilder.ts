import { RENATHA_SYSTEM_PROMPT } from './personality/renathaVoice';
import { ScheduleEngine } from './scheduleEngine';

export interface PromptContext {
  systemPrompt: string;
  userContextSnippet: string;
}

export class ContextBuilder {
  /**
   * Membangun prompt minimalis & efisien agar tidak terjadi ledakan token.
   * Persona diambil satu kali dari renathaVoice (single source of truth),
   * ditambah konteks waktu/agenda yang dinamis.
   */
  static buildContext(userQuery: string, currentTask?: string): PromptContext {
    const { current, next } = ScheduleEngine.getCurrentAndNextSlot();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

    const timeContext = `Konteks Waktu & Kondisi Saat Ini:
    - Hari & Tgl: ${dayStr}, Pukul ${timeStr} WIB.
    - Agenda Aktif: ${current ? `${current.title} (${current.start} - ${current.end})` : 'Waktu Fleksibel / Istirahat'}
    - Agenda Berikutnya: ${next ? `${next.title} (${next.start} - ${next.end})` : 'Tidak ada agenda berikutnya hari ini'}
    ${currentTask ? `- Task Fokus Sedang Dikerjakan: ${currentTask}` : ''}`;

    const systemPrompt = `${RENATHA_SYSTEM_PROMPT}\n\n${timeContext}`;
    const userContextSnippet = `Konteks saat ini: Pukul ${timeStr}, ${current ? `Agenda: ${current.title}` : 'Santai'}.`;

    return { systemPrompt, userContextSnippet };
  }
}
