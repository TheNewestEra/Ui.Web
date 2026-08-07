import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'forest';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly theme = signal<Theme>('light');

  constructor() {
    const saved = localStorage.getItem('theme') as Theme | null;

    console.log('New theme: ' + saved);

    this.setTheme(saved ?? 'light');
  }

  toggleTheme(): void {
    const nextTheme: Record<Theme, Theme> = {
      light: 'dark',
      dark: 'forest',
      forest: 'light',
    };

    this.setTheme(nextTheme[this.theme()]);
  }

  private setTheme(theme: Theme) {
    this.theme.set(theme);

    document.documentElement.setAttribute('data-theme', theme);

    localStorage.setItem('theme', theme);
  }
}
