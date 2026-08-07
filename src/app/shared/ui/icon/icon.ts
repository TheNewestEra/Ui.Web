import { Component, input } from "@angular/core";
import { LucideAngularModule } from "lucide-angular";
import * as allIcons from "lucide-angular"; // Import everything

// Safely cast to strip out the incompatible TypeScript types
const lucideRegistry = allIcons as any;

@Component({
  selector: "app-icon",
  standalone: true,
  providers: [LucideAngularModule.pick(lucideRegistry).providers!],
  imports: [LucideAngularModule],
  templateUrl: "./icon.html",
  styleUrl: "./icon.css",
})
export class IconComponent {
  name = input<string>();
}
