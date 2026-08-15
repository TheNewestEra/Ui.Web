import { Component, DestroyRef, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription, map, filter, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Game,
  GameStatus,
  GameWsErrorMessage,
  GameWsErrorMessageActionEnum,
  GameWsErrorMessageTypeEnum,
  GameWsGuessMessageTypeEnum,
  GameWsGuessMessage,
  GameWsGuessRequestTypeEnum,
  GameWsGuessResultMessage,
  GameWsGuessResultMessageTypeEnum,
  GameWsJoinRequestTypeEnum,
  GameWsJoinResultMessage,
  GameWsJoinResultMessageTypeEnum,
  GameWsMessage,
  GameWsPlayerTypingMessageTypeEnum,
  GameWsPromptsReadyMessageTypeEnum,
  GameWsRevealedMessageTypeEnum,
  GameWsRoundReadyMessage,
  GameWsRoundReadyMessageTypeEnum,
  GameWsRoundStatusMessage,
  GameWsRoundStatusMessageTypeEnum,
  GameWsStateMessage,
  GameWsStateMessageTypeEnum,
  GuessResult,
  GuessThePromptService,
  RoundStatus,
  WsPlayerJoinedMessage,
  WsPlayerJoinedMessageTypeEnum,
  WsPresenceMessage,
  WsPresenceMessageTypeEnum,
  WsStatusMessage,
  WsStatusMessageTypeEnum,
} from '@thenewestera/guess-ng';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { GuessPromptSocketService } from '@core/services/guess-prompt-socket.service';
import { CardComponent } from '@shared/components/card/card';
import { IconComponent } from '@shared/ui/icon/icon';
import { ButtonComponent } from '@shared/components/button/button';
import { InputComponent } from '@shared/components/form/input/input';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { SuccessAlertComponent } from '@shared/components/alert/success/success';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { GuessPromptGameService } from '@core/services/guess-prompt-game.service';
import {
  ApiInvitesPostRequestKindEnum,
  FriendSummary,
  FriendsService,
  GroupSummary,
  InvitesService,
} from '@thenewestera/friends-ng';
import { UserStateService } from '@core/services/user-state.service';
import {
  LeaderboardComponent,
  LeaderboardDisplayEntry,
} from '@core/components/leaderboard/leaderboard';
import { GameRatingComponent } from '@core/components/game-rating/game-rating';
import { SoundService } from '@shared/services/sound.service';

