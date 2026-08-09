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
  ],
};
