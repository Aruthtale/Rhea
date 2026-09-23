/**
 * Notification Engine untuk RHEA
 * Handle semua notifikasi jadwal, reminder, dan alert
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import type { ScheduleItem } from './scheduleEngine';

export class NotificationEngine {
  private static isInitialized = false;
  private static hasPermission = false;

  /**
   * Initialize notification system dan request permission
   */
  static async init(): Promise<boolean> {
    if (this.isInitialized) return this.hasPermission;

    try {
      // Check current permission
      let permStatus = await LocalNotifications.checkPermissions();

      // Android sering kali merespons 'prompt' sebelum activity siap, dan
      // 'denied' kalau user belum pernah ditanya. Kita tetap minta sekali lagi
      // selama belum 'granted' supaya dialog benar-benar muncul.
      while (permStatus.display !== 'granted') {
        console.log('[NotificationEngine] Current status:', permStatus.display, '→ requesting...');
        const request = await LocalNotifications.requestPermissions();
        permStatus = request;

        // Kalau user benar-benar nolak, jangan loop selamanya
        if (permStatus.display === 'denied') {
          console.warn('[NotificationEngine] Permission denied by user');
          break;
        }
      }

      this.hasPermission = permStatus.display === 'granted';
      this.isInitialized = true;
      console.log('[NotificationEngine] Initialized, permission:', this.hasPermission);
      return this.hasPermission;
    } catch (error) {
      console.error('[NotificationEngine] Init failed:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Schedule notifikasi untuk item jadwal
   * Kirim notif 5 menit sebelum jadwal dimulai
   */
  static async scheduleForItem(item: ScheduleItem, dayDate: Date): Promise<void> {
    if (!this.hasPermission) {
      console.warn('[NotificationEngine] No permission, skipping schedule');
      return;
    }

    try {
      // Parse waktu start (format "HH:MM")
      const [hour, minute] = item.start.split(':').map(Number);
      
      // Buat Date object untuk notifikasi (5 menit sebelum)
      const notifTime = new Date(dayDate);
      notifTime.setHours(hour, minute - 5, 0, 0);

      // Skip kalau waktu udah lewat
      const now = new Date();
      if (notifTime <= now) {
        console.log('[NotificationEngine] Schedule time passed, skip:', item.title);
        return;
      }

      // Generate unique ID dari item
      const notifId = this.generateId(item.id);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `⏰ ${item.title}`,
            body: `Dalam 5 menit di ${item.location}`,
            schedule: { at: notifTime },
            sound: 'default',
            smallIcon: 'ic_stat_rhea',
            iconColor: '#8B7CF6',
          }
        ]
      });

      console.log('[NotificationEngine] Scheduled:', item.title, 'at', notifTime.toISOString());
    } catch (error) {
      console.error('[NotificationEngine] Schedule failed:', error);
    }
  }

  /**
   * Kirim notifikasi instant (untuk jadwal yang sedang berlangsung)
   */
  static async sendNow(title: string, body: string): Promise<void> {
    if (!this.hasPermission) {
      console.warn('[NotificationEngine] No permission, skipping instant notif');
      return;
    }

    try {
      const notifId = this.generateId(`instant_${Date.now()}`);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) }, // 100ms dari sekarang
            sound: 'default',
            smallIcon: 'ic_stat_rhea',
            iconColor: '#8B7CF6',
          }
        ]
      });

      console.log('[NotificationEngine] Sent instant:', title);
    } catch (error) {
      console.error('[NotificationEngine] Send instant failed:', error);
    }
  }

  /**
   * Cancel semua scheduled notifications
   */
  static async cancelAll(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
        console.log('[NotificationEngine] Cancelled', pending.notifications.length, 'notifications');
      }
    } catch (error) {
      console.error('[NotificationEngine] Cancel all failed:', error);
    }
  }

  /**
   * Generate numeric ID dari string (LocalNotifications butuh number)
   */
  private static generateId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Schedule notifikasi harian untuk semua jadwal hari ini
   */
  static async scheduleDailyReminders(scheduleItems: ScheduleItem[]): Promise<void> {
    if (!this.hasPermission) {
      await this.init();
      if (!this.hasPermission) return;
    }

    // Cancel semua notifikasi sebelumnya
    await this.cancelAll();

    const today = new Date();
    let scheduled = 0;

    for (const item of scheduleItems) {
      await this.scheduleForItem(item, today);
      scheduled++;
    }

    console.log('[NotificationEngine] Scheduled', scheduled, 'reminders for today');
  }

  /**
   * Deteksi pergantian jadwal dan kirim notif real-time
   * Call ini setiap menit dari main app
   */
  static async checkScheduleTransition(
    currentItem: ScheduleItem | null,
    previousItem: ScheduleItem | null
  ): Promise<void> {
    if (!this.hasPermission) return;

    // Transisi dari satu jadwal ke jadwal berikutnya
    if (currentItem && currentItem.id !== previousItem?.id) {
      await this.sendNow(
        `🎯 Sekarang: ${currentItem.title}`,
        `${currentItem.start} - ${currentItem.end} • ${currentItem.location}`
      );
    }
  }
}
