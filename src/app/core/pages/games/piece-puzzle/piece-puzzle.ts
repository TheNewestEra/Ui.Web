import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  MoveResult,
  PiecePuzzleService,
  Puzzle,
  PuzzlesIdMovePostRequest,
  PuzzleStatus,
} from '@thenewestera/puzzle-ng';
import { IconComponent } from '@shared/ui/icon/icon';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { UserStateService } from '@core/services/user-state.service';
import { finalize } from 'rxjs';
import { PiecePuzzleSocketService } from '@core/services/piece-puzzle-socket.service';
import {
  PuzzleMoveMessage,
  PuzzlePresenceMessage,
  PuzzleSocketMessage,
  PuzzleSolvedMessage,
  PuzzleStateMessage,
  PuzzleStatusMessage,
} from '@core/models/piece-puzzle-socket.interface';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/button/button';

@Component({
  selector: 'app-piece-puzzle',
  imports: [
    IconComponent,
    ErrorAlertComponent,
    PageLayoutComponent,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
  ],
  templateUrl: './piece-puzzle.html',
  styleUrl: './piece-puzzle.css',
})
export class PiecePuzzleGamePage {
  private readonly route = inject(ActivatedRoute);
  private readonly piecePuzzleService = inject(PiecePuzzleService);
  private readonly userStateService = inject(UserStateService);
  private readonly puzzleSocket = inject(PiecePuzzleSocketService);

  private timerInterval?: ReturnType<typeof setInterval>;

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

  readonly isHost = signal(true); // TODO: fix this at some point

  constructor() {
    this.game$.subscribe((game) => {
      this.loadPuzzleImage(game);
      this.updateTimers(game);
    });
  }

  ngOnInit(): void {
    if (!this.gameId) {
      this.errorMessage.set('Game not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(false);
    this.puzzleSocket.connect(this.gameId);

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

    const hostToken = sessionStorage.getItem('piecePuzzleHostToken') ?? '';

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
      return;
    }

    if (selected === index) {
      this.selectedTile.set(null);
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

  private handleSocketMessage(message: PuzzleSocketMessage): void {
    switch (message.type) {
      case 'state':
        this.handleState(message);
        break;

      case 'status':
        this.handleStatus(message);
        break;

      case 'move':
        this.handleMove(message);
        break;

      case 'solved':
        this.handleSolved(message);
        break;

      case 'timeout':
        this.handleTimeout();
        break;

      case 'presence':
        this.handlePresence(message);
        break;
    }
  }

  private handleState(message: PuzzleStateMessage): void {
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
    });
  }

  private handleMove(message: PuzzleMoveMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      const board = [...game.board];

      [board[message.cellA], board[message.cellB]] = [board[message.cellB], board[message.cellA]];

      return {
        ...game,
        board,
      };
    });
  }

  private handleSolved(message: PuzzleSolvedMessage): void {
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

    this.selectedTile.set(null);

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

    this.selectedTile.set(null);

    this.stopTimer();
  }

  private handlePresence(message: PuzzlePresenceMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        connectedPlayers: message.connectedPlayers,
      };
    });
  }

  private handleStatus(message: PuzzleStatusMessage): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        status: message.status,
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

  private updateTimers(puzzle: Puzzle | null): void {
    if (puzzle === null) return;
    this.stopTimer();

    if (puzzle.status === PuzzleStatus.Waiting) {
      this.lobbyRemainingMs.set(puzzle.lobbyRemainingMs ?? 0);
      this.startLobbyTimer();
      return;
    }

    if (puzzle.status === PuzzleStatus.Playing) {
      this.remainingMs.set(puzzle.remainingMs ?? 0);
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

    const moveRequest: PuzzlesIdMovePostRequest = {
      cellA: cellA,
      cellB: cellB,
      participantId: sessionStorage.getItem('participantId') ?? '',
      token: sessionStorage.getItem('token') ?? '',
    };

    this.piecePuzzleService
      .puzzlesIdMovePost(this.gameId, moveRequest)
      .pipe(
        finalize(() => {
          this.moving.set(false);
        }),
      )
      .subscribe({
        next: (moveResponse: MoveResult) => {
          this.updateBoard(moveResponse);
          this.selectedTile.set(null);
        },

        error: (error) => {
          console.error('Failed to move tiles', error);
        },
      });
  }

  private updateBoard(response: MoveResult): void {
    this.game.update((game) => {
      if (!game) return game;

      return {
        ...game,
        board: response.board,
        score: response.score,
        status: response.status,
      };
    });

    this.solved.set(response.solved);

    if (this.gameEnded()) this.stopTimer();
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}
