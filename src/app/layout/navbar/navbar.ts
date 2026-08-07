import { ChangeDetectionStrategy, Component } from "@angular/core";
import { IconComponent } from "@shared/ui/icon/icon";
import { ThemeService } from "@shared/services/theme.service";
import { ButtonComponent } from "@shared/components/button/button";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [IconComponent, ButtonComponent],
  templateUrl: "./navbar.html",
  styleUrl: "./navbar.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  constructor(public themeService: ThemeService) {}
}
