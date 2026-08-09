import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { provideApi as provideLeaderboardApi } from '@thenewestera/leaderboard-ng';
import { provideApi as provideAccountsApi } from '@thenewestera/accounts-ng';
import { provideApi as provideGuessApi } from '@thenewestera/guess-ng';
import { provideApi as providePuzzleApi } from '@thenewestera/puzzle-ng';
import { provideApi as provideBrowseApi } from '@thenewestera/browse-ng';
import { provideApi as provideFriendsApi } from '@thenewestera/friends-ng';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideLeaderboardApi({
      withCredentials: true,
      basePath: 'https://api.leaderboard.ryanb.co.za',
    }),
    provideAccountsApi({
      withCredentials: true,
      basePath: 'https://api.accounts.ryanb.co.za',
    }),
    provideGuessApi({
      withCredentials: true,
      basePath: 'https://api.guess.ryanb.co.za',
    }),
    providePuzzleApi({
      withCredentials: true,
      basePath: 'https://api.puzzle.ryanb.co.za',
    }),
    provideBrowseApi({
      withCredentials: true,
      basePath: 'https://api.browse.ryanb.co.za',
    }),
    provideFriendsApi({
      withCredentials: true,
      basePath: 'https://api.friends.ryanb.co.za',
    }),
  ],
};
