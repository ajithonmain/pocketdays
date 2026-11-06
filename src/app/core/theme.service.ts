import { Injectable, effect, signal } from '@angular/core';
export type ThemeChoice = 'light' | 'dark' | 'system';
@Injectable({providedIn:'root'})
export class ThemeService {
  readonly choice = signal<ThemeChoice>('light');
  private readonly system = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.system.matches);
  constructor() {
    try {const stored=localStorage.getItem('pocketdays-theme');if(stored==='light'||stored==='dark'||stored==='system')this.choice.set(stored);} catch {}
    this.system.addEventListener('change', event => this.systemDark.set(event.matches));
    effect(() => {
      const dark = this.choice()==='dark' || (this.choice()==='system' && this.systemDark());
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d0f10' : '#ebebeb');
    });
  }
  set(choice: ThemeChoice) {
    this.choice.set(choice);
    try {localStorage.setItem('pocketdays-theme',choice);} catch {}
  }
}
