import { computed, Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  username: string;
}

interface StoredUser {
  id: string;
  username: string;
}

const STORAGE_KEY = 'escape-ai-user';
const DEVICE_COLOR_STORAGE_KEY = 'escape-ai-device-color';

@Injectable({
  providedIn: 'root',
})
export class UserStateService {
  private readonly _user = signal<User | null>(this.loadUser());

  private readonly _deviceColor = signal(this.loadDeviceColor());

  readonly user = this._user.asReadonly();

  readonly isLoggedIn = signal(this._user() !== null);

  readonly displayName = computed(() => this._user()?.username ?? 'Guest');

  readonly color = this._deviceColor.asReadonly();

  register(user: User): void {
    this.setUser(user);
  }

  login(user: User): void {
    this.setUser(user);
  }

  logout(): void {
    this._user.set(null);

    localStorage.removeItem(STORAGE_KEY);
  }

  private loadDeviceColor(): string {
    const stored = localStorage.getItem(DEVICE_COLOR_STORAGE_KEY);

    if (stored) {
      return stored;
    }

    const color = this.generateUserColor();

    localStorage.setItem(DEVICE_COLOR_STORAGE_KEY, color);

    return color;
  }

  private generateUserColor(): string {
    const hue = Math.floor(Math.random() * 360);

    return `hsl(${hue}, 70%, 55%)`;
  }

  private setUser(user: User) {
    this._user.set(user);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private loadUser(): User | null {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return null;

    try {
      return JSON.parse(stored) as StoredUser;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
