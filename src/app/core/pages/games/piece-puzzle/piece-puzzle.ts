import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  PiecePuzzleService,
  Puzzle,
  PuzzleStatus,
  PuzzleWsDeselectRequestTypeEnum,
  PuzzleWsErrorMessage,
  PuzzleWsErrorMessageActionEnum,
  PuzzleWsErrorMessageTypeEnum,
  PuzzleWsJoinResultMessage,
  PuzzleWsJoinResultMessageTypeEnum,
  PuzzleWsMessage,
  PuzzleWsMoveMessage,
  PuzzleWsMoveMessageTypeEnum,
  PuzzleWsMoveRequestTypeEnum,
  PuzzleWsSelectRequestTypeEnum,
  PuzzleWsSolvedMessage,
  PuzzleWsSolvedMessageTypeEnum,
  PuzzleWsStateMessage,
  PuzzleWsStateMessageTypeEnum,
  PuzzleWsTileDeselectedMessage,
  PuzzleWsTileDeselectedMessageTypeEnum,
  PuzzleWsTileSelectedMessage,
  PuzzleWsTileSelectedMessageTypeEnum,
  PuzzleWsTimeoutMessage,
  PuzzleWsTimeoutMessageTypeEnum,
  WsPresenceMessage,
  WsPresenceMessageTypeEnum,
  WsPlayerJoinedMessage,
  WsPlayerJoinedMessageTypeEnum,
  WsStatusMessage,
  WsStatusMessageTypeEnum,
} from '@thenewestera/puzzle-ng';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { SuccessAlertComponent } from '@shared/components/alert/success/success';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { UserStateService } from '@core/services/user-state.service';
import { PiecePuzzleSocketService } from '@core/services/piece-puzzle-socket.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/button/button';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { PiecePuzzleGameService } from '@core/services/piece-puzzle-game.service';
import { IconComponent } from '@shared/ui/icon/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { distinctUntilChanged, filter, finalize, map, Observable } from 'rxjs';
import {
  ApiInvitesPostRequestKindEnum,
  FriendSummary,
  FriendsService,
  GroupSummary,
  InvitesService,
} from '@thenewestera/friends-ng';
import {
  LeaderboardComponent,
  LeaderboardDisplayEntry,
} from '@core/components/leaderboard/leaderboard';
import { GameRatingComponent } from '@core/components/game-rating/game-rating';
import { SoundService } from '@shared/services/sound.service';

