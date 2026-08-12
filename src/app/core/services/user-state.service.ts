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

  readonly displayName = computed(
    () => this._user()?.username ?? localStorage.getItem(LOCAL_STORAGE_KEYS.USERNAME) ?? 'Unknown',
  );

  readonly color = computed(
    () => this._user()?.color ?? localStorage.getItem(LOCAL_STORAGE_KEYS.COLOUR),
  );

  setUser(user: User) {
    this._user.set(user);

    localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(user));
  }

  logout(): void {
    this._user.set(null);

    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
  }

  private generateUserColour(): string {
    const colour = Math.floor(Math.random() * 0xffffff);

    return `#${colour.toString(16).padStart(6, '0')}`;
  }

  private loadUser(): User | null {
    console.log('loadUser');
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.USER);

    console.log(stored);

    if (!stored) {
      console.log('stored nothing');
      if (localStorage.getItem(LOCAL_STORAGE_KEYS.COLOUR) === null)
        localStorage.setItem(LOCAL_STORAGE_KEYS.COLOUR, this.generateUserColour());

      if (localStorage.getItem(LOCAL_STORAGE_KEYS.USERNAME) === null) {
        const randomNumbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join(
          '',
        );
        localStorage.setItem(LOCAL_STORAGE_KEYS.USERNAME, `Guest_${randomNumbers}`);
      }
      return null;
    }

    // Remove these values from local storage because the user is logged in now
    localStorage.removeItem(LOCAL_STORAGE_KEYS.COLOUR);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USERNAME);

    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
      return null;
    }
  }
}