const MAX_VISIBLE_GUESSES = 5;
const GUESS_VISIBILITY_MS = 8_000;

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
    GameRatingComponent,
    SuccessAlertComponent,
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
  private readonly friendsService = inject(FriendsService);
  private readonly invitesService = inject(InvitesService);
  private readonly userState = inject(UserStateService);
  private readonly sound = inject(SoundService);

  readonly GameStatus = GameStatus;
  readonly isLoggedIn = this.userState.isLoggedIn;

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
  readonly inviteMessage = signal<string | null>(null);
  readonly inviteLoading = signal(false);
  readonly inviteRecipientsLoading = signal(false);
  readonly inviteFriends = signal<FriendSummary[]>([]);
  readonly inviteGroups = signal<GroupSummary[]>([]);
  readonly inviteTarget = new FormControl('', { nonNullable: true });
  private inviteRecipientsLoaded = false;

  readonly participantId = signal<string | null>(null);

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
  readonly liveGuesses = signal<
    Array<{
      id: number;
      index: number;
      participantId: string;
      player: string;
      color: string;
      correct: boolean;
      score: number | null;
      guess: string;
    }>
  >([]);
  readonly resultRoundIndex = signal(0);

  private lobbyTimer?: Subscription;
  private roundTimer?: Subscription;
  private postRoundTimer?: Subscription;
  private nextLiveGuessId = 0;
  private readonly liveGuessTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

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
    const participantId = this.participantId();
    return (
      !!participantId &&
      !!this.game()?.participants.some((participant) => participant.id === participantId)
    );
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

  readonly resultRound = computed(() => {
    return this.game()?.rounds[this.resultRoundIndex()] ?? null;
  });

  readonly canViewPreviousResultRound = computed(() => this.resultRoundIndex() > 0);
  readonly canViewNextResultRound = computed(() => {
    const roundCount = this.game()?.rounds.length ?? 0;
    return this.resultRoundIndex() < roundCount - 1;
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
    const gameId = this.gameId();
    return (
      !!gameId && !!this.guessPromptGameService.get(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, gameId)
    );
  });

  ngOnInit(): void {
    this.guessPromptSocket.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (message) => {
        this.handleSocketMessage(message);
      },

      error: () => {
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

    // The host is already joined by the time this page loads — POST
    // /games and POST /games/{id}/replay auto-join them server-side (see
    // `GuessPromptGameService`), so `refreshPlayerIdentity()` above already
    // picks up their credentials. Everyone else still opts in explicitly
    // via the "Join game" button (see `joinGame()`).
    this.guessPromptSocket.disconnect();
    this.guessPromptSocket.connect(gameId);
  }

  ngOnDestroy(): void {
    this.stopTimers();
    this.clearLiveGuesses();

    this.guessPromptSocket.disconnect();
  }

  private handleSocketMessage(message: GameWsMessage): void {
    switch (message.type) {
      /**
       * Initial state and full state snapshots.
       *
       * This is the most important WebSocket message.
       */
      case GameWsStateMessageTypeEnum.State:
        this.handleState(message);
        break;

      /**
       * Game status changes such as:
       * generating -> waiting
       * waiting -> playing
       * playing -> solved
       */
      case WsStatusMessageTypeEnum.Status:
        this.handleStatus(message);
        break;

      /**
       * An individual round's image is ready.
       */
      case GameWsRoundReadyMessageTypeEnum.RoundReady:
        this.handleRoundReady(message);
        break;

      /**
       * A round has completed or timed out.
       */
      case GameWsRoundStatusMessageTypeEnum.RoundStatus:
        this.handleRoundStatus(message);
        break;

      case WsPresenceMessageTypeEnum.Presence:
        this.handlePresence(message);
        break;

      /**
       * Direct reply to our own `join` message — see `joinGame()` and
       * `initializeGame()`'s host auto-join.
       */
      case GameWsJoinResultMessageTypeEnum.JoinResult:
        this.handleJoinResult(message);
        break;

      /**
       * Direct reply to our own `guess` message — our own private view of
       * the result (the real prompt, once correct, plus our running
       * total). Distinct from the public `guess` broadcast below, which
       * every connected client (including us) also receives but which
       * never carries the prompt.
       */
      case GameWsGuessResultMessageTypeEnum.GuessResult:
        this.handleGuessResult(message);
        break;

      /**
       * Direct reply to a rejected `join`/`guess`/`reveal` message — the WS
       * equivalent of the 4xx bodies those actions used to return over
       * HTTP.
       */
      case GameWsErrorMessageTypeEnum.Error:
        this.handleSocketError(message);
        break;

      case GameWsPromptsReadyMessageTypeEnum.PromptsReady:
      case GameWsRevealedMessageTypeEnum.Revealed:
      case GameWsPlayerTypingMessageTypeEnum.PlayerTyping:
        break;

      case WsPlayerJoinedMessageTypeEnum.PlayerJoined:
        this.handlePlayerJoined(message);
        break;

      case GameWsGuessMessageTypeEnum.Guess:
        this.handlePublicGuess(message);
        break;
    }
  }

  /** Persists the participantId/token every later `guess`/`reveal` message
   * must carry, scoped to this game via `GUESS_GAME_ID` (see
   * `hasJoined()`/`refreshPlayerIdentity()`). */
  private handleJoinResult(message: GameWsJoinResultMessage): void {
    const gameId = this.gameId();

    if (!gameId) return;

    this.guessPromptGameService.storeParticipant(gameId, message.participantId, message.token);

    this.joining.set(false);
    this.refreshPlayerIdentity(gameId);
  }

  /** Direct reply to our own `guess` message (see `submitGuess()`) — the WS
   * equivalent of the old POST /games/{id}/guess response body. */
  private handleGuessResult(message: GameWsGuessResultMessage): void {
    if (!message.correct) this.sound.incorrect();

    this.submitting.set(false);
    this.guessResult.set({
      correct: message.correct,
      prompt: message.prompt,
      score: message.score,
      totalScore: message.totalScore,
    });

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
    if (message.correct) {
      this.guessForm.reset();
      this.answeredCorrectly.set(true);

      this.rememberAnsweredRound(this.currentRound() ?? 0);
    }
  }

  /** There's no per-call `.subscribe({error})` to catch a rejected
   * `join`/`guess`/`reveal` on any more, so it's handled centrally here
   * instead — same reasoning as Piece Puzzle's own `handleError()`. */
  private handleSocketError(message: GameWsErrorMessage): void {
    if (message.action === GameWsErrorMessageActionEnum.Join) {
      this.joining.set(false);
      this.errorMessage.set(message.error);
      return;
    }

    if (message.action === GameWsErrorMessageActionEnum.Guess) {
      this.submitting.set(false);

      if (message.error === 'you already answered this round correctly') {
        this.guessForm.reset();
        this.answeredCorrectly.set(true);

        this.rememberAnsweredRound(this.currentRound() ?? 0);
      }
    }
  }

  private handleState(message: GameWsStateMessage): void {
    const previousStatus = this.game()?.status;
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

    if (
      previousStatus != null &&
      previousStatus !== GameStatus.Playing &&
      game.status === GameStatus.Playing
    ) {
      this.sound.gameStarted();
    }

    this.loading.set(false);
    this.errorMessage.set(null);

    if (game.status === GameStatus.Waiting) this.loadInviteRecipients();

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

  private handleStatus(message: WsStatusMessage): void {
    // `WsStatusMessage.status` is `WsStatusMessageStatusEnum` — a separate
    // (structurally identical) generated enum from `GameStatus`, since the
    // shared `status`/`player_joined`/`presence`/`pong` WS shapes live in
    // their own OpenAPI component rather than this service's own. Same cast
    // Piece Puzzle's own `handleStatus()` uses for `PuzzleStatus`.
    const status = message.status as unknown as GameStatus;
    const previousStatus = this.game()?.status;

    this.game.update((game) => {
      if (!game) {
        return game;
      }

      return {
        ...game,
        status,
        error: message.error ?? '',
      };
    });

    switch (status) {
      case GameStatus.Waiting:
        this.handleWaitingState();
        break;

      case GameStatus.Playing:
        if (previousStatus !== GameStatus.Playing) this.sound.gameStarted();
        this.handlePlayingState();
        break;

      case GameStatus.Solved:
        if (this.isCurrentPlayerWinner()) this.sound.victory();
        else this.sound.complete();
        this.finishGame();
        break;

      case GameStatus.Timeout:
        this.sound.timeout();
        this.finishGame();
        break;

      case GameStatus.Error:
        this.finishGame();
        break;
    }
  }

  private handlePresence(message: WsPresenceMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        connectedPlayers: message.connectedPlayers,
      };
    });
  }

  private handlePlayerJoined(message: WsPlayerJoinedMessage): void {
    this.sound.joined();

    this.game.update((game) => {
      if (!game) return game;

      const existingIndex = game.participants.findIndex(
        (participant) =>
          (!!message.participantId && participant.id === message.participantId) ||
          participant.name === message.name,
      );

      if (existingIndex >= 0) {
        const existing = game.participants[existingIndex];
        if (
          existing.color === message.color &&
          (!message.participantId || existing.id === message.participantId)
        ) {
          return game;
        }

        const participants = [...game.participants];
        participants[existingIndex] = {
          ...existing,
          id: message.participantId ?? existing.id,
          color: message.color,
        };
        return { ...game, participants };
      }

      return {
        ...game,
        participants: [
          ...game.participants,
          {
            id: message.participantId ?? `player:${message.name}`,
            name: message.name,
            color: message.color,
          },
        ],
      };
    });
  }

  private handleRoundReady(message: GameWsRoundReadyMessage): void {
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

  private handleRoundStatus(message: GameWsRoundStatusMessage): void {
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
      if (message.status === RoundStatus.Complete) this.sound.roundComplete();
      else this.sound.timeout();

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
  private syncGameState(message: GameWsStateMessage): void {
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
    } as GameWsStateMessage);
  }

  private syncCurrentRound(message: GameWsStateMessage): void {
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

  private syncPostRound(message: GameWsStateMessage): void {
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

    const hostToken =
      this.guessPromptGameService.get(LOCAL_STORAGE_KEYS.GUESS_HOST_TOKEN, gameId) ?? '';

    this.errorMessage.set(null);

    this.guessPromptService
      .gamesIdStartPost(gameId, {
        hostToken,
      })
      .subscribe({
        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'Unable to start the game.');
        },
      });
  }

  /** Sends the `join` message directly — the socket's been open since this
   * page loaded, so there's no race to send into. The reply comes back as a
   * `join_result`/`error` message instead of an Observable — see
   * `handleJoinResult()`/`handleSocketError()`. `color` is guest-only (see
   * `GameWsJoinRequestSchema`'s doc comment on the backend) — omitted for a
   * logged-in caller, whose account color is always authoritative, same
   * split `GuessPromptGameService.createColor()` uses for the host's own
   * auto-join at creation/replay time. */
  joinGame(): void {
    const gameId = this.gameId();

    if (!gameId || this.game()?.status !== GameStatus.Waiting || this.hasJoined()) return;

    this.joining.set(true);
    this.errorMessage.set(null);

    this.guessPromptSocket.send({
      type: GameWsJoinRequestTypeEnum.Join,
      player: this.userState.displayName(),
      color: this.userState.isLoggedIn() ? undefined : (this.userState.color() ?? undefined),
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

  sendGameInvite(): void {
    const gameId = this.gameId();
    const target = this.inviteTarget.value;

    if (!gameId || this.game()?.status !== GameStatus.Waiting || !target) return;

    const [targetType, targetId] = target.split(':', 2);

    if (!targetId) return;

    this.inviteLoading.set(true);
    this.inviteMessage.set(null);

    this.invitesService
      .apiInvitesPost({
        kind: ApiInvitesPostRequestKindEnum.Guess,
        sessionId: gameId,
        ...(targetType === 'friend' ? { friendId: targetId } : { groupId: targetId }),
      })
      .pipe(finalize(() => this.inviteLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.inviteTarget.reset();
          this.inviteMessage.set(
            response.invited === 1 ? 'Invitation sent.' : `${response.invited} invitations sent.`,
          );
        },
        error: (error) => {
          this.inviteMessage.set(error?.error?.error ?? 'Unable to send the invitation.');
        },
      });
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
        this.playCountdownSound(next);

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
        this.playCountdownSound(next);

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
        this.playCountdownSound(next);

        if (next <= 0) this.stopPostRoundTimer();
      });
  }

  // ---------------------------------------------------------------------------
  // Guess
  // ---------------------------------------------------------------------------
  /** Reply comes back as a `guess_result`/`error` message instead of an
   * Observable — see `handleGuessResult()`/`handleSocketError()`. */
  submitGuess(): void {
    const gameId = this.gameId();

    if (!gameId || !this.canSubmitGuess() || this.guessForm.invalid) return;

    const { guess } = this.guessForm.getRawValue();

    if (!guess) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.guessPromptSocket.send({
      type: GameWsGuessRequestTypeEnum.Guess,
      index: this.currentRound() ?? 0,
      participantId: this.participantId() ?? '',
      token: this.guessPromptGameService.get(LOCAL_STORAGE_KEYS.GUESS_TOKEN, gameId) ?? undefined,
      guess,
    });
  }

  // ---------------------------------------------------------------------------
  // Game finished
  // ---------------------------------------------------------------------------
  private finishGame(): void {
    this.stopTimers();

    const gameId = this.gameId();
    if (gameId) this.guessPromptGameService.clearGameCredentials(gameId);

    this.guessResult.set(null);
    this.guessForm.reset();
  }

  private isCurrentPlayerWinner(): boolean {
    const participantId = this.participantId();
    const results = this.game()?.results ?? [];
    if (!participantId || !results.length) return false;

    const highestScore = Math.max(...results.map(({ score }) => score));
    return results.some(
      (result) => result.participantId === participantId && result.score === highestScore,
    );
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

  private playCountdownSound(milliseconds: number): void {
    if (milliseconds > 0 && milliseconds <= 5000) this.sound.countdown();
  }

  private handlePublicGuess(message: GameWsGuessMessage): void {
    if (message.correct) this.sound.score();

    const id = ++this.nextLiveGuessId;

    this.liveGuesses.update((guesses) =>
      [
        ...guesses,
        {
          id,
          index: message.index,
          participantId: message.participantId,
          player: message.player,
          color: message.color,
          correct: message.correct,
          score: message.score,
          guess: message.guess ?? '',
        },
      ].slice(-MAX_VISIBLE_GUESSES),
    );

    const timeout = setTimeout(() => {
      this.liveGuesses.update((guesses) => guesses.filter((guess) => guess.id !== id));
      this.liveGuessTimeouts.delete(id);
    }, GUESS_VISIBILITY_MS);

    this.liveGuessTimeouts.set(id, timeout);
  }

  private clearLiveGuesses(): void {
    for (const timeout of this.liveGuessTimeouts.values()) clearTimeout(timeout);
    this.liveGuessTimeouts.clear();
    this.liveGuesses.set([]);
  }

  previousResultRound(): void {
    if (!this.canViewPreviousResultRound()) return;
    this.resultRoundIndex.update((index) => index - 1);
  }

  nextResultRound(): void {
    if (!this.canViewNextResultRound()) return;
    this.resultRoundIndex.update((index) => index + 1);
  }

  private handleGameFinished(): void {
    this.stopTimers();

    const gameId = this.gameId();
    if (gameId) this.guessPromptGameService.clearGameCredentials(gameId);

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
    this.clearLiveGuesses();
    this.resultRoundIndex.set(0);
    this.guessForm.reset();

    this.lobbyRemainingMs.set(0);
    this.roundRemainingMs.set(0);
    this.postRoundRemainingMs.set(0);
    this.shareMessage.set(null);
    this.inviteMessage.set(null);
    this.inviteTarget.reset();
    this.inviteFriends.set([]);
    this.inviteGroups.set([]);
    this.inviteRecipientsLoaded = false;

    this.game.set(null);
  }

  private refreshPlayerIdentity(gameId: string): void {
    this.guessPromptGameService.clearExpiredGameCredentials(gameId);
    this.participantId.set(
      this.userState.user()?.id ??
        this.guessPromptGameService.get(LOCAL_STORAGE_KEYS.GUESS_PARTICIPANT_ID, gameId),
    );
  }

  private loadInviteRecipients(): void {
    if (!this.userState.isLoggedIn() || this.inviteRecipientsLoaded) return;

    this.inviteRecipientsLoaded = true;
    this.inviteRecipientsLoading.set(true);

    this.friendsService
      .apiFriendsGet()
      .pipe(finalize(() => this.inviteRecipientsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.inviteFriends.set(response.friends);
          this.inviteGroups.set(response.groups);
        },
        error: () => {
          this.inviteRecipientsLoaded = false;
          this.inviteMessage.set('Unable to load friends and groups.');
        },
      });
  }

  private rememberAnsweredRound(roundIndex: number): void {
    const gameId = this.gameId();
    if (gameId)
      this.guessPromptGameService.set(
        LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND,
        gameId,
        `${roundIndex}`,
      );
  }

  private wasRoundAnswered(roundIndex: number | null | undefined): boolean {
    const gameId = this.gameId();

    if (!gameId || roundIndex == null) return false;

    return (
      this.guessPromptGameService.get(LOCAL_STORAGE_KEYS.GUESS_ANSWERED_ROUND, gameId) ===
      `${roundIndex}`
    );
  }
}
