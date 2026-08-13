import { Routes } from '@angular/router';
import { AccountPage } from '@core/pages/account/account';
import { DashboardPage } from '@core/pages/dashboard/dashboard';
import { GamesPage } from '@core/pages/games/games';
import { GuessPromptGamePage } from '@core/pages/games/guess-prompt/guess-prompt';
import { PiecePuzzleGamePage } from '@core/pages/games/piece-puzzle/piece-puzzle';
import { LeaderboardPage } from '@core/pages/leaderboard/leaderboard';
import { FriendsPage } from '@core/pages/friends/friends';

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
          {
            path: 'guess-prompt/:gameId',
            component: GuessPromptGamePage,
          },
        ],
      },
      {
        path: 'browse',
        loadComponent: () => import('@core/pages/browse/browse').then((m) => m.BrowsePage),
      },
      {
        path: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'friends',
        component: FriendsPage,
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
