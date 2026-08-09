import { Component } from '@angular/core';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { ButtonComponent } from '@shared/components/button/button';
import { CardComponent } from '@shared/components/card/card';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';

@Component({
  selector: 'app-products',
  imports: [ButtonComponent, CardComponent, PageHeaderComponent, PageLayoutComponent],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsPage {
  // TODO: Remove this file....
  createProduct() {
    console.log('Add Product...');
  }

  deleteProduct(name: string) {
    console.log('Deleting product: ' + name);
  }

  editProduct(event: any) {}
}
