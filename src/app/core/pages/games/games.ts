import { Component, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { ButtonComponent } from '@shared/components/button/button';
import { InputComponent } from '@shared/components/form/input/input';
import { SelectComponent, SelectOption } from '@shared/components/form/select/select';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { GuessPromptGameService } from '@core/services/guess-prompt-game.service';
import { PiecePuzzleGameService } from '@core/services/piece-puzzle-game.service';

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
  private readonly guessPromptGameService = inject(GuessPromptGameService);
  private readonly piecePuzzleGameService = inject(PiecePuzzleGameService);
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

  // Resolving https://github.com/TheNewestEra/Ui.Web/pull/57/changes#r3790122343
  // These are seconds
  readonly puzzleTimeLimits: SelectOption[] = [
    {
      label: '1 minute',
      value: '60',
    },
    {
      label: '2 minutes',
      value: '120',
    },
    {
      label: '3 minutes',
      value: '180',
    },
    {
      label: '5 minutes',
      value: '300',
    },
    {
      label: '10 minutes',
      value: '600',
    },
  ];

  readonly roundCounts: SelectOption[] = [
    {
      label: '3 rounds',
      value: '3',
    },
    {
      label: '5 rounds',
      value: '5',
    },
    {
      label: '8 rounds',
      value: '8',
    },
  ];

  readonly roundTimeLimits: SelectOption[] = [
    {
      label: '15 seconds',
      value: '15',
    },
    {
      label: '30 seconds',
      value: '30',
    },
    {
      label: '45 seconds',
      value: '45',
    },
    {
      label: '60 seconds',
      value: '60',
    },
    {
      label: '90 seconds',
      value: '90',
    },
  ];

  readonly guessLoading = signal(false);
  readonly guessErrorMessage = signal<string | null>(null);
  readonly guessForm = this.fb.nonNullable.group({
    theme: [''],
    roundCount: ['5', Validators.required],
    roundTimeLimitSeconds: ['45', Validators.required],
  });

  readonly piecePuzzleLoading = signal(false);
  readonly piecePuzzleErrorMessage = signal<string | null>(null);
  readonly piecePuzzleForm = this.fb.nonNullable.group({
    theme: [''],
    gridSize: ['3', Validators.required],
    timeLimitSeconds: ['180', Validators.required],
  });

  guessPrompt(): void {
    if (this.guessLoading()) return;

    if (this.guessForm.invalid) {
      this.guessForm.markAllAsTouched();
      return;
    }

    const { theme, roundCount, roundTimeLimitSeconds } = this.guessForm.getRawValue();

    this.guessLoading.set(true);
    this.guessErrorMessage.set(null);

    this.guessPromptGameService
      .start(theme, Number(roundCount), Number(roundTimeLimitSeconds))
      .pipe(
        finalize(() => {
          this.guessLoading.set(false);
        }),
      )
      .subscribe({
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

    const { theme, gridSize, timeLimitSeconds } = this.piecePuzzleForm.getRawValue();

    this.piecePuzzleLoading.set(true);
    this.piecePuzzleErrorMessage.set(null);

    this.piecePuzzleGameService
      .create(theme, Number(gridSize), Number(timeLimitSeconds))
      .pipe(
        finalize(() => {
          this.piecePuzzleLoading.set(false);
        }),
      )
      .subscribe({
        error: (error) => {
          this.piecePuzzleErrorMessage.set(
            error?.error?.error ?? 'Something went wrong. Please try again.',
          );
        },
      });
  }
}
