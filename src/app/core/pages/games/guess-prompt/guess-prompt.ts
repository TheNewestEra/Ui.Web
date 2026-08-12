import { Component, DestroyRef, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription, map, filter, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
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
  GuessPromptPresenceMessage,
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
import { GuessPromptGameService } from '@core/services/guess-prompt-game.service';
import {
  LeaderboardComponent,
  LeaderboardDisplayEntry,
} from '@core/components/leaderboard/leaderboard';

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
    LeaderboardComponent,
  ],
  templateUrl: './guess-prompt.html',
  styleUrl: './guess-prompt.css',
})
export class GuessPromptGamePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly guessPromptService = inject(GuessThePromptService);
  private readonly guessPromptSocket = inject(GuessPromptSocketService);
  private readonly guessPromptGameService = inject(GuessPromptGameService);

  readonly GameStatus = GameStatus;

  readonly gameId = toSignal(this.route.paramMap.pipe(map((params) => params.get('gameId'))), {
    initialValue: null,
  });
  readonly game = signal<Game | null>(null);
  game$ = toObservable(this.game);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly joining = signal(false);
  readonly replaying = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly shareMessage = signal<string | null>(null);

  readonly joinedGameId = signal(sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_GAME_ID));
  readonly participantId = signal(sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID));

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
  readonly postRoundRemainingMs = signal(0);

  readonly guessResult = signal<GuessResult | null>(null);
  readonly answeredCorrectly = signal(false);

  private lobbyTimer?: Subscription;
  private roundTimer?: Subscription;
  private postRoundTimer?: Subscription;

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

  readonly formattedPostRoundTime = computed(() => {
    return this.formatTime(this.postRoundRemainingMs());
  });

  readonly hasJoined = computed(() => {
    return !!this.participantId() && this.joinedGameId() === this.gameId();
  });

  readonly isSpectator = computed(() => {
    const status = this.game()?.status;

    return !this.hasJoined() && status !== GameStatus.Waiting;
  });

  readonly postRound = computed(() => {
    const game = this.game();
    const index = game?.postRoundIndex;

    if (!game || index == null) return null;

    return game.rounds[index] ?? null;
  });

  readonly displayedRound = computed(() => {
    const game = this.game();

    if (!game) return null;

    const index = game.postRoundIndex ?? game.currentRound;

    return index == null ? null : (game.rounds[index] ?? null);
  });

  readonly leaderboardEntries = computed<LeaderboardDisplayEntry[]>(() => {
    const game = this.game();

    if (!game) return [];

    return game.results.map((result, index) => {
      const participant = game.participants.find(
        (candidate) => candidate.id === result.participantId,
      );

      return {
        id: result.participantId,
        name: participant?.name ?? 'Unknown player',
        color: participant?.color ?? 'transparent',
        score: result.score,
        rank: index + 1,
      };
    });
  });

  readonly currentParticipant = computed(() => {
    return this.game()?.participants.find((participant) => participant.id === this.participantId());
  });

  readonly currentPlayerScore = computed(() => {
    const currentScore = this.game()?.results.find(
      (result) => result.participantId === this.participantId(),
    )?.score;

    return this.guessResult()?.totalScore ?? currentScore ?? 0;
  });

  readonly canSubmitGuess = computed(() => {
    return (
      this.hasJoined() &&
      !this.answeredCorrectly() &&
      !this.submitting() &&
      this.roundRemainingMs() > 0
    );
  });

  readonly isHost = computed(() => {
    return (
      !!sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN) &&
      sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_HOST_GAME_ID) === this.gameId()
    );
  });

  ngOnInit(): void {
    this.guessPromptSocket.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (message) => {
        this.handleSocketMessage(message);
      },

      error: (error) => {
        console.error('Guess Prompt WebSocket error', error);
        this.errorMessage.set('Connection to the game was lost.');
      },
    });

    this.route.paramMap
      .pipe(
        map((params) => params.get('gameId')),
        filter((gameId): gameId is string => !!gameId),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((gameId) => {
        this.initializeGame(gameId);
      });
  }

  private initializeGame(gameId: string): void {
    this.resetGameState();
    this.refreshPlayerIdentity(gameId);

    this.loading.set(true);
    this.errorMessage.set(null);

    this.guessPromptSocket.disconnect();
    this.guessPromptSocket.connect(gameId);
  }

  ngOnDestroy(): void {
    this.stopTimers();

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

      case 'presence':
        this.handlePresence(message);
        break;

      case 'prompts_ready':
      case 'guess':
      case 'revealed':
      case 'player_joined':
      case 'player_typing':
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
      postRoundIndex: message.postRoundIndex,
      postRoundRemainingMs: message.postRoundRemainingMs,
      lobbyRemainingMs: message.lobbyRemainingMs ?? 0,
      connectedPlayers: message.connectedPlayers ?? 0,
      participants: message.participants ?? [],
      results: message.results ?? [],
    };

    this.game.set(game);
    this.loading.set(false);
    this.errorMessage.set(null);

    if (previousRound !== nextRound && nextRound != null) this.handleRoundChanged(nextRound);

    /**
     * If we reconnect while the game is already in progress,
     * the backend state tells us where we are.
     */
    this.syncGameState(message);
  }

  private handleRoundChanged(roundIndex: number | null | undefined): void {
    this.stopRoundTimer();
    this.stopPostRoundTimer();

    this.guessResult.set(null);
    this.answeredCorrectly.set(this.wasRoundAnswered(roundIndex));
    this.guessForm.reset();

    if (roundIndex == null) return;
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
        this.finishGame();
        break;
    }
  }

  private handlePresence(message: GuessPromptPresenceMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        connectedPlayers: message.connectedPlayers,
      };
    });
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
          postRoundIndex: null,
          postRoundRemainingMs: null,
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

      // TODO(BE): Broadcast a full state snapshot immediately after resolving a round. The
      // round_status event does not contain the prompt, postRoundIndex, postRoundRemainingMs,
      // or updated standings required by the reveal screen.

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
    this.stopPostRoundTimer();

    this.guessForm.reset();
    this.guessResult.set(null);
    this.answeredCorrectly.set(this.wasRoundAnswered(index));

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

        if (message.postRoundIndex != null) this.syncPostRound(message);
        else this.syncCurrentRound(message);

        break;

      case GameStatus.Solved:
      case GameStatus.Timeout:
      case GameStatus.Error:
        this.handleGameFinished();
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
    const roundIndex = message.currentRound;

    if (roundIndex == null) return;

    const round = message.rounds[roundIndex];

    if (!round) {
      this.finishGame();
      return;
    }

    this.answeredCorrectly.set(this.wasRoundAnswered(roundIndex));

    /**
     * If the current round is ready, show it.
     *
     * The exact timer value should come from the backend.
     */
    if (round.status === RoundStatus.Active) {
      /**
       * On an initial/reconnect state, the backend must provide
       * the current round's remaining time.
       *
       * See the backend change described below.
       */
      if (round.remainingMs != null) this.startRoundTimer(round.remainingMs);
    }
  }

  private syncPostRound(message: GuessPromptStateMessage): void {
    const roundIndex = message.postRoundIndex;

    if (roundIndex == null) return;

    this.stopRoundTimer();
    this.guessForm.reset();

    this.startPostRoundTimer(message.postRoundRemainingMs ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------------
  startGame(): void {
    const gameId = this.gameId();

    if (!gameId || this.game()?.status !== GameStatus.Waiting) return;

    const hostToken = sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN) ?? '';

    this.errorMessage.set(null);

    this.guessPromptService
      .gamesIdStartPost(gameId, {
        hostToken,
      })
      .subscribe({
        error: (error) => {
          console.error('Unable to start game', error);

          this.errorMessage.set(error?.error?.error ?? 'Unable to start the game.');
        },
      });
  }

  joinGame(): void {
    const gameId = this.gameId();

    if (!gameId || this.game()?.status !== GameStatus.Waiting || this.hasJoined()) return;

    this.joining.set(true);
    this.errorMessage.set(null);

    this.guessPromptGameService
      .join(gameId)
      .pipe(finalize(() => this.joining.set(false)))
      .subscribe({
        next: () => {
          this.refreshPlayerIdentity(gameId);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'Unable to join the game.');
        },
      });
  }

  async shareGame(): Promise<void> {
    const url = window.location.href;

    this.shareMessage.set(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Guess the Prompt game',
          text: 'Join my Guess the Prompt game before it starts.',
          url,
        });
        this.shareMessage.set('Game shared.');
        return;
      }

      await navigator.clipboard.writeText(url);
      this.shareMessage.set('Game link copied.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      this.shareMessage.set('Unable to share the game link.');
    }
  }

  replayGame(): void {
    const gameId = this.gameId();

    if (!gameId || this.replaying()) return;

    this.replaying.set(true);
    this.errorMessage.set(null);

    this.guessPromptGameService
      .replay(gameId)
      .pipe(finalize(() => this.replaying.set(false)))
      .subscribe({
        error: (error) => {
          console.error('Unable to replay game', error);

          this.errorMessage.set(error?.error?.error ?? 'Unable to replay the game.');
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

  private startPostRoundTimer(remainingMs: number): void {
    this.stopPostRoundTimer();

    this.postRoundRemainingMs.set(Math.max(0, remainingMs));

    if (remainingMs <= 0) return;

    this.postRoundTimer = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const next = Math.max(0, this.postRoundRemainingMs() - 1000);

        this.postRoundRemainingMs.set(next);

        if (next <= 0) this.stopPostRoundTimer();
      });
  }

  // ---------------------------------------------------------------------------
  // Guess
  // ---------------------------------------------------------------------------
  submitGuess(): void {
    const gameId = this.gameId();

    if (!gameId || !this.canSubmitGuess() || this.guessForm.invalid) return;

    const { guess } = this.guessForm.getRawValue();

    if (!guess) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.guessPromptService
      .gamesIdGuessPost(gameId, {
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
            this.answeredCorrectly.set(true);
            this.rememberAnsweredRound(gameId, this.currentRound() ?? 0);
          }
        },

        error: (error) => {
          this.submitting.set(false);

          if (error?.error?.error === 'you already answered this round correctly') {
            this.guessForm.reset();
            this.answeredCorrectly.set(true);
            this.rememberAnsweredRound(gameId, this.currentRound() ?? 0);
          }
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

  private stopPostRoundTimer(): void {
    this.postRoundTimer?.unsubscribe();
    this.postRoundTimer = undefined;
  }

  private stopTimers(): void {
    this.stopLobbyTimer();
    this.stopRoundTimer();
    this.stopPostRoundTimer();
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

  private handleGameFinished(): void {
    this.stopTimers();

    this.guessResult.set(null);
    this.guessForm.reset();
  }

  private resetGameState(): void {
    this.stopTimers();

    this.submitting.set(false);
    this.joining.set(false);
    this.replaying.set(false);
    this.guessResult.set(null);
    this.answeredCorrectly.set(false);
    this.guessForm.reset();

    this.lobbyRemainingMs.set(0);
    this.roundRemainingMs.set(0);
    this.postRoundRemainingMs.set(0);
    this.shareMessage.set(null);

    this.game.set(null);
  }

  private refreshPlayerIdentity(gameId: string): void {
    const joinedGameId = sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_GAME_ID);

    this.joinedGameId.set(joinedGameId);
    this.participantId.set(
      joinedGameId === gameId
        ? sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID)
        : null,
    );
  }

  private rememberAnsweredRound(gameId: string, roundIndex: number): void {
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND, `${gameId}:${roundIndex}`);
  }

  private wasRoundAnswered(roundIndex: number | null | undefined): boolean {
    const gameId = this.gameId();

    if (!gameId || roundIndex == null) return false;

    return (
      sessionStorage.getItem(LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND) === `${gameId}:${roundIndex}`
    );
  }
}
