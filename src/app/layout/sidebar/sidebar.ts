import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { IconComponent } from "@shared/ui/icon/icon";

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: "./sidebar.html",
  styleUrl: "./sidebar.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  title = input("Escape AI");

  items = input<SidebarItem[]>([]);
}
