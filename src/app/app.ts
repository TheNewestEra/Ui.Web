import { Component } from "@angular/core";
import { ButtonComponent } from "@shared/components/button/button";

@Component({
  selector: "app-root",
  imports: [ButtonComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  save() {}
}
