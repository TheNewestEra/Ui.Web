import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent, SidebarItem } from '@layout/sidebar/sidebar';
import { NavbarComponent } from '@layout/navbar/navbar';

@Component({
  selector: 'app-app-shell',
  imports: [SidebarComponent, RouterOutlet, NavbarComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShellComponent {
  menuItems: SidebarItem[] = [
    {
      // Welcome user
      // leaderboard...
      // last game I played
      // if I didnt finish a game...
      label: 'Dashboard',
      icon: 'layout-dashboard',
      route: '/',
      requiresAuth: true,
    },
    {
      label: 'Games',
      icon: 'gamepad-2',
      route: '/games',
    },
    {
      label: 'Browse',
      icon: 'layout-grid',
      route: '/browse',
    },
    {
      label: 'Leaderboard',
      icon: 'trophy',
      route: '/leaderboard',
    },
    {
      label: 'Account',
      icon: 'user-round-cog',
      route: '/account',
    },
  ];
}
