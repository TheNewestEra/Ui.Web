import { Component, OnInit, inject, input } from '@angular/core';
import { TableColumn, TableComponent } from '@shared/components/data/table/table';
import { CardComponent } from '@shared/components/card/card';
import {
  ApiLeaderboardGet200Response,
  LeaderboardEntry,
  LeaderboardService,
} from '@thenewestera/leaderboard-ng';

@Component({
  selector: 'app-leaderboard',
  imports: [TableComponent, CardComponent],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class LeaderboardComponent implements OnInit {
  private readonly leaderboardService = inject(LeaderboardService);

  showHeading = input(false);

  leaderboard: LeaderboardEntry[] = [];
  me: any = null;

  loading = false;

  columns: TableColumn[] = [
    {
      key: 'rank',
      label: 'Rank',
    },
    {
      key: 'username',
      label: 'Player',
    },
    {
      key: 'score',
      label: 'Score',
    },
  ];

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.loading = true;

    // TODO: use the query parameters for kind and period
    this.leaderboardService.apiLeaderboardGet().subscribe({
      next: (leaderboardResponse: ApiLeaderboardGet200Response) => {
        this.leaderboard = leaderboardResponse.entries;
        this.loading = false;
      },

      error: (error) => {
        console.error('Failed to load leaderboard', error);
        this.loading = false;
      },
    });
  }

  isCurrentUser = (row: unknown): boolean => {
    const entry = row as LeaderboardEntry;

    return entry === this.me;
  };
}
