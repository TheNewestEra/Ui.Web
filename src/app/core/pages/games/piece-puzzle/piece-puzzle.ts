import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  JoinResult,
  MoveResult,
  Ok,
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

  readonly PuzzleStatus = PuzzleStatus;

  readonly gameId = this.route.snapshot.paramMap.get('gameId');
  readonly game = signal<Puzzle | null>(null);
  readonly puzzleImage = signal<string | null>(null);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedTile = signal<number | null>(null);
  readonly userColor = this.userStateService.color;
  readonly moving = signal(false);
  readonly solved = signal(false);

  // Participant details
  participantId: string | null = null;
  token: string | null = null;

  readonly gameEnded = computed(() => {
    const status = this.game()?.status;

    return status === PuzzleStatus.Solved || status === PuzzleStatus.Timeout;
  });

  private timerInterval?: ReturnType<typeof setInterval>;
  readonly remainingMs = signal(0);

  ngOnInit(): void {
    if (!this.gameId) {
      this.errorMessage.set('Game not found.');
      this.loading.set(false);
      return;
    }

    this.loadGame();
    // TODO: When ws loses connection, show a toast message
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const imageUrl = this.puzzleImage();

    if (imageUrl) URL.revokeObjectURL(imageUrl);
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

  loadGame(): void {
    if (this.gameId == null) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.piecePuzzleService.puzzlesIdGet(this.gameId).subscribe({
      next: (game: Puzzle) => {
        console.log(game);
        this.remainingMs.set(game.remainingMs ?? 0);

        this.game.set(game);
        this.loadPuzzleImage(game);
        this.startTimer();
        this.loading.set(false);

        this.joinPuzzle(game);
      },

      error: (error) => {
        console.error(error);

        this.errorMessage.set(error?.error?.error ?? 'Unable to load the game.');

        this.loading.set(false);
      },
    });
  }

  private joinPuzzle(game: Puzzle): void {
    if (game.status === PuzzleStatus.Waiting) {
      const hostToken = sessionStorage.getItem('piecePuzzleHostToken') ?? '';

      this.piecePuzzleService.puzzlesIdJoinPost(this.gameId!, { player: hostToken }).subscribe({
        next: (started: JoinResult) => {
          // TODO: Save the stuff...
          this.participantId = started.participantId;
          this.token = started.token;
        },

        error: (error) => {
          console.error('Failed to start puzzle', error);
        },
      });
    }
  }

  private loadPuzzleImage(game: Puzzle): void {
    if (game.status == PuzzleStatus.Queued) return;

    if (game.status == PuzzleStatus.Generating) return;

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

  private moveTiles(cellA: number, cellB: number): void {
    if (!this.gameId || this.moving()) return;

    this.moving.set(true);

    const moveRequest: PuzzlesIdMovePostRequest = {
      cellA: cellA,
      cellB: cellB,
      participantId: this.participantId!,
      token: this.token!,
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

  private startTimer(): void {
    this.stopTimer();

    this.timerInterval && clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const remaining = this.remainingMs();

      if (remaining <= 0) {
        this.remainingMs.set(0);
        this.timerInterval && clearInterval(this.timerInterval);
        return;
      }

      this.remainingMs.update((value) => Math.max(0, value - 1000));
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}
