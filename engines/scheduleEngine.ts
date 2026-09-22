import mondayData from '../Daily_Routine/Monday.json';
import tuesdayData from '../Daily_Routine/Tuesday.json';
import wednesdayData from '../Daily_Routine/Wednesday.json';
import thursdayData from '../Daily_Routine/Thursday.json';
import fridayData from '../Daily_Routine/Friday.json';
import saturdayData from '../Daily_Routine/Saturday.json';
import sundayData from '../Daily_Routine/Sunday.json';

export interface ScheduleItem {
  id: string;
  start: string;
  end: string;
  title: string;
  type: 'workout' | 'work' | 'focus' | 'rest' | 'personal' | 'routine';
  location: string;
  description: string;
  details?: Record<string, any>;
}

const WEEKLY_DATA: Record<string, ScheduleItem[]> = {
  monday: mondayData.weekly.monday as ScheduleItem[],
  tuesday: tuesdayData.weekly.tuesday as ScheduleItem[],
  wednesday: wednesdayData.weekly.wednesday as ScheduleItem[],
  thursday: thursdayData.weekly.thursday as ScheduleItem[],
  friday: fridayData.weekly.friday as ScheduleItem[],
  saturday: saturdayData.weekly.saturday as ScheduleItem[],
  sunday: sundayData.weekly.sunday as ScheduleItem[],
};

export class ScheduleEngine {
  static getDaySchedule(dayName?: string): ScheduleItem[] {
    const day = dayName
      ? dayName.toLowerCase()
      : new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return WEEKLY_DATA[day] || WEEKLY_DATA.monday;
  }

  static getCurrentAndNextSlot(): { current: ScheduleItem | null; next: ScheduleItem | null } {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const daySchedule = this.getDaySchedule();

    let current: ScheduleItem | null = null;
    let next: ScheduleItem | null = null;

    for (let i = 0; i < daySchedule.length; i++) {
      const item = daySchedule[i];
      const [sh, sm] = item.start.split(':').map(Number);
      const [eh, em] = item.end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        current = item;
        next = daySchedule[i + 1] || null;
        break;
      } else if (currentMinutes < startMin && !next) {
        next = item;
        break;
      }
    }

    return { current, next };
  }
}
