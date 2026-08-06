import { Component } from "@angular/core";
import { ButtonComponent } from "@shared/components/button/button";
import { CardComponent } from "@shared/components/card/card";
import { PageHeaderComponent } from "@shared/ui/page-header/page-header";

@Component({
  selector: "app-root",
  imports: [ButtonComponent, CardComponent, PageHeaderComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  createProduct() {
    console.log("Add Product...");
  }

  deleteProduct(name: string) {
    console.log("Deleting product: " + name);
  }
}
