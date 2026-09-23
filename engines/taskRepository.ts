/**
 * TaskRepository — CRUD tugas harian (docs 03 §Dual-Storage).
 * Dipicu oleh EventBus events (docs 02 §Contoh Sinyal Event):
 *   - task:created / task:updated / task:toggled / task:deleted
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/database/adapters';
import type { TaskItem } from '@/types/tasks';

const TABLE = 'tasks';

const SEED_TASKS: TaskItem[] = [
  {
    id: 't-seed-1',
    title: 'Implementasi Arsitektur RHEA Personal OS',
    completed: false,
    priority: 'high',
    tag: 'Coding',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-seed-2',
    title: 'Review rutinitas mingguan & workout log',
    completed: true,
    priority: 'normal',
    tag: 'Routine',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't-seed-3',
    title: 'Setup Hermes Agent & 9Router connection',
    completed: false,
    priority: 'high',
    tag: 'Infrastructure',
    createdAt: new Date().toISOString(),
  },
];

export class TaskRepository {
  static getAll(): TaskItem[] {
    const db = getDb();
    const rows = db.select<TaskItem>(TABLE);
    if (rows.length === 0) {
      SEED_TASKS.forEach((t) => db.insert<TaskItem>(TABLE, t));
      return SEED_TASKS;
    }
    return rows;
  }

  static getPending(): TaskItem[] {
    return this.getAll().filter((t) => !t.completed);
  }

  static create(task: { title: string; priority?: TaskItem['priority']; tag?: string }): TaskItem {
    const newTask: TaskItem = {
      id: `t-${uuidv4()}`,
      title: task.title.trim(),
      completed: false,
      priority: task.priority || 'normal',
      tag: task.tag,
      createdAt: new Date().toISOString(),
    };
    getDb().insert<TaskItem>(TABLE, newTask);
    return newTask;
  }

  static toggle(taskId: string): TaskItem | null {
    const task = this.getAll().find((t) => t.id === taskId);
    if (!task) return null;
    getDb().update<TaskItem>(TABLE, taskId, {
      completed: !task.completed,
    });
    return { ...task, completed: !task.completed };
  }

  static delete(taskId: string): void {
    getDb().remove(TABLE, taskId);
  }
}
