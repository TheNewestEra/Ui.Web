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
      label: 'Dashboard',
      icon: 'layout-dashboard',
      route: '/',
    },
    {
      label: 'Products',
      icon: 'shopping-basket',
      route: '/products',
    },
  ];
}
