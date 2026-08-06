import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";

@Component({
  selector: "app-button",
  standalone: true,
  imports: [],
  templateUrl: "./button.html",
  styleUrl: "./button.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  text = input("");

  variant = input<
    | "primary"
    | "secondary"
    | "accent"
    | "outline"
    | "ghost"
    | "error"
    | "success"
  >("primary");

  size = input<"sm" | "md" | "lg">("md");

  loading = input(false);

  disabled = input(false);

  clicked = output<void>();

  classes = computed(() => {
    const variantClasses = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      accent: "btn-accent",
      outline: "btn-outline",
      ghost: "btn-ghost",
      error: "btn-error",
      success: "btn-success",
    };

    return [
      "btn",
      variantClasses[this.variant()],
      this.size() === "sm" && "btn-sm",
      this.size() === "lg" && "btn-lg",
      this.loading() && "loading",
    ]
      .filter(Boolean)
      .join(" ");
  });

  onClick() {
    if (this.disabled() || this.loading()) {
      return;
    }

    this.clicked.emit();
  }
}
