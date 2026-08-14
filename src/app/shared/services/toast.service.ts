import { Injectable, signal } from '@angular/core';

export type ToastActionVariant =
  'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'error' | 'success';

export interface ToastAction {
  label: string;
  variant?: ToastActionVariant;
  run: () => void;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  actions?: ToastAction[];
  durationMs: number;
}

const DEFAULT_DURATION_MS = 8000;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  show(toast: Omit<Toast, 'durationMs'> & { durationMs?: number }): void {
    const durationMs = toast.durationMs ?? DEFAULT_DURATION_MS;

    this._toasts.update((list) => [
      ...list.filter((t) => t.id !== toast.id),
      { ...toast, durationMs },
    ]);

    this.clearTimer(toast.id);
    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), durationMs),
    );
  }

  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
    this.clearTimer(id);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) return;

    clearTimeout(timer);
    this.timers.delete(id);
  }
}
