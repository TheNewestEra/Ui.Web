import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ApiCatalogGet200Response,
  BrowseService,
  CatalogEntry,
  CatalogSort,
} from '@thenewestera/browse-ng';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { ButtonComponent } from '@shared/components/button/button';
import { IconComponent } from '@shared/ui/icon/icon';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { SelectComponent, SelectOption } from '@shared/components/form/select/select';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-browse',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    PageLayoutComponent,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
    IconComponent,
    FormFieldComponent,
    SelectComponent,
    ErrorAlertComponent,
  ],
  templateUrl: './browse.html',
  styleUrl: './browse.css',
})
export class BrowsePage {
  private readonly browseService = inject(BrowseService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly kindOptions: SelectOption[] = [
    { label: 'All game types', value: 'all' },
    { label: 'Guess the Prompt', value: 'guess' },
    { label: 'Piece Puzzle', value: 'puzzle' },
  ];

  readonly sortOptions: SelectOption[] = [
    { label: 'Newest first', value: 'recent' },
    { label: 'Top rated', value: 'rating' },
  ];

  readonly filterForm = this.fb.nonNullable.group({
    kind: ['all'],
    sort: [CatalogSort.Recent],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly entries = signal<CatalogEntry[]>([]);
  readonly offset = signal(0);
  readonly loadedImageIds = signal<ReadonlySet<string>>(new Set());

  readonly page = computed(() => this.offset() / PAGE_SIZE + 1);
  readonly hasPreviousPage = computed(() => this.offset() > 0);
  readonly hasNextPage = computed(() => this.entries().length === PAGE_SIZE);

  constructor() {
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.offset.set(0);
      this.load();
    });

    this.load();
  }

  load(): void {
    if (this.loading()) return;

    const { kind, sort } = this.filterForm.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);
    this.loadedImageIds.set(new Set());

    this.browseService
      .apiCatalogGet(
        kind === 'all' ? undefined : (kind as 'guess' | 'puzzle'),
        sort as CatalogSort,
        undefined,
        PAGE_SIZE,
        this.offset(),
      )
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response: ApiCatalogGet200Response) => {
          this.entries.set(response.entries);
        },

        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'Something went wrong. Please try again.');
        },
      });
  }

  previousPage(): void {
    if (!this.hasPreviousPage() || this.loading()) return;

    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
    this.load();
  }

  nextPage(): void {
    if (!this.hasNextPage() || this.loading()) return;

    this.offset.update((offset) => offset + PAGE_SIZE);
    this.load();
  }

  kindLabel(kind: CatalogEntry['kind']): string {
    return kind === 'guess' ? 'Guess the Prompt' : 'Piece Puzzle';
  }

  kindIcon(kind: CatalogEntry['kind']): string {
    return kind === 'guess' ? 'gamepad-2' : 'puzzle';
  }

  isImageLoaded(entryId: string): boolean {
    return this.loadedImageIds().has(entryId);
  }

  onImageLoad(entryId: string): void {
    this.loadedImageIds.update((ids) => new Set(ids).add(entryId));
  }

  filledStars(entry: CatalogEntry): number {
    return Math.round(entry.averageRating ?? 0);
  }

  statusLabel(status: CatalogEntry['playStatus']): string {
    switch (status) {
      case 'joinable':
        return 'Open to join';
      case 'active':
        return 'In progress';
      case 'finished':
      default:
        return 'Finished';
    }
  }

  statusBadgeClass(status: CatalogEntry['playStatus']): string {
    switch (status) {
      case 'joinable':
        return 'badge-success';
      case 'active':
        return 'badge-warning';
      case 'finished':
      default:
        return 'badge-ghost';
    }
  }

  playActionLabel(status: CatalogEntry['playStatus']): string {
    switch (status) {
      case 'joinable':
        return 'Join game';
      case 'active':
        return 'Spectate';
      case 'finished':
      default:
        return 'View results';
    }
  }
}
