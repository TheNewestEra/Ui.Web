import { Injectable, signal } from '@angular/core';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';

export type Theme = 'light' | 'dark' | 'forest';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly theme = signal<Theme>('light');

  constructor() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME) as Theme | null;

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

    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
  }
}
