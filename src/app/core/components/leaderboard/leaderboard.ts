import { Component, OnInit, inject } from '@angular/core';
import { TableColumn, TableComponent } from '@shared/components/data/table/table';
import { LeaderboardResponse } from '@core/models/leaderboard-response.interface';
import { LeaderboardEntryResponse } from '@core/models/leaderboard-entry-response.interface';
import { LeaderboardService } from '@core/services/leaderboard.service';

@Component({
  selector: 'app-leaderboard',
  imports: [TableComponent],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class LeaderboardComponent implements OnInit {
  private readonly leaderboardService = inject(LeaderboardService);

  leaderboard: LeaderboardEntryResponse[] = [];
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

    this.leaderboardService.getLeaderboard().subscribe({
      next: (leaderboardResponse) => {
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
    const entry = row as LeaderboardResponse;

    return entry === this.me;
  };
}
