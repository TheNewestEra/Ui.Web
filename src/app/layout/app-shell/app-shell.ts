import { Component, signal } from '@angular/core';
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
      label: 'Games',
      icon: 'gamepad-2',
      route: '/',
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
      label: 'Friends',
      icon: 'users',
      route: '/friends',
      requiresAuth: true,
    },
    {
      label: 'Account',
      icon: 'user-round-cog',
      route: '/account',
    },
  ];

  sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(drawer: HTMLInputElement): void {
    drawer.checked = false;
  }
}
