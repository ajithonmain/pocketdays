import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { AppDialogService } from '../core/app-dialog.service';
@Component({
  selector: 'app-dialog',
  templateUrl: './app-dialog.component.html',
  styleUrl: './app-dialog.component.css',
})
export class AppDialogComponent {
  readonly dialogs = inject(AppDialogService);
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  constructor() {
    effect(() => {
      const active = this.dialogs.active();
      const dialog = this.panel().nativeElement;
      if (active) {
        if (!dialog.open) dialog.showModal();
        this.cancelButton()?.nativeElement.focus();
      } else if (dialog.open) dialog.close();
    });
  }
  backdrop(event: MouseEvent): void {
    if (event.target !== this.panel().nativeElement) return;
    const rect = this.panel().nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialogs.finish(false);
  }
}
