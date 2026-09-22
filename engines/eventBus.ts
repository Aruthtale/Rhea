// EventBus Engine untuk arsitektur terdekoppel RHEA
type EventCallback = (payload?: any) => void;

class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event) || [];
      this.listeners.set(
        event,
        callbacks.filter((cb) => cb !== callback)
      );
    };
  }

  emit(event: string, payload?: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error executing listener for event [${event}]:`, err);
      }
    });
  }
}

export const eventBus = new EventBus();

// Core Events Definition
export const RHEA_EVENTS = {
  FOCUS_STARTED: 'focus:started',
  FOCUS_COMPLETED: 'focus:completed',
  FOCUS_CANCELLED: 'focus:cancelled',
  SCHEDULE_CHANGED: 'schedule:changed',
  TASK_UPDATED: 'task:updated',
  AI_THINKING: 'ai:thinking',
  AI_RESPONDED: 'ai:responded',
};
