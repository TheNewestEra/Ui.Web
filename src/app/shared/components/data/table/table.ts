import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableSort {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-table',
  standalone: true,
  templateUrl: './table.html',
  styleUrl: './table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
  columns = input.required<TableColumn[]>();

  data = input.required<unknown[]>();

  loading = input(false);

  emptyMessage = input('No records found.');

  striped = input(true);

  showRowNumbers = input(false);

  showRank = input(false);

  maxRows = input<number | null>(null);

  sort = input<TableSort | null>(null);

  /**
   * Determines whether a particular row should be highlighted.
   */
  rowHighlight = input<(row: unknown) => boolean>(() => false);

  extraRow = input<(row: unknown) => boolean>(() => false);

  rowClicked = output<unknown>();

  displayedData = computed(() => {
    let rows = this.data().map((row) => ({
      row,
      rank: 0,
    }));

    const currentSort = this.sort();

    if (currentSort) {
      rows.sort((a, b) => {
        const aValue = this.getValue(a.row, currentSort.key);
        const bValue = this.getValue(b.row, currentSort.key);

        const result = this.compareValues(aValue, bValue);

        return currentSort.direction === 'asc' ? result : -result;
      });
    }

    // Assign rank AFTER sorting
    rows = rows.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const maxRows = this.maxRows();

    if (maxRows !== null && rows.length > maxRows) {
      const visibleRows = rows.slice(0, maxRows);

      const extra = rows.find((item) => this.extraRow()(item.row));

      if (extra && !visibleRows.some((item) => item.row === extra.row)) {
        visibleRows.push(extra);
      }

      return visibleRows;
    }

    return rows;
  });

  getValue(row: unknown, key: string): unknown {
    if (!row || typeof row !== 'object') return '';

    return (row as Record<string, unknown>)[key];
  }

  isHighlighted(row: unknown): boolean {
    return this.rowHighlight()(row);
  }

  isExtraRow(row: unknown): boolean {
    return this.extraRow()(row);
  }

  onRowClick(row: unknown): void {
    this.rowClicked.emit(row);
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) {
      return 0;
    }

    if (a === null || a === undefined) {
      return -1;
    }

    if (b === null || b === undefined) {
      return 1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }
}
