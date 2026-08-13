import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GamesPost202Response, GuessThePromptService } from '@thenewestera/guess-ng';
import { UserStateService } from './user-state.service';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GuessPromptGameService {
  private readonly router = inject(Router);
  private readonly guessService = inject(GuessThePromptService);
  private readonly userStateService = inject(UserStateService);

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

    sessionStorage.setItem(
      this.storageKey(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, response.gameId),
      response.participantId,
    );
    sessionStorage.setItem(
      this.storageKey(LOCAL_STORAGE_KEYS.GUESS_TOKEN, response.gameId),
      response.token ?? '',
    );
    sessionStorage.setItem(
      this.storageKey(LOCAL_STORAGE_KEYS.GUESS_PLAYER_NAME, response.gameId),
      this.userStateService.displayName(),
    );

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
    sessionStorage.setItem(this.storageKey(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, gameId), hostToken);
  }

  clearParticipantCredentials(gameId: string): void {
    sessionStorage.removeItem(this.storageKey(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, gameId));
    sessionStorage.removeItem(this.storageKey(LOCAL_STORAGE_KEYS.GUESS_TOKEN, gameId));
    sessionStorage.removeItem(this.storageKey(LOCAL_STORAGE_KEYS.GUESS_PLAYER_NAME, gameId));
    sessionStorage.removeItem(this.storageKey(LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND, gameId));
  }

  clearGameCredentials(gameId: string): void {
    this.clearParticipantCredentials(gameId);
    sessionStorage.removeItem(this.storageKey(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, gameId));
  }

  private storageKey(baseKey: string, gameId: string): string {
    return `${baseKey}:${gameId}`;
  }
}
