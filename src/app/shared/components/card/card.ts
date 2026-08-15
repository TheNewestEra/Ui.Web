import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  selector: "app-card",
  standalone: true,
  imports: [],
  templateUrl: "./card.html",
  styleUrl: "./card.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  bordered = input(true);

  compact = input(false);

  shadow = input(true);
}
