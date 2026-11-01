"use client";

import { useSyncExternalStore } from "react";

export type TaskState = "locked" | "available" | "done";

export interface TaskItem {
  id: string;
  title: string;
  location: string;
  state: TaskState;
  progress: number;
  total: number;
  unlockedBy?: string; // id of task that unlocks this when completed
}

export interface TaskStoreState {
  tasks: TaskItem[];
  activeTaskId: string | null;
  panelOpen: boolean;
}

const STORAGE_KEY = "neuro_scrap_tasks_v1";

let currentState: TaskStoreState = {
  tasks: [],
  activeTaskId: null,
  panelOpen: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  saveToStorage();
  listeners.forEach((listener) => listener());
}

function saveToStorage() {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      tasks: currentState.tasks,
      activeTaskId: currentState.activeTaskId,
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Ignore storage quota or disabled storage in sandbox
  }
}

function loadFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tasks)) {
      currentState = {
        tasks: parsed.tasks,
        activeTaskId: parsed.activeTaskId || null,
        panelOpen: false, // Always start with panel closed on reload
      };
      return true;
    }
  } catch {
    // Fall back to empty state
  }
  return false;
}

// Attempt initial load on browser environment
if (typeof window !== "undefined") {
  loadFromStorage();
}

export const taskStore = {
  getSnapshot(): TaskStoreState {
    return currentState;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  registerTask(task: TaskItem): void {
    const existingIndex = currentState.tasks.findIndex((t) => t.id === task.id);
    if (existingIndex >= 0) {
      // Keep existing progress and state if already loaded from storage
      const existing = currentState.tasks[existingIndex];
      const updated = [...currentState.tasks];
      updated[existingIndex] = {
        ...task,
        state: existing.state,
        progress: existing.progress,
      };
      currentState = { ...currentState, tasks: updated };
    } else {
      currentState = {
        ...currentState,
        tasks: [...currentState.tasks, { ...task }],
      };
    }
    emitChange();
  },

  completeStep(taskId: string): void {
    let completedTaskId: string | null = null;
    const updatedTasks = currentState.tasks.map((task) => {
      if (task.id !== taskId || task.state === "locked" || task.state === "done") {
        return task;
      }
      const newProgress = Math.min(task.total, task.progress + 1);
      const isDone = newProgress >= task.total;
      if (isDone) completedTaskId = task.id;
      return {
        ...task,
        progress: newProgress,
        state: isDone ? ("done" as TaskState) : ("available" as TaskState),
      };
    });

    // Check if any dependent tasks need to unlock
    const finalTasks = updatedTasks.map((task) => {
      if (task.state === "locked" && task.unlockedBy && task.unlockedBy === completedTaskId) {
        return { ...task, state: "available" as TaskState };
      }
      return task;
    });

    currentState = { ...currentState, tasks: finalTasks };
    emitChange();
  },

  completeTask(taskId: string): void {
    const updatedTasks = currentState.tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          progress: task.total,
          state: "done" as TaskState,
        };
      }
      return task;
    });

    // Unlock dependent tasks
    const finalTasks = updatedTasks.map((task) => {
      if (task.state === "locked" && task.unlockedBy === taskId) {
        return { ...task, state: "available" as TaskState };
      }
      return task;
    });

    currentState = { ...currentState, tasks: finalTasks };
    emitChange();
  },

  unlockTask(taskId: string): void {
    const updatedTasks = currentState.tasks.map((task) => {
      if (task.id === taskId && task.state === "locked") {
        return { ...task, state: "available" as TaskState };
      }
      return task;
    });
    currentState = { ...currentState, tasks: updatedTasks };
    emitChange();
  },

  lockTask(taskId: string): void {
    const updatedTasks = currentState.tasks.map((task) => {
      if (task.id === taskId) {
        return { ...task, state: "locked" as TaskState };
      }
      return task;
    });
    currentState = { ...currentState, tasks: updatedTasks };
    emitChange();
  },

  openTask(taskId: string): boolean {
    const target = currentState.tasks.find((t) => t.id === taskId);
    if (!target || target.state === "locked") {
      return false;
    }
    currentState = {
      ...currentState,
      activeTaskId: taskId,
      panelOpen: true,
    };
    emitChange();
    return true;
  },

  closeTask(): void {
    if (!currentState.panelOpen && currentState.activeTaskId === null) return;
    currentState = {
      ...currentState,
      activeTaskId: null,
      panelOpen: false,
    };
    emitChange();
  },

  reset(): void {
    currentState = {
      tasks: [],
      activeTaskId: null,
      panelOpen: false,
    };
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    emitChange();
  },
};

const SERVER_SNAPSHOT: TaskStoreState = Object.freeze({
  tasks: [],
  activeTaskId: null,
  panelOpen: false,
});

const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useTaskStore(): TaskStoreState {
  return useSyncExternalStore(
    taskStore.subscribe,
    taskStore.getSnapshot,
    getServerSnapshot
  );
}
