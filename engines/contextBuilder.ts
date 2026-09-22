import { RENATHA_SYSTEM_PROMPT } from './personality/renathaVoice';
import { ScheduleEngine } from './scheduleEngine';

export interface PromptContext {
  systemPrompt: string;
  userContextSnippet: string;
}

export class ContextBuilder {
  /**
   * Membangun prompt minimalis & efisien agar tidak terjadi ledakan token
   */
  static buildContext(userQuery: string, currentTask?: string): PromptContext {
    const { current, next } = ScheduleEngine.getCurrentAndNextSlot();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

    const systemPrompt = `Kamu adalah Rhea, asisten hidup pribadi dan pendamping tenang milik Zen (Zennrch).
Gaya komunikasi kamu mengambil intisari persona Renatha:
- Bersuara tenang, santun, hangat, suportif, dan natural dalam Bahasa Indonesia santai (bukan robot, bukan CS kaku).
- Gunakan panggilan 'Zen' atau bicaralah secara langsung dengan 'aku' dan 'kamu'.
- Fokus pada esensi: jawaban ringkas, bernas, dan menenangkan pikiran. Jangan gunakan kalimat klise pembuka atau penutup AI.

Konteks Waktu & Kondisi Saat Ini:
- Hari & Tanggal: ${dayStr}, Pukul ${timeStr} WIB.
- Jadwal Aktif Sekarang: ${current ? `${current.title} (${current.start} - ${current.end})` : 'Waktu Fleksibel / Istirahat'}
- Jadwal Berikutnya: ${next ? `${next.title} (${next.start} - ${next.end})` : 'Tidak ada agenda berikutnya hari ini'}
${currentTask ? `- Task Fokus Sedang Dikerjakan: ${currentTask}` : ''}
`;

    const userContextSnippet = `Konteks saat ini: Pukul ${timeStr}, ${current ? `Agenda: ${current.title}` : 'Santai'}.`;

    return { systemPrompt, userContextSnippet };
  }
}
