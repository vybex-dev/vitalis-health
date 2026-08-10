import { create } from "zustand";
import { nanoid } from "nanoid";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3500) => {
    const id = nanoid(8);
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers — import and call anywhere
export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().addToast("success", msg, duration),
  error: (msg: string, duration?: number) => useToastStore.getState().addToast("error", msg, duration),
  info: (msg: string, duration?: number) => useToastStore.getState().addToast("info", msg, duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().addToast("warning", msg, duration),
};
