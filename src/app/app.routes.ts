import { Routes } from '@angular/router';
import { AccountPage } from '@core/pages/account/account';
import { DashboardPage } from '@core/pages/dashboard/dashboard';
import { LeaderboardPage } from '@core/pages/leaderboard/leaderboard';
import { ProductsPage } from '@core/pages/products/products';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: DashboardPage,
      },
      {
        path: 'products',
        component: ProductsPage,
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
