import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';

export type AppTheme = 'light' | 'dark' | 'forest';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly mediaQuery = isPlatformBrowser(this.platformId)
    ? this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)')
    : undefined;

  readonly theme = signal<AppTheme>('dark');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
    this.applyTheme(this.isAppTheme(savedTheme) ? savedTheme : this.systemTheme());

    this.mediaQuery?.addEventListener('change', () => {
      if (!this.hasSavedTheme()) {
        this.applyTheme(this.systemTheme());
      }
    });
  }

  setTheme(theme: AppTheme): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: AppTheme): void {
    this.theme.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  private systemTheme(): AppTheme {
    return this.mediaQuery?.matches ? 'dark' : 'light';
  }

  private hasSavedTheme(): boolean {
    return this.isAppTheme(localStorage.getItem(LOCAL_STORAGE_KEYS.THEME));
  }

  private isAppTheme(theme: string | null): theme is AppTheme {
    return theme === 'light' || theme === 'dark' || theme === 'forest';
  }
}
