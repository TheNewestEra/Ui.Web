import { computed, Injectable, signal } from '@angular/core';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { User } from '@thenewestera/accounts-ng';

@Injectable({
  providedIn: 'root',
})
export class UserStateService {
  private readonly _user = signal<User | null>(this.loadUser());

  readonly user = this._user.asReadonly();

  readonly isLoggedIn = computed(() => this._user() !== null);

  readonly displayName = computed(() => this._user()?.username ?? 'Guest');

  readonly color = computed(() => this._user()?.color ?? this.generateUserColor());

  setUser(user: User) {
    this._user.set(user);

    localStorage.setItem(LOCAL_STORAGE_KEYS.STORAGE_KEY, JSON.stringify(user));
  }

  logout(): void {
    this._user.set(null);

    localStorage.removeItem(LOCAL_STORAGE_KEYS.STORAGE_KEY);
  }

  private generateUserColor(): string {
    const hue = Math.floor(Math.random() * 360);

    return `hsl(${hue}, 70%, 55%)`;
  }

  private loadUser(): User | null {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.STORAGE_KEY);

    if (!stored) return null;

    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.STORAGE_KEY);
      return null;
    }
  }
}
