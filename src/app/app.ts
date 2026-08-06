import { Component } from "@angular/core";
import { ButtonComponent } from "@shared/components/button/button";
import { CardComponent } from "@shared/components/card/card";

@Component({
  selector: "app-root",
  imports: [ButtonComponent, CardComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  save() {}
}
