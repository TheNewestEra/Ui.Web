import { Injectable } from '@angular/core';
import { GAME_SESSION_TTL_MS } from '@core/constants/local-storage-keys.constants';

@Injectable({ providedIn: 'root' })
export class GameSessionStorageService {
  key(baseKey: string, gameId: string): string {
    return `${baseKey}:${gameId}`;
  }

  get(baseKey: string, gameId: string): string | null {
    return sessionStorage.getItem(this.key(baseKey, gameId));
  }

  set(baseKey: string, gameId: string, value: string): void {
    sessionStorage.setItem(this.key(baseKey, gameId), value);
  }

  remove(baseKey: string, gameId: string): void {
    sessionStorage.removeItem(this.key(baseKey, gameId));
  }

  setExpiry(expiryKey: string, gameId: string): void {
    this.set(expiryKey, gameId, `${Date.now() + GAME_SESSION_TTL_MS}`);
  }

  isExpired(expiryKey: string, gameId: string): boolean {
    const expiresAt = Number(this.get(expiryKey, gameId));
    return expiresAt > 0 && expiresAt <= Date.now();
  }
}
