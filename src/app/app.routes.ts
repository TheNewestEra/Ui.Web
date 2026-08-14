import { Routes } from '@angular/router';
import { GamesPage } from '@core/pages/games/games';

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
            loadComponent: () => import('@core/pages/games/games').then((m) => m.GamesPage),
          },
          {
            path: 'piece-puzzle/:gameId',
            loadComponent: () =>
              import('@core/pages/games/piece-puzzle/piece-puzzle').then(
                (m) => m.PiecePuzzleGamePage,
              ),
          },
          {
            path: 'guess-prompt/:gameId',
            loadComponent: () =>
              import('@core/pages/games/guess-prompt/guess-prompt').then(
                (m) => m.GuessPromptGamePage,
              ),
          },
        ],
      },
      {
        path: 'browse',
        loadComponent: () => import('@core/pages/browse/browse').then((m) => m.BrowsePage),
      },
      {
        path: 'friends',
        loadComponent: () => import('@core/pages/friends/friends').then((m) => m.FriendsPage),
      },
      {
        path: 'account',
        loadComponent: () => import('@core/pages/account/account').then((m) => m.AccountPage),
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('@core/pages/leaderboard/leaderboard').then((m) => m.LeaderboardPage),
      },
    ],
  },
];
