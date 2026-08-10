import { Component, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GamesPost202Response, GuessThePromptService } from '@thenewestera/guess-ng';
import { finalize } from 'rxjs';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { ButtonComponent } from '@shared/components/button/button';
import { InputComponent } from '@shared/components/form/input/input';
import { JoinResult, PiecePuzzleService, PuzzlesPost202Response } from '@thenewestera/puzzle-ng';
import { SelectComponent, SelectOption } from '@shared/components/form/select/select';
import { Router } from '@angular/router';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';

@Component({
  selector: 'app-games',
  imports: [
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
    ErrorAlertComponent,
  ],
  templateUrl: './games.html',
  styleUrl: './games.css',
})
export class GamesPage {
  private readonly router = inject(Router);
  private readonly guessService = inject(GuessThePromptService);
  private readonly piecePuzzleService = inject(PiecePuzzleService);
  private readonly fb = inject(FormBuilder);

  readonly gridSizes: SelectOption[] = [
    {
      label: '3 × 3 (9 pieces)',
      value: '3',
    },
    {
      label: '4 × 4 (16 pieces)',
      value: '4',
    },
    {
      label: '5 × 5 (25 pieces)',
      value: '5',
    },
    {
      label: '6 × 6 (36 pieces)',
      value: '6',
    },
  ];

  readonly guessLoading = signal(false);
  readonly guessErrorMessage = signal<string | null>(null);
  readonly guessForm = this.fb.nonNullable.group({
    theme: [''],
  });

  readonly piecePuzzleLoading = signal(false);
  readonly piecePuzzleErrorMessage = signal<string | null>(null);
  readonly piecePuzzleForm = this.fb.nonNullable.group({
    theme: [''],
    gridSize: ['3', Validators.required],
  });

  guess(): void {
    if (this.guessLoading()) return;

    if (this.guessForm.invalid) {
      this.guessForm.markAllAsTouched();
      return;
    }

    const { theme } = this.guessForm.getRawValue();

    this.guessLoading.set(true);
    this.guessErrorMessage.set(null);

    this.guessService
      .gamesPost({ theme })
      .pipe(
        finalize(() => {
          this.guessLoading.set(false);
        }),
      )
      .subscribe({
        next: (response: GamesPost202Response) => {
          console.log(response.gameId);
        },

        error: (error) => {
          this.guessErrorMessage.set(
            error?.error?.error ?? 'Something went wrong. Please try again.',
          );
        },
      });
  }

  piecePuzzle(): void {
    if (this.piecePuzzleLoading()) return;

    if (this.piecePuzzleForm.invalid) {
      this.piecePuzzleForm.markAllAsTouched();
      return;
    }

    const { theme, gridSize } = this.piecePuzzleForm.getRawValue();

    this.piecePuzzleLoading.set(true);
    this.piecePuzzleErrorMessage.set(null);

    this.piecePuzzleService
      .puzzlesPost({ theme, gridSize: Number(gridSize) })
      .pipe(
        finalize(() => {
          this.piecePuzzleLoading.set(false);
        }),
      )
      .subscribe({
        next: (response: PuzzlesPost202Response) => {
          sessionStorage.setItem('piecePuzzleHostToken', response.hostToken);

          this.joinPuzzle(response.puzzleId, response.hostToken);

          this.router.navigate(['/games/piece-puzzle', response.puzzleId]);
        },

        error: (error) => {
          this.piecePuzzleErrorMessage.set(
            error?.error?.error ?? 'Something went wrong. Please try again.',
          );
        },
      });
  }

  private joinPuzzle(puzzleId: string, hostToken: string): void {
    this.piecePuzzleService.puzzlesIdJoinPost(puzzleId, { player: hostToken }).subscribe({
      next: (started: JoinResult) => {
        sessionStorage.setItem('participantId', started.participantId);
        sessionStorage.setItem('token', started.token ?? '');
      },

      error: (error) => {
        console.error('Failed to start puzzle', error);
      },
    });
  }
}
