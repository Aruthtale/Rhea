export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'high' | 'normal' | 'low';
  tag?: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  TASKS: 'rhea_tasks_v1',
  FOCUS_STATS: 'rhea_focus_stats_v1',
  SETTINGS: 'rhea_settings_v1',
};

export class StorageEngine {
  static getTasks(): TaskItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) {
        // Inisialisasi default tasks sesuai persona Zen
        const defaults: TaskItem[] = [
          {
            id: 't-1',
            title: 'Implementasi Arsitektur RHEA Personal OS',
            completed: false,
            priority: 'high',
            tag: 'Coding',
            createdAt: new Date().toISOString(),
          },
          {
            id: 't-2',
            title: 'Review rutinitas mingguan & workout log',
            completed: true,
            priority: 'normal',
            tag: 'Routine',
            createdAt: new Date().toISOString(),
          },
          {
            id: 't-3',
            title: 'Setup Hermes Agent & 9Router connection',
            completed: false,
            priority: 'high',
            tag: 'Infrastructure',
            createdAt: new Date().toISOString(),
          },
        ];
        this.saveTasks(defaults);
        return defaults;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveTasks(tasks: TaskItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (err) {
      console.error('Failed to save tasks:', err);
    }
  }

  static getFocusMinutesToday(): number {
    if (typeof window === 'undefined') return 45;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = localStorage.getItem(STORAGE_KEYS.FOCUS_STATS);
      if (!data) return 45; // dummy default starter
      const parsed = JSON.parse(data);
      return parsed[today] || 0;
    } catch {
      return 45;
    }
  }

  static addFocusMinutes(minutes: number): void {
    if (typeof window === 'undefined') return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = localStorage.getItem(STORAGE_KEYS.FOCUS_STATS);
      const parsed = data ? JSON.parse(data) : {};
      parsed[today] = (parsed[today] || 0) + minutes;
      localStorage.setItem(STORAGE_KEYS.FOCUS_STATS, JSON.stringify(parsed));
    } catch (err) {
      console.error('Failed to update focus minutes:', err);
    }
  }
}
