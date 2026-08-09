import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
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

  /**
   * Determines whether a particular row should be highlighted.
   */
  rowHighlight = input<(row: unknown) => boolean>(() => false);

  rowClicked = output<unknown>();

  getValue(row: unknown, key: string): unknown {
    if (!row || typeof row !== 'object') return '';

    return (row as Record<string, unknown>)[key];
  }

  isHighlighted(row: unknown): boolean {
    return this.rowHighlight()(row);
  }

  onRowClick(row: unknown): void {
    this.rowClicked.emit(row);
  }
}
