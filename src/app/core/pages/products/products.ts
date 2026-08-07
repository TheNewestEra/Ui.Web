import { Component } from "@angular/core";
import { ButtonComponent } from "@shared/components/button/button";
import { CardComponent } from "@shared/components/card/card";
import { PageHeaderComponent } from "@shared/ui/page-header/page-header";

@Component({
  selector: "app-products",
  imports: [ButtonComponent, CardComponent, PageHeaderComponent],
  templateUrl: "./products.html",
  styleUrl: "./products.css",
})
export class ProductsPage {
  createProduct() {
    console.log("Add Product...");
  }

  deleteProduct(name: string) {
    console.log("Deleting product: " + name);
  }
}
