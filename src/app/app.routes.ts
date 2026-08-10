import { Routes } from '@angular/router';
import { AccountPage } from '@core/pages/account/account';
import { DashboardPage } from '@core/pages/dashboard/dashboard';
import { GamesPage } from '@core/pages/games/games';
import { PiecePuzzleGamePage } from '@core/pages/games/piece-puzzle/piece-puzzle';
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
        children: [
          {
            path: '',
            component: GamesPage,
          },
          {
            path: 'piece-puzzle/:gameId',
            component: PiecePuzzleGamePage,
          },
        ],
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
