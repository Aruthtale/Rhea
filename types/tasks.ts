/**
 * Kontrak tipe data terpadu (docs 02 §types/).
 * TaskItem dipakai cross-module: storageEngine, taskRepository, eventBus.
 */

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'high' | 'normal' | 'low';
  tag?: string;
  createdAt: string;
}
