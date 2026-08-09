import { Component } from '@angular/core';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { LeaderboardComponent } from '@core/components/leaderboard/leaderboard';

@Component({
  selector: 'app-dashboard',
  imports: [PageLayoutComponent, PageHeaderComponent, LeaderboardComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage {}
