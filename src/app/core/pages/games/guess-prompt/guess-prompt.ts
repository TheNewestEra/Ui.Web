import { Component, DestroyRef, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Game,
  GameStatus,
  GuessResult,
  GuessThePromptService,
  RoundStatus,
} from '@thenewestera/guess-ng';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { GuessPromptSocketService } from '@core/services/guess-prompt-socket.service';
import {
  GuessPromptSocketMessage,
  GuessPromptStateMessage,
  GuessPromptStatusMessage,
  GuessPromptRoundReadyMessage,
  GuessPromptRoundStatusMessage,
} from '@core/models/guess-prompt-socket.interface';
import { CardComponent } from '@shared/components/card/card';
import { IconComponent } from '@shared/ui/icon/icon';
import { ButtonComponent } from '@shared/components/button/button';
import { InputComponent } from '@shared/components/form/input/input';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';

@Component({
  selector: 'app-guess-prompt',
  imports: [
    CardComponent,
    IconComponent,
    ButtonComponent,
    InputComponent,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    ErrorAlertComponent,
    FormFieldComponent,
  ],
  templateUrl: './guess-prompt.html',
  styleUrl: './guess-prompt.css',
})
export class GuessPromptGamePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly guessPromptService = inject(GuessThePromptService);
  private readonly guessPromptSocket = inject(GuessPromptSocketService);

  readonly GameStatus = GameStatus;

  readonly gameId = this.route.snapshot.paramMap.get('gameId');
  readonly game = signal<Game | null>(null);
  game$ = toObservable(this.game);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly guessForm = new FormGroup({
    guess: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /**
   * Lobby countdown.
   *
   * This is initialized from the WebSocket state message and then
   * counted down locally. A subsequent WebSocket state message
   * replaces it with the backend's latest value.
   */
  readonly lobbyRemainingMs = signal(0);

  /**
   * Current round countdown.
   *
   * Same principle as the lobby timer:
   * backend gives us the authoritative value,
   * FE counts down locally.
   */
  readonly roundRemainingMs = signal(0);

  readonly guessResult = signal<GuessResult | null>(null);

  readonly roundImage = signal<string | null>(null);

  private lobbyTimer?: Subscription;
  private roundTimer?: Subscription;

  readonly currentRound = computed(() => {
    const game = this.game();

    if (!game) return null;

    return game.currentRound ?? null;
  });

  readonly formattedLobbyTime = computed(() => {
    return this.formatTime(this.lobbyRemainingMs());
  });

  readonly formattedRoundTime = computed(() => {
    return this.formatTime(this.roundRemainingMs());
  });

  readonly isHost = signal(true); // TODO: fix this at some point

  ngOnInit(): void {
    if (!this.gameId) {
      this.errorMessage.set('Game not found.');
      this.loading.set(false);
      return;
    }

    this.guessPromptSocket.connect(this.gameId!);

    this.guessPromptSocket.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (message) => {
        this.handleSocketMessage(message);
      },

      error: (error) => {
        console.error('Guess Prompt WebSocket error', error);
        this.errorMessage.set('Connection to the game was lost.');
      },
    });
  }

  ngOnDestroy(): void {
    this.stopTimers();

    const image = this.roundImage();

    if (image) URL.revokeObjectURL(image);

    this.guessPromptSocket.disconnect();
  }

  private handleSocketMessage(message: GuessPromptSocketMessage): void {
    switch (message.type) {
      /**
       * Initial state and full state snapshots.
       *
       * This is the most important WebSocket message.
       */
      case 'state':
        this.handleState(message);
        break;

      /**
       * Game status changes such as:
       * generating -> waiting
       * waiting -> playing
       * playing -> solved
       */
      case 'status':
        this.handleStatus(message);
        break;

      /**
       * An individual round's image is ready.
       */
      case 'round_ready':
        this.handleRoundReady(message);
        break;

      /**
       * A round has completed or timed out.
       */
      case 'round_status':
        this.handleRoundStatus(message);
        break;

      /**
       * Other players can produce these messages, but for the
       * single-player implementation we don't need to react to them.
       */
      case 'prompts_ready':
      case 'guess':
      case 'revealed':
      case 'player_joined':
      case 'player_typing':
      case 'presence':
        break;
    }
  }

  private handleState(message: GuessPromptStateMessage): void {
    const previousRound = this.game()?.currentRound;
    const nextRound = message.currentRound;

    const game: Game = {
      id: message.id,
      theme: message.theme ?? '',
      status: message.status,
      error: message.error ?? '',
      rounds: message.rounds,
      currentRound: message.currentRound,
      lobbyRemainingMs: message.lobbyRemainingMs ?? 0,
      connectedPlayers: message.connectedPlayers ?? 0,
      participants: message.participants ?? [],
      results: message.results ?? [],
    };

    this.game.set(game);
    this.loading.set(false);
    this.errorMessage.set(null);

    if (previousRound !== nextRound) this.handleRoundChanged(nextRound);

    /**
     * If we reconnect while the game is already in progress,
     * the backend state tells us where we are.
     */
    this.syncGameState(message);
  }

  private handleRoundChanged(roundIndex: number | null | undefined): void {
    this.stopRoundTimer();

    this.guessResult.set(null);
    this.guessForm.reset();

    const previousImage = this.roundImage();

    if (previousImage) {
      URL.revokeObjectURL(previousImage);
    }

    this.roundImage.set(null);

    if (roundIndex == null) return;

    const game = this.game();

    if (!game) return;

    const round = game.rounds[roundIndex];

    if (!round) return;

    if (round.status === RoundStatus.Active || round.status === RoundStatus.Ready) {
      this.loadRoundImage(roundIndex);
    }
  }

  private handleStatus(message: GuessPromptStatusMessage): void {
    this.game.update((game) => {
      if (!game) {
        return game;
      }

      return {
        ...game,
        status: message.status,
        error: message.error ?? '',
      };
    });

    switch (message.status) {
      case GameStatus.Waiting:
        this.handleWaitingState();
        break;

      case GameStatus.Playing:
        this.handlePlayingState();
        break;

      case GameStatus.Solved:
      case GameStatus.Timeout:
      case GameStatus.Error:
        this.stopTimers();
        break;
    }
  }

  private handleRoundReady(message: GuessPromptRoundReadyMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        rounds: game.rounds.map((round, index) =>
          index === message.index
            ? {
                ...round,
                status: RoundStatus.Ready,
              }
            : round,
        ),
      };
    });

    // Don't start the round timer here.
    // round_status: active is now responsible for that.
  }

  private handleRoundStatus(message: GuessPromptRoundStatusMessage): void {
    // --------------------------------------------------------------------------
    // ROUND ACTIVE
    //
    // This is the event that advances the UI to the new round.
    // The backend gives us the authoritative timer value here.
    // --------------------------------------------------------------------------
    if (message.status === RoundStatus.Active) {
      const remainingMs = message.remainingMs;

      if (remainingMs == null) return;

      this.game.update((game) => {
        if (!game) return game;

        return {
          ...game,
          currentRound: message.index,
          rounds: game.rounds.map((round, index) =>
            index === message.index
              ? {
                  ...round,
                  status: RoundStatus.Active,
                  remainingMs,
                }
              : round,
          ),
        };
      });

      this.handleRoundActivated(message.index, remainingMs);

      return;
    }

    // --------------------------------------------------------------------------
    // ROUND COMPLETE / TIMEOUT
    //
    // Do NOT advance currentRound here.
    // The next round will be activated by its own "active" event.
    // --------------------------------------------------------------------------
    if (message.status === RoundStatus.Complete || message.status === RoundStatus.Timeout) {
      this.game.update((game) => {
        if (!game) return game;

        return {
          ...game,
          rounds: game.rounds.map((round, index) =>
            index === message.index
              ? {
                  ...round,
                  status: message.status,
                }
              : round,
          ),
        };
      });

      this.stopRoundTimer();
      this.guessForm.reset();
      this.guessResult.set(null);

      return;
    }

    // --------------------------------------------------------------------------
    // Other round statuses
    // --------------------------------------------------------------------------
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        rounds: game.rounds.map((round, index) =>
          index === message.index
            ? {
                ...round,
                status: message.status,
              }
            : round,
        ),
      };
    });
  }

  private handleRoundActivated(index: number, remainingMs: number): void {
    this.stopRoundTimer();

    this.guessForm.reset();
    this.guessResult.set(null);

    const previousImage = this.roundImage();

    if (previousImage) URL.revokeObjectURL(previousImage);

    this.roundImage.set(null);

    // Fetch the image for the NEW round.
    this.loadRoundImage(index);

    // Start from the exact value supplied by the backend.
    this.startRoundTimer(remainingMs);
  }

  // ---------------------------------------------------------------------------
  // Game state synchronization
  // ---------------------------------------------------------------------------
  private syncGameState(message: GuessPromptStateMessage): void {
    switch (message.status) {
      case GameStatus.Queued:
      case GameStatus.Generating:
        this.stopTimers();
        break;

      case GameStatus.Waiting:
        this.startLobbyCountdown(message.lobbyRemainingMs ?? 0);
        break;

      case GameStatus.Playing:
        this.stopLobbyTimer();
        this.syncCurrentRound(message);
        break;

      case GameStatus.Solved:
      case GameStatus.Timeout:
      case GameStatus.Error:
        this.stopTimers();
        break;
    }
  }

  private handleWaitingState(): void {
    const game = this.game();

    if (!game) return;

    this.startLobbyCountdown(game.lobbyRemainingMs ?? 0);
  }

  private handlePlayingState(): void {
    this.stopLobbyTimer();

    const game = this.game();

    if (!game) return;

    this.syncCurrentRound({
      ...game,
      status: GameStatus.Playing,
    } as GuessPromptStateMessage);
  }

  private syncCurrentRound(message: GuessPromptStateMessage): void {
    const roundIndex = message.currentRound ?? 0;
    const round = message.rounds[roundIndex];

    if (!round) {
      this.finishGame();
      return;
    }

    /**
     * If the current round is ready, show it.
     *
     * The exact timer value should come from the backend.
     */
    if (round.status === RoundStatus.Active) {
      this.loadRoundImage(roundIndex);

      /**
       * On an initial/reconnect state, the backend must provide
       * the current round's remaining time.
       *
       * See the backend change described below.
       */
      if (round.remainingMs != null) this.startRoundTimer(round.remainingMs);
    }
  }

  // ---------------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------------
  startGame(): void {
    if (!this.gameId || this.game()?.status !== GameStatus.Waiting) return;

    const hostToken = sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN) ?? '';

    this.errorMessage.set(null);

    this.guessPromptService
      .gamesIdStartPost(this.gameId, {
        hostToken,
      })
      .subscribe({
        error: (error) => {
          console.error('Unable to start game', error);

          this.errorMessage.set(error?.error?.error ?? 'Unable to start the game.');
        },
      });
  }

  private startLobbyCountdown(remainingMs: number): void {
    this.stopLobbyTimer();

    this.lobbyRemainingMs.set(Math.max(0, remainingMs));

    if (remainingMs <= 0) {
      return;
    }

    this.lobbyTimer = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const next = Math.max(0, this.lobbyRemainingMs() - 1000);

        this.lobbyRemainingMs.set(next);

        if (next <= 0) {
          this.stopLobbyTimer();
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Rounds
  // ---------------------------------------------------------------------------
  private loadRoundImage(roundIndex: number): void {
    if (!this.gameId) return;

    this.guessPromptService.gamesIdImagesIndexGet(this.gameId, roundIndex.toString()).subscribe({
      next: (image: Blob) => {
        const url = URL.createObjectURL(image);

        const previousImage = this.roundImage();

        if (previousImage) URL.revokeObjectURL(previousImage);

        this.roundImage.set(url);
      },

      error: (error) => {
        console.error('Unable to load round image', error);

        this.errorMessage.set('Unable to load the game image.');
      },
    });
  }

  private startRoundTimer(remainingMs: number): void {
    this.stopRoundTimer();

    this.roundRemainingMs.set(Math.max(0, remainingMs));

    if (remainingMs <= 0) {
      return;
    }

    this.roundTimer = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const next = Math.max(0, this.roundRemainingMs() - 1000);

        this.roundRemainingMs.set(next);

        if (next <= 0) {
          this.stopRoundTimer();
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Guess
  // ---------------------------------------------------------------------------
  submitGuess(): void {
    if (!this.gameId || this.submitting() || this.roundRemainingMs() <= 0 || this.guessForm.invalid)
      return;

    const { guess } = this.guessForm.getRawValue();

    if (!guess) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.guessPromptService
      .gamesIdGuessPost(this.gameId, {
        index: this.currentRound() ?? 0,
        participantId: sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID) ?? '',
        token: sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_TOKEN) ?? undefined,
        guess: guess,
      })
      .subscribe({
        next: (result: GuessResult) => {
          this.submitting.set(false);
          this.guessResult.set(result);

          /**
           * The backend determines the score.
           *
           * A correct guess does NOT mean we manually finish
           * the round here. The backend will eventually broadcast
           * round_status: complete.
           *
           * We only stop the local timer so the user can't keep
           * submitting while waiting for that socket event.
           */
          if (result.correct) {
            this.guessForm.reset();

            this.stopRoundTimer();
          }
        },

        error: () => {
          this.submitting.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Game finished
  // ---------------------------------------------------------------------------
  private finishGame(): void {
    this.stopTimers();

    this.guessResult.set(null);
    this.guessForm.reset();

    const previousImage = this.roundImage();

    if (previousImage) URL.revokeObjectURL(previousImage);

    this.roundImage.set(null);
  }

  // ---------------------------------------------------------------------------
  // Timers
  // ---------------------------------------------------------------------------
  private stopLobbyTimer(): void {
    this.lobbyTimer?.unsubscribe();
    this.lobbyTimer = undefined;
  }

  private stopRoundTimer(): void {
    this.roundTimer?.unsubscribe();
    this.roundTimer = undefined;
  }

  private stopTimers(): void {
    this.stopLobbyTimer();
    this.stopRoundTimer();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
