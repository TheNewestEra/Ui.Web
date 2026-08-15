import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  PiecePuzzleService,
  PuzzlesPost202Response,
  PuzzlesPostRequest,
} from '@thenewestera/puzzle-ng';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { UserStateService } from './user-state.service';
import { GameSessionStorageService } from './game-session-storage.service';
import { map, Observable, tap } from 'rxjs';
import { GamesIdRegeneratePostRequest } from '@thenewestera/guess-ng';

@Injectable({ providedIn: 'root' })
export class PiecePuzzleGameService {
  private readonly api = inject(PiecePuzzleService);
  private readonly router = inject(Router);
  private readonly userStateService = inject(UserStateService);
  private readonly storage = inject(GameSessionStorageService);

  create(theme: string, gridSize: number, timeLimitSeconds?: number): Observable<void> {
    const request: PuzzlesPostRequest = {
      theme,
      gridSize,
      timeLimitSeconds,
      player: this.playerPayload.player,
      color: this.playerPayload.color,
    };
    return this.api.puzzlesPost(request).pipe(
      tap((response) => this.storeHost(response)),
      tap((response) => void this.router.navigate(['/games/piece-puzzle', response.puzzleId])),
      map(() => undefined),
    );
  }

  private get playerPayload() {
    return this.userStateService.isLoggedIn()
      ? {
          player: undefined,
          color: undefined,
        }
      : {
          player: this.userStateService.displayName(),
          color: this.userStateService.color() ?? undefined,
        };
  }

  private executeGameRequest(
    requestFn: (
      gameId: string,
      payload: GamesIdRegeneratePostRequest,
    ) => Observable<PuzzlesPost202Response>,
    gameId: string,
  ): Observable<void> {
    return requestFn(gameId, this.playerPayload).pipe(
      tap(() => this.clear(gameId)),
      tap((response) => this.storeHost(response)),
      tap((response) => void this.router.navigate(['/games/piece-puzzle', response.puzzleId])),
      map(() => undefined),
    );
  }

  replay(gameId: string): Observable<void> {
    return this.executeGameRequest(
      (id, payload) => this.api.puzzlesIdReplayPost(id, payload),
      gameId,
    );
  }

  regenerate(gameId: string): Observable<void> {
    return this.executeGameRequest(
      (id, payload) => this.api.puzzlesIdRegeneratePost(id, payload),
      gameId,
    );
  }

  storeParticipant(gameId: string, participantId: string, token: string | null): void {
    this.storage.set(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_PARTICIPANT_ID, gameId, participantId);
    this.storage.set(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN, gameId, token ?? '');
    this.storage.setExpiry(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_EXPIRES_AT, gameId);
  }

  get(key: string, gameId: string): string | null {
    return this.storage.get(key, gameId);
  }

  clear(gameId: string): void {
    for (const key of [
      LOCAL_STORAGE_KEYS.PIECE_PUZZLE_PARTICIPANT_ID,
      LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN,
      LOCAL_STORAGE_KEYS.PIECE_PUZZLE_HOST_TOKEN,
      LOCAL_STORAGE_KEYS.PIECE_PUZZLE_RATED,
      LOCAL_STORAGE_KEYS.PIECE_PUZZLE_EXPIRES_AT,
    ])
      this.storage.remove(key, gameId);
  }

  clearIfExpired(gameId: string): void {
    if (this.storage.isExpired(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_EXPIRES_AT, gameId))
      this.clear(gameId);
  }

  private storeHost(response: PuzzlesPost202Response): void {
    this.storage.set(
      LOCAL_STORAGE_KEYS.PIECE_PUZZLE_HOST_TOKEN,
      response.puzzleId,
      response.hostToken,
    );
    this.storeParticipant(response.puzzleId, response.participantId, response.token);
  }
}
