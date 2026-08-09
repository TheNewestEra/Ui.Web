import { Component, input } from "@angular/core";
import { LucideAngularModule } from "lucide-angular";
import {
  CircleAlert,
  CircleUser,
  Gamepad2,
  Info,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  Trees,
  Trophy,
  UserRoundCog,
} from "lucide-angular";

const usedIcons = {
  CircleAlert,
  CircleUser,
  Gamepad2,
  Info,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  Trees,
  Trophy,
  UserRoundCog,
};

@Component({
  selector: "app-icon",
  standalone: true,
  providers: [LucideAngularModule.pick(usedIcons).providers!],
  imports: [LucideAngularModule],
  templateUrl: "./icon.html",
  styleUrl: "./icon.css",
})
export class IconComponent {
  name = input<string>();
}
