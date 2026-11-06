import { Injectable, signal } from '@angular/core';
export interface AppDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}
interface DialogRequest extends AppDialogOptions { id: number; resolve: (accepted: boolean) => void; }
@Injectable({ providedIn: 'root' })
export class AppDialogService {
  readonly active = signal<DialogRequest | null>(null);
  private readonly queue: DialogRequest[] = [];
  private nextId = 0;
  confirm(options: AppDialogOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.queue.push({ ...options, id: ++this.nextId, resolve });
      if (!this.active()) this.active.set(this.queue.shift()!);
    });
  }
  finish(accepted: boolean): void {
    const request = this.active();
    if (!request) return;
    this.active.set(this.queue.shift() ?? null);
    request.resolve(accepted);
  }
}
