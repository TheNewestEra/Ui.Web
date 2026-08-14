import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GamesPost202Response, GuessThePromptService } from '@thenewestera/guess-ng';
import { UserStateService } from './user-state.service';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { GameSessionStorageService } from './game-session-storage.service';
import { map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GuessPromptGameService {
  private readonly router = inject(Router);
  private readonly guessService = inject(GuessThePromptService);
  private readonly userStateService = inject(UserStateService);
  private readonly storage = inject(GameSessionStorageService);

  start(theme: string): Observable<void> {
    return this.guessService
      .gamesPost({ theme, player: this.createPlayer(), color: this.createColor() })
      .pipe(
        tap((response) => this.handleHostJoined(response)),
        map(() => undefined),
      );
  }

  replay(gameId: string): Observable<void> {
    return this.guessService
      .gamesIdReplayPost(gameId, { player: this.createPlayer(), color: this.createColor() })
      .pipe(
        tap(() => this.clearParticipantCredentials(gameId)),
        tap((response) => this.handleHostJoined(response)),
        map(() => undefined),
      );
  }

  private handleHostJoined(response: GamesPost202Response): void {
    this.storeHostToken(response.gameId, response.hostToken);

    this.storeParticipant(response.gameId, response.participantId, response.token);

    void this.router.navigate(['/games/guess-prompt', response.gameId]);
  }

  private createPlayer(): string | undefined {
    if (this.userStateService.user() !== null) return undefined;

    return this.userStateService.displayName();
  }

  private createColor(): string | undefined {
    if (this.userStateService.user() !== null) return undefined;

    return this.userStateService.color() ?? undefined;
  }

  private storeHostToken(gameId: string, hostToken: string): void {
    this.storage.set(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, gameId, hostToken);
  }

  storeParticipant(gameId: string, participantId: string, token: string | null): void {
    this.storage.set(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, gameId, participantId);
    this.storage.set(LOCAL_STORAGE_KEYS.GUESS_TOKEN, gameId, token ?? '');
    this.storage.setExpiry(LOCAL_STORAGE_KEYS.GUESS_EXPIRES_AT, gameId);
  }

  get(key: string, gameId: string): string | null {
    return this.storage.get(key, gameId);
  }

  set(key: string, gameId: string, value: string): void {
    this.storage.set(key, gameId, value);
  }

  clearParticipantCredentials(gameId: string): void {
    this.storage.remove(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, gameId);
    this.storage.remove(LOCAL_STORAGE_KEYS.GUESS_TOKEN, gameId);
    this.storage.remove(LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND, gameId);
  }

  clearGameCredentials(gameId: string): void {
    this.clearParticipantCredentials(gameId);
    this.storage.remove(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, gameId);
    this.storage.remove(LOCAL_STORAGE_KEYS.GUESS_RATED_GAME, gameId);
    this.storage.remove(LOCAL_STORAGE_KEYS.GUESS_EXPIRES_AT, gameId);
  }

  clearExpiredGameCredentials(gameId: string): void {
    if (this.storage.isExpired(LOCAL_STORAGE_KEYS.GUESS_EXPIRES_AT, gameId))
      this.clearGameCredentials(gameId);
  }
}
