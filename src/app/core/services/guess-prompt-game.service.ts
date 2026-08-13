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
        tap(() => this.clearParticipantCredentials()),
        tap((response) => this.handleHostJoined(response)),
        map(() => undefined),
      );
  }

  private handleHostJoined(response: GamesPost202Response): void {
    this.storeHostToken(response.gameId, response.hostToken);

    sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, response.participantId);
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_TOKEN, response.token ?? '');
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_GAME_ID, response.gameId);
    sessionStorage.setItem(
      LOCAL_STORAGE_KEYS.GUESS_PLAYER_NAME,
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
