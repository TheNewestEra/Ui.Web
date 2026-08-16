import { Routes } from '@angular/router';
import { GamesPage } from '@core/pages/games/games';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: GamesPage,
        title: 'The Newest Era — AI-Generated Party Games',
        data: {
          description:
            'Create a Guess the Prompt or Piece Puzzle game and invite friends to play in real time. Free, AI-generated multiplayer party games — no account required.',
        },
      },
      {
        path: 'games',
        children: [
          {
            path: '',
            loadComponent: () => import('@core/pages/games/games').then((m) => m.GamesPage),
            title: 'Create a Game — The Newest Era',
            data: {
              description:
                'Create a Guess the Prompt or Piece Puzzle game and invite friends to play in real time. Free, AI-generated multiplayer party games — no account required.',
            },
          },
          {
            path: 'piece-puzzle/:gameId',
            loadComponent: () =>
              import('@core/pages/games/piece-puzzle/piece-puzzle').then(
                (m) => m.PiecePuzzleGamePage,
              ),
            title: 'Playing Piece Puzzle — The Newest Era',
            data: {
              description:
                'Race to reconstruct a shuffled AI-generated image with friends before time runs out.',
              noindex: true,
            },
          },
          {
            path: 'guess-prompt/:gameId',
            loadComponent: () =>
              import('@core/pages/games/guess-prompt/guess-prompt').then(
                (m) => m.GuessPromptGamePage,
              ),
            title: 'Playing Guess the Prompt — The Newest Era',
            data: {
              description:
                'Guess the hidden prompt behind an AI-generated image and earn time-weighted points against friends.',
              noindex: true,
            },
          },
        ],
      },
      {
        path: 'browse',
        loadComponent: () => import('@core/pages/browse/browse').then((m) => m.BrowsePage),
        title: 'Browse Games — The Newest Era',
        data: {
          description:
            'Browse, filter, rate, and replay AI-generated party games created by the community.',
        },
      },
      {
        path: 'friends',
        loadComponent: () => import('@core/pages/friends/friends').then((m) => m.FriendsPage),
        title: 'Friends — The Newest Era',
        data: {
          description:
            'Manage friends, friend requests, and groups so you can invite people to your party games.',
        },
      },
      {
        path: 'account',
        loadComponent: () => import('@core/pages/account/account').then((m) => m.AccountPage),
        title: 'Account — The Newest Era',
        data: {
          description:
            'Register or log in with a passwordless six-digit code to save your progress and stats.',
          noindex: true,
        },
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('@core/pages/leaderboard/leaderboard').then((m) => m.LeaderboardPage),
        title: 'Leaderboard — The Newest Era',
        data: {
          description:
            'See global and friends leaderboard rankings across every AI-generated party game.',
        },
      },
    ],
  },
];
