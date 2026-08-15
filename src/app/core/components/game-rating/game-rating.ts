import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import { BrowseService } from '@thenewestera/browse-ng';
import { CardComponent } from '@shared/components/card/card';
import { UserStateService } from '@core/services/user-state.service';
import { LOCAL_STORAGE_KEYS } from '@core/constants/local-storage-keys.constants';
import { SuccessAlertComponent } from '@shared/components/alert/success/success';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';
import { SoundService } from '@shared/services/sound.service';

@Component({
  selector: 'app-game-rating',
  imports: [CardComponent, SuccessAlertComponent, ErrorAlertComponent],
  templateUrl: './game-rating.html',
  styleUrl: './game-rating.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameRatingComponent {
  private readonly browseService = inject(BrowseService);
  private readonly userState = inject(UserStateService);
  private readonly sound = inject(SoundService);

  readonly gameType = input.required<'puzzle' | 'guess'>();
  readonly gameId = input.required<string>();
  readonly heading = input('Rate this game');
  readonly subtitle = input('What did you think? Your rating helps others find great games.');

  readonly stars = [1, 2, 3, 4, 5];

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly submittedStars = signal<number | null>(null);

  readonly hasRated = computed(() => this.submittedStars() !== null);
  readonly displayedStars = computed(() => this.submittedStars() ?? 0);

  constructor() {
    effect(() => {
      const stored = localStorage.getItem(this.storageKey());

      this.submittedStars.set(stored ? Number(stored) : null);
      this.submitting.set(false);
      this.errorMessage.set(null);
    });
  }

  rate(stars: number): void {
    if (this.hasRated() || this.submitting()) return;

    const gameId = this.gameId();

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.browseService
      .apiCatalogIdRatePost(gameId, { stars, rater: this.userState.displayName() })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.submittedStars.set(stars);
          this.sound.rated();

          localStorage.setItem(this.storageKey(), `${stars}`);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'Unable to submit your rating.');
        },
      });
  }

  private storageKey(): string {
    const ratedPrefix =
      this.gameType() === 'guess'
        ? LOCAL_STORAGE_KEYS.GUESS_RATED_GAME
        : LOCAL_STORAGE_KEYS.PIECE_PUZZLE_RATED;
    return `${ratedPrefix}:${this.gameId()}`;
  }
}
