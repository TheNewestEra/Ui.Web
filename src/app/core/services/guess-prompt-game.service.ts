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
        this.clearParticipantCredentials();
        this.storeHostToken(response.gameId, response.hostToken);
      }),

      switchMap((response) => this.join(response.gameId)),
    );
  }

  join(gameId: string): Observable<void> {
    return this.guessService.gamesIdJoinPost(gameId, this.createPlayer()).pipe(
      tap((response: JoinResult) => {
        sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, response.participantId);
        sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_TOKEN, response.token ?? '');
        sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_GAME_ID, gameId);
        sessionStorage.setItem(
          LOCAL_STORAGE_KEYS.GUESS_PLAYER_NAME,
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
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, hostToken);
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_HOST_GAME_ID, gameId);
  }

  clearParticipantCredentials(): void {
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_TOKEN);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_GAME_ID);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_PLAYER_NAME);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND);
  }

  clearGameCredentials(): void {
    this.clearParticipantCredentials();

    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.GUESS_HOST_GAME_ID);
  }
}
