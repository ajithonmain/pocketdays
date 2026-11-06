import { Injectable, computed, signal } from '@angular/core';
interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; }
export type InstallState = 'installed' | 'ready' | 'ios' | 'manual';
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly prompt = signal<InstallPromptEvent | null>(null);
  private readonly standalone = signal(this.isStandalone());
  private readonly ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  readonly state = computed<InstallState>(() => this.standalone() ? 'installed' : this.prompt() ? 'ready' : this.ios ? 'ios' : 'manual');
  constructor() {
    addEventListener('beforeinstallprompt', event => { event.preventDefault(); this.prompt.set(event as InstallPromptEvent); });
    addEventListener('appinstalled', () => { this.prompt.set(null); this.standalone.set(true); });
    matchMedia('(display-mode: standalone)').addEventListener('change', () => this.standalone.set(this.isStandalone()));
  }
  private isStandalone(): boolean {
    return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }
  async install(): Promise<boolean> {
    const event = this.prompt();
    if (!event) return false;
    this.prompt.set(null);
    await event.prompt();
    return (await event.userChoice).outcome === 'accepted';
  }
}
