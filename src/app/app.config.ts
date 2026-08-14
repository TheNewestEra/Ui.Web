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
import { provideApi as provideNotificationsApi } from '@thenewestera/notifications-ng';
import { BASE_URL } from '@core/constants/base-urls.constants';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideLeaderboardApi({
      withCredentials: true,
      basePath: BASE_URL.LEADERBOARD,
    }),
    provideAccountsApi({
      withCredentials: true,
      basePath: BASE_URL.ACCOUNTS,
    }),
    provideGuessApi({
      withCredentials: true,
      basePath: BASE_URL.GUESS,
    }),
    providePuzzleApi({
      withCredentials: true,
      basePath: BASE_URL.PUZZLE,
    }),
    provideBrowseApi({
      withCredentials: true,
      basePath: BASE_URL.BROWSE,
    }),
    provideFriendsApi({
      withCredentials: true,
      basePath: BASE_URL.FRIENDS,
    }),
    provideNotificationsApi({
      withCredentials: true,
      basePath: BASE_URL.NOTIFICATIONS,
    }),
  ],
};
