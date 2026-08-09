import { Routes } from '@angular/router';
import { AccountPage } from '@core/pages/account/account';
import { DashboardPage } from '@core/pages/dashboard/dashboard';
import { GamesPage } from '@core/pages/games/games';
import { LeaderboardPage } from '@core/pages/leaderboard/leaderboard';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: GamesPage,
      },
      {
        path: 'games',
        component: GamesPage,
      },
      {
        path: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'account',
        component: AccountPage,
      },
      {
        path: 'leaderboard',
        component: LeaderboardPage,
      },
    ],
  },
];