@Component({
  selector: 'app-piece-puzzle',
  imports: [
    ErrorAlertComponent,
    SuccessAlertComponent,
    PageLayoutComponent,
    PageHeaderComponent,
    ButtonComponent,
    IconComponent,
    ReactiveFormsModule,
    KeyValuePipe,
    LeaderboardComponent,
    GameRatingComponent,
  ],
  templateUrl: './piece-puzzle.html',
  styleUrl: './piece-puzzle.css',
})
export class PiecePuzzleGamePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly piecePuzzleService = inject(PiecePuzzleService);
  private readonly piecePuzzleGameService = inject(PiecePuzzleGameService);
  private readonly puzzleSocket = inject(PiecePuzzleSocketService);
  private readonly friendsService = inject(FriendsService);
  private readonly invitesService = inject(InvitesService);
  readonly userState = inject(UserStateService);
  private readonly sound = inject(SoundService);

  readonly PuzzleStatus = PuzzleStatus;
  readonly isLoggedIn = this.userState.isLoggedIn;

  readonly gameId = signal<string | null>(null);
  readonly game = signal<Puzzle | null>(null);
  game$ = toObservable(this.game);

  readonly puzzleImage = signal<string | null>(null);

  readonly loading = signal(true);
  readonly imageLoading = signal(true);
  readonly joining = signal(false);
  readonly starting = signal(false);
  readonly replaying = signal(false);
  readonly regenerating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly joinErrorMessage = signal<string | null>(null);
  readonly shareMessage = signal<string | null>(null);
  readonly inviteMessage = signal<string | null>(null);
  readonly inviteLoading = signal(false);
  readonly inviteRecipientsLoading = signal(false);
  readonly inviteFriends = signal<FriendSummary[]>([]);
  readonly inviteGroups = signal<GroupSummary[]>([]);
  readonly inviteTarget = new FormControl('', { nonNullable: true });
  private inviteRecipientsLoaded = false;
  private joinOnNextConnection = false;

  readonly selectedTile = signal<number | null>(null);
  readonly participantId = signal<string | null>(null);
  readonly joinedPlayerName = signal<string | null>(null);
  readonly moving = signal(false);
  readonly solved = signal(false);

  readonly tileSelections = signal<ReadonlyMap<number, { player: string; color: string }>>(
    new Map(),
  );
  readonly lastMoves = signal<ReadonlyMap<string, { cellA: number; cellB: number; color: string }>>(
    new Map(),
  );

  readonly gameEnded = computed(() => {
    const status = this.game()?.status;

    return status === PuzzleStatus.Solved || status === PuzzleStatus.Timeout;
  });

  private timerInterval?: ReturnType<typeof setInterval>;

  private pendingMove: { cellA: number; cellB: number } | null = null;

  readonly lobbyRemainingMs = signal(0);
  readonly remainingMs = signal(0);

  readonly formattedRemainingTime = computed(() => {
    return this.formatTime(this.remainingMs());
  });

  readonly formattedLobbyTime = computed(() => {
    return this.formatTime(this.lobbyRemainingMs());
  });

  readonly isHost = computed(() => {
    const gameId = this.gameId();
    return (
      !!gameId &&
      !!this.piecePuzzleGameService.get(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_HOST_TOKEN, gameId)
    );
  });

  readonly hasJoined = computed(() => {
    const participantId = this.participantId();

    if (this.joinedPlayerName()) return true;

    return (
      !!participantId &&
      !!this.game()?.participants.some((participant) => participant.id === participantId)
    );
  });

  readonly isSpectator = computed(
    () => this.game()?.status !== PuzzleStatus.Waiting && !this.hasJoined(),
  );

  readonly canMove = computed(
    () =>
      this.game()?.status === PuzzleStatus.Playing &&
      this.hasJoined() &&
      !this.moving() &&
      !!this.puzzleImage(),
  );

  readonly leaderboardEntries = computed<LeaderboardDisplayEntry[]>(() => {
    const game = this.game();

    if (!game) return [];

    const scores = new Map(game.results.map((result) => [result.participantId, result.score]));
    const entries = game.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      color: participant.color,
      score: scores.get(participant.id) ?? 0,
    }));

    for (const result of game.results) {
      if (entries.some(({ id }) => id === result.participantId)) continue;

      const participant = game.participants.find(
        (candidate) => candidate.id === result.participantId,
      );

      entries.push({
        id: result.participantId,
        name: participant?.name ?? 'Unknown player',
        color: participant?.color ?? 'transparent',
        score: result.score,
      });
    }

    return entries
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  });

  readonly currentParticipant = computed(() => {
    return this.game()?.participants.find(
      (participant) =>
        participant.id === this.participantId() || participant.name === this.joinedPlayerName(),
    );
  });

  readonly participantColor = computed(() => this.currentParticipant()?.color ?? null);

  readonly currentPlayerScore = computed(() => {
    const currentParticipant = this.currentParticipant();
    if (!currentParticipant) return 0;

    return (
      this.game()?.results.find(({ participantId }) => participantId === currentParticipant.id)
        ?.score ?? 0
    );
  });

  constructor() {
    this.game$.subscribe((game) => {
      this.loadPuzzleImage(game!);
    });
  }

  ngOnInit(): void {
    this.puzzleSocket.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      this.handleSocketMessage(message);
    });

    this.puzzleSocket.errors.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      this.errorMessage.set(message);
    });

    this.route.paramMap
      .pipe(
        map((params) => params.get('gameId')),
        filter((gameId): gameId is string => !!gameId),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((gameId) => this.initializeGame(gameId));
  }

  private initializeGame(gameId: string): void {
    this.stopTimer();

    const previousImage = this.puzzleImage();
    if (previousImage) URL.revokeObjectURL(previousImage);

    this.gameId.set(gameId);
    this.game.set(null);
    this.puzzleImage.set(null);
    this.loading.set(true);
    this.imageLoading.set(true);
    this.errorMessage.set(null);
    this.joinErrorMessage.set(null);
    this.shareMessage.set(null);
    this.inviteMessage.set(null);
    this.inviteTarget.reset();
    this.inviteFriends.set([]);
    this.inviteGroups.set([]);
    this.inviteRecipientsLoaded = false;
    this.selectedTile.set(null);
    this.joinedPlayerName.set(null);
    this.tileSelections.set(new Map());
    this.lastMoves.set(new Map());
    this.pendingMove = null;
    this.moving.set(false);
    this.solved.set(false);
    this.lobbyRemainingMs.set(0);
    this.remainingMs.set(0);
    this.refreshPlayerIdentity();

    const joinOnOpen = this.joinOnNextConnection;
    this.joinOnNextConnection = false;
    const player =
      joinOnOpen && !this.userState.isLoggedIn() ? this.userState.displayName() : undefined;
    const color =
      joinOnOpen && !this.userState.isLoggedIn()
        ? (this.userState.color() ?? undefined)
        : undefined;

    this.puzzleSocket.connect(gameId, player, color, joinOnOpen);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const imageUrl = this.puzzleImage();

    if (imageUrl) URL.revokeObjectURL(imageUrl);

    this.puzzleSocket.disconnect();
  }

  startGame(): void {
    const gameId = this.gameId();

    if (!gameId || !this.isHost() || this.starting()) return;

    const hostToken =
      this.piecePuzzleGameService.get(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_HOST_TOKEN, gameId) ??
      undefined;

    this.starting.set(true);
    this.errorMessage.set(null);

    this.piecePuzzleService
      .puzzlesIdStartPost(gameId, { hostToken })
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'Unable to start the puzzle.');
        },
      });
  }

  joinGame(): void {
    const gameId = this.gameId();

    if (
      !gameId ||
      this.game()?.status !== PuzzleStatus.Waiting ||
      this.hasJoined() ||
      this.joining()
    )
      return;

    this.joining.set(true);
    this.errorMessage.set(null);
    this.joinErrorMessage.set(null);

    const player = this.userState.isLoggedIn() ? undefined : this.userState.displayName();
    const color = this.userState.isLoggedIn() ? undefined : (this.userState.color() ?? undefined);

    if (!this.puzzleSocket.join(player, color)) {
      this.joining.set(false);
      this.errorMessage.set('The game connection is not ready. Please try again.');
    }
  }

  async shareGame(): Promise<void> {
    const url = window.location.href;

    this.shareMessage.set(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Piece Puzzle game',
          text: 'Join my Piece Puzzle game before it starts.',
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

    if (!gameId || this.game()?.status !== PuzzleStatus.Waiting || !target) return;

    const [targetType, targetId] = target.split(':', 2);

    if (!targetId) return;

    this.inviteLoading.set(true);
    this.inviteMessage.set(null);

    this.invitesService
      .apiInvitesPost({
        kind: ApiInvitesPostRequestKindEnum.Puzzle,
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

  private executeGameResetAction(
    actionFn: (id: string) => Observable<void>,
    loadingSignal: WritableSignal<boolean>,
    defaultErrorMessage: string,
  ): void {
    const gameId = this.gameId();

    if (!gameId || loadingSignal() || !this.gameEnded()) return;

    loadingSignal.set(true);
    this.errorMessage.set(null);

    actionFn(gameId)
      .pipe(finalize(() => loadingSignal.set(false)))
      .subscribe({
        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? defaultErrorMessage);
        },
      });
  }

  replayGame(): void {
    this.executeGameResetAction(
      (id) => this.piecePuzzleGameService.replay(id),
      this.replaying,
      'Unable to restart the puzzle.',
    );
  }

  regenerateGame(): void {
    this.executeGameResetAction(
      (id) => this.piecePuzzleGameService.regenerate(id),
      this.regenerating,
      'Unable to regenerate the puzzle.',
    );
  }

  getTilePosition(index: number, gridSize: number): string {
    const row = Math.floor(index / gridSize);
    const column = index % gridSize;

    const x = gridSize === 1 ? 0 : (column / (gridSize - 1)) * 100;

    const y = gridSize === 1 ? 0 : (row / (gridSize - 1)) * 100;

    return `${x}% ${y}%`;
  }

  selectTile(index: number): void {
    if (!this.canMove()) return;

    const selected = this.selectedTile();

    if (selected === null) {
      this.selectedTile.set(index);
      this.broadcastTileSelection(index);
      return;
    }

    if (selected === index) {
      this.selectedTile.set(null);
      this.broadcastTileDeselection();
      return;
    }

    this.moveTiles(selected, index);
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private playCountdownSound(milliseconds: number): void {
    if (milliseconds > 0 && milliseconds <= 5000) this.sound.countdown();
  }

  private handleSocketMessage(message: PuzzleWsMessage): void {
    switch (message.type) {
      case PuzzleWsStateMessageTypeEnum.State:
        this.handleState(message);
        break;

      case WsStatusMessageTypeEnum.Status:
        this.handleStatus(message);
        break;

      case PuzzleWsMoveMessageTypeEnum.Move:
        this.handleMove(message);
        break;

      case PuzzleWsSolvedMessageTypeEnum.Solved:
        this.handleSolved(message);
        break;

      case PuzzleWsTimeoutMessageTypeEnum.Timeout:
        this.handleTimeout(message);
        break;

      case WsPresenceMessageTypeEnum.Presence:
        this.handlePresence(message);
        break;

      case WsPlayerJoinedMessageTypeEnum.PlayerJoined:
        this.handlePlayerJoined(message);
        break;

      case PuzzleWsTileSelectedMessageTypeEnum.TileSelected:
        this.handleTileSelected(message);
        break;

      case PuzzleWsTileDeselectedMessageTypeEnum.TileDeselected:
        this.handleTileDeselected(message);
        break;

      case PuzzleWsJoinResultMessageTypeEnum.JoinResult:
        this.handleJoinResult(message);
        break;

      case PuzzleWsErrorMessageTypeEnum.Error:
        this.handleError(message);
        break;
    }
  }

  /** A full state snapshot, sent on connect and after any status-changing
   * action — including `message.selections`, which is how a reconnecting
   * client (e.g. a page refresh mid-game) restores the live "who's about to
   * move what" picture instead of just missing whatever it wasn't connected
   * to see broadcast live. Rebuilt from scratch every time rather than
   * merged with whatever was already in `tileSelections`, since this is a
   * full snapshot and the previous local state might be stale (e.g. this is
   * the very first message after connecting). */
  private handleState(message: PuzzleWsStateMessage): void {
    const previousStatus = this.game()?.status;

    this.updateTimers(message);

    this.tileSelections.set(
      new Map(message.selections.map((s) => [s.cell, { player: s.player, color: s.color }])),
    );

    const myParticipantId = this.participantId();
    this.selectedTile.set(
      message.selections.find((s) => s.participantId === myParticipantId)?.cell ?? null,
    );

    this.game.set({
      id: message.id,
      theme: message.theme ?? '',
      themeGenerated: message.themeGenerated,
      prompt: message.prompt ?? '',
      status: message.status,
      error: message.error ?? '',
      gridSize: message.gridSize,
      board: message.board,
      timeLimitMs: message.timeLimitMs,
      startedAt: message.startedAt ?? 0,
      remainingMs: message.remainingMs ?? 0,
      lobbyRemainingMs: message.lobbyRemainingMs ?? 0,
      endedAt: message.endedAt ?? 0,
      solvedBy: message.solvedBy ?? '',
      connectedPlayers: message.connectedPlayers,
      participants: message.participants,
      selections: message.selections,
      results: message.results,
    });

    if (
      previousStatus != null &&
      previousStatus !== PuzzleStatus.Playing &&
      message.status === PuzzleStatus.Playing
    ) {
      this.sound.gameStarted();
    }

    this.loading.set(false);
    this.errorMessage.set(null);

    if (message.status === PuzzleStatus.Waiting) this.loadInviteRecipients();
  }

  private handleMove(message: PuzzleWsMoveMessage): void {
    if (message.score != null) this.sound.score();

    this.game.update((game) => {
      if (!game) return game;

      const board = [...game.board];

      [board[message.cellA], board[message.cellB]] = [board[message.cellB], board[message.cellA]];

      return {
        ...game,
        board,
        results:
          message.score == null ? game.results : this.addMoveScore(game, message.by, message.score),
      };
    });

    this.clearTileSelections(message.cellA, message.cellB);
    this.lastMoves.update((moves) => {
      const next = new Map(moves);
      next.set(message.by, {
        cellA: message.cellA,
        cellB: message.cellB,
        color: message.color,
      });
      return next;
    });

    // This broadcast reaches every connected client, including whoever sent
    // the move — that's how the sender learns their own move succeeded now
    // that there's no direct request/response for a WS send.
    if (
      this.pendingMove &&
      this.pendingMove.cellA === message.cellA &&
      this.pendingMove.cellB === message.cellB
    ) {
      this.pendingMove = null;
      this.moving.set(false);
      this.selectedTile.set(null);
    }
  }

  private handleSolved(message: PuzzleWsSolvedMessage): void {
    if (this.isCurrentPlayerWinner(message.results)) this.sound.victory();
    else this.sound.complete();
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        board: message.board,
        status: PuzzleStatus.Solved,
        solvedBy: message.solvedBy,
        remainingMs: message.remainingMs,
        results: message.results,
      };
    });

    this.pendingMove = null;
    this.moving.set(false);
    this.remainingMs.set(message.remainingMs);
    this.solved.set(true);
    this.tileSelections.set(new Map());
    this.stopTimer();
    this.clearParticipantCredentials(false);
  }

  private addMoveScore(game: Puzzle, playerName: string, score: number): Puzzle['results'] {
    const participant = game.participants.find(({ name }) => name === playerName);
    if (!participant) return game.results;

    const existingResult = game.results.find(
      ({ participantId }) => participantId === participant.id,
    );

    if (!existingResult) {
      return [...game.results, { participantId: participant.id, score }];
    }

    return game.results.map((result) =>
      result.participantId === participant.id ? { ...result, score: result.score + score } : result,
    );
  }

  private isCurrentPlayerWinner(results: Puzzle['results']): boolean {
    const participantId = this.participantId();
    if (!participantId || !results.length) return false;

    const highestScore = Math.max(...results.map(({ score }) => score));
    return results.some(
      (result) => result.participantId === participantId && result.score === highestScore,
    );
  }

  private handleTimeout(message: PuzzleWsTimeoutMessage): void {
    this.sound.timeout();
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        status: PuzzleStatus.Timeout,
        remainingMs: 0,
        results: message.results,
      };
    });

    this.pendingMove = null;
    this.moving.set(false);
    this.selectedTile.set(null);
    this.tileSelections.set(new Map());

    this.stopTimer();
    this.clearParticipantCredentials(false);
  }

  /** Persists the credentials every later move/select message must carry. */
  private handleJoinResult(message: PuzzleWsJoinResultMessage): void {
    const gameId = this.gameId();
    if (gameId)
      this.piecePuzzleGameService.storeParticipant(gameId, message.participantId, message.token);
    this.participantId.set(message.participantId);
    this.joinedPlayerName.set(this.userState.displayName());
    this.joining.set(false);
    this.joinErrorMessage.set(null);

    this.game.update((game) => {
      if (!game) return game;

      const playerName = this.userState.displayName();
      const participantIndex = game.participants.findIndex(
        ({ id, name }) => id === message.participantId || name === playerName,
      );

      if (participantIndex === -1) return game;

      const participants = [...game.participants];
      participants[participantIndex] = {
        ...participants[participantIndex],
        id: message.participantId,
        color: message.color,
      };

      return { ...game, participants };
    });
  }

  /** Direct reply to a rejected `join`/`move`/`select` message — the WS
   * equivalent of the 4xx bodies those actions used to return over HTTP.
   * There's no per-call `.subscribe({error})` to catch this on any more, so
   * it's handled centrally here instead. */
  private handleError(message: PuzzleWsErrorMessage): void {
    if (message.action === PuzzleWsErrorMessageActionEnum.Join) {
      this.joining.set(false);
      this.joinedPlayerName.set(null);
      this.joinErrorMessage.set(message.error || 'Unable to join the puzzle.');
      return;
    }

    this.errorMessage.set(message.error || 'Unable to update the puzzle.');

    if (message.action === PuzzleWsErrorMessageActionEnum.Move) {
      this.pendingMove = null;
      this.moving.set(false);
    }
  }

  private handleTileSelected(message: PuzzleWsTileSelectedMessage): void {
    this.tileSelections.update((selections) => {
      const next = new Map(selections);
      next.set(message.cell, { player: message.player, color: message.color });
      return next;
    });
  }

  /** The flip side of `handleTileSelected` — see `broadcastTileDeselection()`
   * for when this fires for our own deselect. Also clears `selectedTile` if
   * it names the cell we think *we* currently have selected: normally a
   * no-op (we already cleared it locally before broadcasting), but it keeps
   * a second tab on the same participant in sync too, since a participant
   * only ever has one active selection server-side. */
  private handleTileDeselected(message: PuzzleWsTileDeselectedMessage): void {
    this.tileSelections.update((selections) => {
      if (!selections.has(message.cell)) return selections;

      const next = new Map(selections);
      next.delete(message.cell);
      return next;
    });

    if (this.selectedTile() === message.cell) {
      this.selectedTile.set(null);
    }
  }

  private clearTileSelections(...cells: number[]): void {
    this.tileSelections.update((selections) => {
      if (!cells.some((cell) => selections.has(cell))) return selections;

      const next = new Map(selections);
      for (const cell of cells) next.delete(cell);
      return next;
    });
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

      const existingParticipant = game.participants.find(
        (participant) =>
          (!!message.participantId && participant.id === message.participantId) ||
          participant.name === message.name,
      );

      if (existingParticipant) return game;

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

  private handleStatus(message: WsStatusMessage): void {
    const previousStatus = this.game()?.status;
    const status = message.status as unknown as PuzzleStatus;

    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        status,
        error: message.error ?? '',
      };
    });

    if (status === PuzzleStatus.Playing && previousStatus !== PuzzleStatus.Playing) {
      this.sound.gameStarted();
    }
  }

  private loadPuzzleImage(game: Puzzle | null): void {
    if (game === null) return;

    if (game.status == PuzzleStatus.Queued) return;

    if (game.status == PuzzleStatus.Generating) return;

    // If there is an image already, it will NOT call the BE
    if (this.puzzleImage()) return;

    this.imageLoading.set(true);

    const gameId = this.gameId();
    if (!gameId) return;

    this.piecePuzzleService
      .puzzlesIdImageGet(gameId)
      .pipe(finalize(() => this.imageLoading.set(false)))
      .subscribe({
        next: (image: Blob) => {
          const imageUrl = URL.createObjectURL(image);
          this.puzzleImage.set(imageUrl);
        },

        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'Unable to load the puzzle image.');
        },
      });
  }

  private updateTimers(puzzleStateMessage: PuzzleWsStateMessage): void {
    this.stopTimer();

    if (puzzleStateMessage.status === PuzzleStatus.Waiting) {
      this.lobbyRemainingMs.set(puzzleStateMessage.lobbyRemainingMs ?? 0);
      this.startLobbyTimer();
      return;
    }

    if (puzzleStateMessage.status === PuzzleStatus.Playing) {
      this.remainingMs.set(puzzleStateMessage.remainingMs ?? 0);
      this.startGameTimer();
      return;
    }

    this.lobbyRemainingMs.set(0);
    this.remainingMs.set(0);
  }

  private startLobbyTimer(): void {
    this.stopTimer();

    this.timerInterval = setInterval(() => {
      this.lobbyRemainingMs.update((value) => {
        const next = Math.max(0, value - 1000);
        this.playCountdownSound(next);

        if (next === 0) {
          this.stopTimer();
        }

        return next;
      });
    }, 1000);
  }

  private startGameTimer(): void {
    this.stopTimer();

    this.timerInterval = setInterval(() => {
      this.remainingMs.update((value) => {
        const next = Math.max(0, value - 1000);
        this.playCountdownSound(next);

        if (next === 0) {
          this.stopTimer();
        }

        return next;
      });
    }, 1000);
  }

  private moveTiles(cellA: number, cellB: number): void {
    if (!this.gameId() || !this.canMove()) return;

    this.moving.set(true);
    this.pendingMove = { cellA, cellB };

    // `moving` and `selectedTile` clear once this move's own broadcast
    // comes back (see `handleMove()`) or it's rejected (see `handleError()`)
    // — there's no direct reply to a WS send the way there was for the old
    // POST /puzzles/:id/move's response.
    this.puzzleSocket.send({
      type: PuzzleWsMoveRequestTypeEnum.Move,
      cellA,
      cellB,
      participantId: this.participantId() ?? '',
      token:
        this.piecePuzzleGameService.get(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN, this.gameId()!) ??
        undefined,
    });
  }

  private broadcastTileSelection(cell: number): void {
    if (!this.gameId() || !this.canMove()) return;

    this.puzzleSocket.send({
      type: PuzzleWsSelectRequestTypeEnum.Select,
      cell,
      participantId: this.participantId() ?? '',
      token:
        this.piecePuzzleGameService.get(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN, this.gameId()!) ??
        undefined,
    });
  }

  /** No `cell` to send — a participant only ever has one active selection,
   * so the server already knows which one to clear (see game-worker's
   * puzzle.model.ts `deselectTile()`) and broadcasts a `tile_deselected`
   * naming it back to every connected client, including us. */
  private broadcastTileDeselection(): void {
    if (!this.gameId() || !this.hasJoined()) return;

    this.puzzleSocket.send({
      type: PuzzleWsDeselectRequestTypeEnum.Deselect,
      participantId: this.participantId() ?? '',
      token:
        this.piecePuzzleGameService.get(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN, this.gameId()!) ??
        undefined,
    });
  }

  private refreshPlayerIdentity(): void {
    const gameId = this.gameId();
    if (!gameId) return;
    this.piecePuzzleGameService.clearIfExpired(gameId);
    this.participantId.set(
      this.userState.user()?.id ??
        this.piecePuzzleGameService.get(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_PARTICIPANT_ID, gameId),
    );
  }

  private clearParticipantCredentials(clearCurrentIdentity = true): void {
    const gameId = this.gameId();
    if (gameId) this.piecePuzzleGameService.clear(gameId);

    if (clearCurrentIdentity) this.participantId.set(null);
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

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}
