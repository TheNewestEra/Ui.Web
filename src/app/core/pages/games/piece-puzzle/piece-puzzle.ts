import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
  PuzzleWsTimeoutMessageTypeEnum,
  WsPresenceMessage,
  WsPresenceMessageTypeEnum,
  WsStatusMessage,
  WsStatusMessageTypeEnum,
} from '@thenewestera/puzzle-ng';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { UserStateService } from '@core/services/user-state.service';
import { PiecePuzzleSocketService } from '@core/services/piece-puzzle-socket.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/button/button';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';

@Component({
  selector: 'app-piece-puzzle',
  imports: [
    ErrorAlertComponent,
    PageLayoutComponent,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
  ],
  templateUrl: './piece-puzzle.html',
  styleUrl: './piece-puzzle.css',
})
export class PiecePuzzleGamePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly piecePuzzleService = inject(PiecePuzzleService);
  private readonly userStateService = inject(UserStateService);
  private readonly puzzleSocket = inject(PiecePuzzleSocketService);

  private timerInterval?: ReturnType<typeof setInterval>;

  private pendingMove: { cellA: number; cellB: number } | null = null;

  readonly PuzzleStatus = PuzzleStatus;

  private readonly destroyRef = inject(DestroyRef);

  readonly gameId = this.route.snapshot.paramMap.get('gameId');
  readonly game = signal<Puzzle | null>(null);
  game$ = toObservable(this.game);

  readonly puzzleImage = signal<string | null>(null);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedTile = signal<number | null>(null);
  readonly userColor = this.userStateService.color;
  readonly moving = signal(false);
  readonly solved = signal(false);

  readonly tileSelections = signal<ReadonlyMap<number, { player: string; color: string }>>(
    new Map(),
  );

  readonly gameEnded = computed(() => {
    const status = this.game()?.status;

    return status === PuzzleStatus.Solved || status === PuzzleStatus.Timeout;
  });

  readonly lobbyRemainingMs = signal(0);
  readonly remainingMs = signal(0);

  readonly formattedRemainingTime = computed(() => {
    return this.formatTime(this.remainingMs());
  });

  readonly formattedLobbyTime = computed(() => {
    return this.formatTime(this.lobbyRemainingMs());
  });

  readonly isHost = computed(() => {
    return !!sessionStorage.getItem(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_HOST_TOKEN);
  });

  constructor() {
    this.game$.subscribe((game) => {
      this.loadPuzzleImage(game!);
    });
  }

  ngOnInit(): void {
    if (!this.gameId) {
      this.errorMessage.set('Game not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(false);

    const alreadyJoined = !!sessionStorage.getItem(this.participantStorageKey('participantId'));
    const player = alreadyJoined ? undefined : this.userStateService.displayName();
    const color =
      alreadyJoined || this.userStateService.isLoggedIn() ? undefined : this.userColor();

    this.puzzleSocket.connect(this.gameId, player, color!);

    this.puzzleSocket.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      this.handleSocketMessage(message);
    });
    // TODO: When ws loses connection, show a toast message
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const imageUrl = this.puzzleImage();

    if (imageUrl) URL.revokeObjectURL(imageUrl);

    this.puzzleSocket.disconnect();
  }

  startGame(): void {
    if (!this.gameId) return;

    const hostToken =
      sessionStorage.getItem(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_HOST_TOKEN) ?? undefined;

    this.piecePuzzleService.puzzlesIdStartPost(this.gameId, { hostToken }).subscribe({
      error: (error) => {
        console.error('Unable to start puzzle', error);
      },
    });
  }

  getTilePosition(index: number, gridSize: number): string {
    const row = Math.floor(index / gridSize);
    const column = index % gridSize;

    const x = gridSize === 1 ? 0 : (column / (gridSize - 1)) * 100;

    const y = gridSize === 1 ? 0 : (row / (gridSize - 1)) * 100;

    return `${x}% ${y}%`;
  }

  selectTile(index: number): void {
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
        this.handleTimeout();
        break;

      case WsPresenceMessageTypeEnum.Presence:
        this.handlePresence(message);
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
    this.updateTimers(message);

    this.tileSelections.set(
      new Map(message.selections.map((s) => [s.cell, { player: s.player, color: s.color }])),
    );

    const myParticipantId = sessionStorage.getItem(this.participantStorageKey('participantId'));
    this.selectedTile.set(
      message.selections.find((s) => s.participantId === myParticipantId)?.cell ?? null,
    );

    this.game.set({
      id: message.id,
      theme: message.theme ?? '',
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
      score: message.score ?? 0,
      solvedBy: message.solvedBy ?? '',
      connectedPlayers: message.connectedPlayers,
      participants: message.participants,
      selections: message.selections,
    });
  }

  private handleMove(message: PuzzleWsMoveMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      const board = [...game.board];

      [board[message.cellA], board[message.cellB]] = [board[message.cellB], board[message.cellA]];

      return {
        ...game,
        board,
      };
    });

    this.clearTileSelections(message.cellA, message.cellB);

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
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        board: message.board,
        status: PuzzleStatus.Solved,
        score: message.score,
        solvedBy: message.solvedBy,
        remainingMs: message.remainingMs,
      };
    });

    this.pendingMove = null;
    this.moving.set(false);
    this.remainingMs.set(message.remainingMs);
    this.solved.set(true);
    this.tileSelections.set(new Map());
    this.stopTimer();
  }

  private handleTimeout(): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        status: PuzzleStatus.Timeout,
        remainingMs: 0,
        score: 0,
      };
    });

    this.pendingMove = null;
    this.moving.set(false);
    this.selectedTile.set(null);
    this.tileSelections.set(new Map());

    this.stopTimer();
  }

  /** Direct reply to our own `join` message (see `PiecePuzzleSocketService.
   * connect()`) — persists the participantId/token every later `move`/
   * `select` message must carry, scoped to this puzzle so they can't leak
   * into a different one played in the same browser session. */
  private handleJoinResult(message: PuzzleWsJoinResultMessage): void {
    sessionStorage.setItem(this.participantStorageKey('participantId'), message.participantId);
    sessionStorage.setItem(this.participantStorageKey('token'), message.token ?? '');
  }

  /** Direct reply to a rejected `join`/`move`/`select` message — the WS
   * equivalent of the 4xx bodies those actions used to return over HTTP.
   * There's no per-call `.subscribe({error})` to catch this on any more, so
   * it's handled centrally here instead. */
  private handleError(message: PuzzleWsErrorMessage): void {
    console.error(`Puzzle ${message.action} failed:`, message.error);

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

  private handleStatus(message: WsStatusMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        status: message.status as unknown as PuzzleStatus,
        error: message.error ?? '',
      };
    });
  }

  private loadPuzzleImage(game: Puzzle | null): void {
    if (game === null) return;

    if (game.status == PuzzleStatus.Queued) return;

    if (game.status == PuzzleStatus.Generating) return;

    // If there is an image already, it will NOT call the BE
    if (this.puzzleImage()) return;

    this.piecePuzzleService.puzzlesIdImageGet(this.gameId!).subscribe({
      next: (image: Blob) => {
        const imageUrl = URL.createObjectURL(image);
        this.puzzleImage.set(imageUrl);
      },

      error: (error) => {
        console.error('Failed to load puzzle image', error);
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

        if (next === 0) {
          this.stopTimer();
        }

        return next;
      });
    }, 1000);
  }

  private moveTiles(cellA: number, cellB: number): void {
    if (!this.gameId || this.moving()) return;

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
      participantId: sessionStorage.getItem(this.participantStorageKey('participantId')) ?? '',
      token: sessionStorage.getItem(this.participantStorageKey('token')) ?? undefined,
    });
  }

  private broadcastTileSelection(cell: number): void {
    if (!this.gameId) return;

    this.puzzleSocket.send({
      type: PuzzleWsSelectRequestTypeEnum.Select,
      cell,
      participantId: sessionStorage.getItem(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_PARTICIPANT_ID) ?? '',
      token: sessionStorage.getItem(LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN) ?? undefined,
    });
  }

  /** No `cell` to send — a participant only ever has one active selection,
   * so the server already knows which one to clear (see game-worker's
   * puzzle.model.ts `deselectTile()`) and broadcasts a `tile_deselected`
   * naming it back to every connected client, including us. */
  private broadcastTileDeselection(): void {
    if (!this.gameId) return;

    this.puzzleSocket.send({
      type: PuzzleWsDeselectRequestTypeEnum.Deselect,
      participantId: sessionStorage.getItem(this.participantStorageKey('participantId')) ?? '',
      token: sessionStorage.getItem(this.participantStorageKey('token')) ?? undefined,
    });
  }

  /** Scopes the anonymous-guest participant credentials to this puzzle's id
   * — a bare, unscoped key would leak one puzzle's participantId/token into
   * the next puzzle played in the same browser session. */
  private participantStorageKey(kind: 'participantId' | 'token'): string {
    const base =
      kind === 'participantId'
        ? LOCAL_STORAGE_KEYS.PIECE_PUZZLE_PARTICIPANT_ID
        : LOCAL_STORAGE_KEYS.PIECE_PUZZLE_TOKEN;

    return `${base}:${this.gameId}`;
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}
