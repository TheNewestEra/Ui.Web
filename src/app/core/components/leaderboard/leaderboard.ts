import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CardComponent } from '@shared/components/card/card';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { SelectComponent, SelectOption } from '@shared/components/form/select/select';
import { ButtonComponent } from '@shared/components/button/button';
import {
  ApiLeaderboardGet200Response,
  LeaderboardPeriod,
  LeaderboardScope,
  LeaderboardService,
} from '@thenewestera/leaderboard-ng';
import { FriendsService } from '@thenewestera/friends-ng';
import { UserStateService } from '@core/services/user-state.service';

export interface LeaderboardDisplayEntry {
  id: string;
  name: string;
  color: string;
  score: number;
  rank: number | null;
  playedAt?: number;
  isFriend?: boolean;
}

@Component({
  selector: 'app-leaderboard',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    CardComponent,
    FormFieldComponent,
    SelectComponent,
    ButtonComponent,
  ],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent implements OnInit {
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly friendsService = inject(FriendsService);
  private readonly userStateService = inject(UserStateService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private requestId = 0;

  readonly kindOptions: SelectOption[] = [
    { label: 'All game types', value: 'all' },
    { label: 'Guess the Prompt', value: 'guess' },
    { label: 'Piece Puzzle', value: 'puzzle' },
  ];

  readonly periodOptions: SelectOption[] = [
    { label: 'All time', value: LeaderboardPeriod.All },
    { label: 'Today', value: LeaderboardPeriod.Day },
    { label: 'This week', value: LeaderboardPeriod.Week },
    { label: 'This month', value: LeaderboardPeriod.Month },
  ];

  readonly scopeOptions = computed<SelectOption[]>(() => [
    { label: 'Everyone', value: LeaderboardScope.Global },
    {
      label: this.userStateService.isLoggedIn() ? 'Friends' : 'Friends (log in required)',
      value: LeaderboardScope.Friends,
      disabled: !this.userStateService.isLoggedIn(),
    },
  ]);

  readonly filterForm = this.fb.nonNullable.group({
    kind: ['all'],
    period: [LeaderboardPeriod.All],
    scope: [LeaderboardScope.Global],
  });

  readonly entries = input<LeaderboardDisplayEntry[] | null>(null);
  readonly currentId = input<string | null>(null);
  readonly currentEntry = input<LeaderboardDisplayEntry | null>(null);
  readonly showHeading = input(true);
  readonly heading = input('Leaderboard');
  readonly subtitle = input('Players ranked by score');
  readonly emptyMessage = input('No scores yet.');

  private readonly loadedEntries = signal<LeaderboardDisplayEntry[]>([]);
  private readonly loadedCurrentEntry = signal<LeaderboardDisplayEntry | null>(null);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly friendRequestLoadingId = signal<string | null>(null);
  readonly pendingFriendRequestIds = signal<ReadonlySet<string>>(new Set());
  readonly friendRequestError = signal<string | null>(null);
  readonly isLoggedIn = this.userStateService.isLoggedIn;
  readonly skeletonRows = Array.from({ length: 5 });

  readonly usesRemoteData = computed(() => this.entries() === null);
  readonly hasPreviousPage = computed(() => this.usesRemoteData() && this.page() > 1);
  readonly hasNextPage = computed(() => this.usesRemoteData() && this.hasMore());
  readonly showPagination = computed(
    () => this.usesRemoteData() && (this.page() > 1 || this.hasMore()),
  );

  readonly displayedEntries = computed(() => this.entries() ?? this.loadedEntries());
  readonly displayedCurrentEntry = computed(() => this.currentEntry() ?? this.loadedCurrentEntry());
  readonly displayedCurrentId = computed(
    () => this.currentId() ?? this.displayedCurrentEntry()?.id ?? null,
  );
  readonly showSeparateCurrentEntry = computed(() => {
    const current = this.displayedCurrentEntry();

    return !!current && !this.displayedEntries().some((entry) => entry.id === current.id);
  });
  readonly tableColumns = computed(() =>
    this.usesRemoteData()
      ? '3rem minmax(10rem, 16rem) minmax(7rem, 1fr) 7rem 7rem 5rem'
      : '3rem minmax(0, 1fr) auto',
  );

  ngOnInit(): void {
    if (!this.usesRemoteData()) return;

    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.loadLeaderboard();
    });

    this.loadLeaderboard();
  }

  isCurrent(entry: LeaderboardDisplayEntry): boolean {
    return entry.id === this.displayedCurrentId();
  }

  isSelf(entry: LeaderboardDisplayEntry): boolean {
    if (this.isCurrent(entry)) return true;

    const signedInUsername = this.userStateService.user()?.username;

    return (
      !!signedInUsername &&
      entry.name.trim().toLocaleLowerCase() === signedInUsername.trim().toLocaleLowerCase()
    );
  }

  canShowFriendRequest(entry: LeaderboardDisplayEntry): boolean {
    return (
      this.usesRemoteData() &&
      !this.isSelf(entry) &&
      !entry.isFriend &&
      !this.pendingFriendRequestIds().has(entry.id)
    );
  }

  canSendFriendRequest(entry: LeaderboardDisplayEntry): boolean {
    return this.userStateService.isLoggedIn() && this.canShowFriendRequest(entry);
  }

  sendFriendRequest(entry: LeaderboardDisplayEntry): void {
    if (!this.canSendFriendRequest(entry) || this.friendRequestLoadingId()) {
      return;
    }

    this.friendRequestLoadingId.set(entry.id);
    this.friendRequestError.set(null);

    this.friendsService
      .apiFriendsRequestPost({ username: entry.name })
      .pipe(finalize(() => this.friendRequestLoadingId.set(null)))
      .subscribe({
        next: () => {
          this.pendingFriendRequestIds.update((ids) => new Set(ids).add(entry.id));
        },
        error: (error) => {
          this.friendRequestError.set(
            error?.error?.error ?? `Unable to send a friend request to ${entry.name}.`,
          );
        },
      });
  }

  previousPage(): void {
    if (!this.hasPreviousPage() || this.loading()) return;

    this.page.update((page) => Math.max(1, page - 1));
    this.loadLeaderboard();
  }

  nextPage(): void {
    if (!this.hasNextPage() || this.loading()) return;

    this.page.update((page) => page + 1);
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    if (!this.usesRemoteData()) return;

    const { kind, period, scope: selectedScope } = this.filterForm.getRawValue();
    const scope =
      selectedScope === LeaderboardScope.Friends && !this.userStateService.isLoggedIn()
        ? LeaderboardScope.Global
        : selectedScope;

    if (scope !== selectedScope) {
      this.filterForm.controls.scope.setValue(scope, { emitEvent: false });
    }
    const requestId = ++this.requestId;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.leaderboardService
      .apiLeaderboardGet(
        kind === 'all' ? undefined : (kind as 'guess' | 'puzzle'),
        period,
        scope,
        this.page(),
      )
      .pipe(
        finalize(() => {
          if (requestId === this.requestId) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response: ApiLeaderboardGet200Response) => {
          if (requestId !== this.requestId) return;

          this.loadedEntries.set(
            response.entries.map((entry) => ({
              rank: entry.rank,
              id: entry.userId,
              name: entry.username,
              color: entry.color,
              score: entry.score,
              playedAt: entry.lastPlayedAt,
              isFriend: entry.isFriend,
            })),
          );
          this.loadedCurrentEntry.set(
            response.me
              ? {
                  rank: response.me.rank,
                  id: response.me.userId,
                  name: response.me.username,
                  color: response.me.color,
                  score: response.me.score,
                }
              : null,
          );
          this.page.set(response.page);
          this.hasMore.set(response.hasMore);
        },
        error: (error) => {
          if (requestId !== this.requestId) return;
          this.errorMessage.set(error?.error?.error ?? 'Unable to load the leaderboard.');
        },
      });
  }
}
