import { Component } from '@angular/core';
import { LeaderboardComponent } from '@core/components/leaderboard/leaderboard';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';

@Component({
  selector: 'app-leaderboard-page',
  imports: [LeaderboardComponent, PageLayoutComponent, PageHeaderComponent],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class LeaderboardPage {}
