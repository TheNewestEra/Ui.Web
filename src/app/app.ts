import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SidebarComponent, SidebarItem } from "@layout/sidebar/sidebar";

@Component({
  selector: "app-root",
  imports: [SidebarComponent, RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  menuItems: SidebarItem[] = [
    {
      label: "Dashboard",
      icon: "layout-dashboard",
      route: "/",
    },
    {
      label: "Products",
      icon: "shopping-basket",
      route: "/products",
    },
  ];
}
