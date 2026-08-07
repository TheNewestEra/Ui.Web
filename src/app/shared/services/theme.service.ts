import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  readonly theme = signal<"light" | "dark">("light");

  constructor() {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;

    if (saved) {
      this.setTheme(saved);
    }
  }

  toggleTheme() {
    this.setTheme(this.theme() === "light" ? "dark" : "light");
  }

  private setTheme(theme: "light" | "dark") {
    this.theme.set(theme);

    document.documentElement.setAttribute("data-theme", theme);

    localStorage.setItem("theme", theme);
  }
}
