import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GamesPost202Response, GuessThePromptService, JoinResult } from '@thenewestera/guess-ng';
import { UserStateService } from './user-state.service';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { map, Observable, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GuessPromptGameService {
  private readonly router = inject(Router);
  private readonly guessService = inject(GuessThePromptService);
  private readonly userStateService = inject(UserStateService);

  start(theme: string): Observable<void> {
    return this.guessService.gamesPost({ theme }).pipe(
      tap((response: GamesPost202Response) => {
        this.storeHostToken(response.gameId, response.hostToken);
      }),

      switchMap((response: GamesPost202Response) => this.join(response.gameId)),
    );
  }

  replay(gameId: string): Observable<void> {
    return this.guessService.gamesIdReplayPost(gameId).pipe(
      tap((response) => {
        this.clearParticipantCredentials(gameId);
        this.storeHostToken(response.gameId, response.hostToken);
      }),

      switchMap((response) => this.join(response.gameId)),
    );
  }

  join(gameId: string): Observable<void> {
    return this.guessService.gamesIdJoinPost(gameId, this.createPlayer()).pipe(
      tap((response: JoinResult) => {
        sessionStorage.setItem(
          this.storageKey(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, gameId),
          response.participantId,
        );
        sessionStorage.setItem(
          this.storageKey(LOCAL_STORAGE_KEYS.GUESS_TOKEN, gameId),
          response.token ?? '',
        );
        sessionStorage.setItem(
          this.storageKey(LOCAL_STORAGE_KEYS.GUESS_PLAYER_NAME, gameId),
          this.userStateService.displayName(),
        );
      }),

      tap(() => {
        void this.router.navigate(['/games/guess-prompt', gameId]);
      }),

      map(() => undefined),
    );
  }

  private createPlayer() {
    if (this.userStateService.user() !== null) return undefined;

    return {
      player: this.userStateService.displayName(),
      // colour: this.userStateService.color(),  // TODO: waiting for BE to update
    };
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
