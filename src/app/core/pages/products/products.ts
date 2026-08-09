import { Component, OnInit, inject } from '@angular/core';
import { ProductService } from '@core/services/product.service';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { ButtonComponent } from '@shared/components/button/button';
import { CardComponent } from '@shared/components/card/card';
import { TableColumn, TableComponent } from '@shared/components/data/table/table';
import { Product } from '@shared/models/product.interface';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';

@Component({
  selector: 'app-products',
  imports: [
    ButtonComponent,
    CardComponent,
    PageHeaderComponent,
    PageLayoutComponent,
    TableComponent,
  ],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsPage implements OnInit {
  private readonly productService = inject(ProductService);

  products: Product[] = [];

  loading = false;

  columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Product',
    },
    {
      key: 'description',
      label: 'Description',
    },
    {
      key: 'price',
      label: 'Price',
    },
  ];

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;

    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },

      error: (error) => {
        console.error('Failed to load products', error);
        this.loading = false;
      },
    });
  }

  isCurrentUser = (row: unknown): boolean => {
    const entry = row as Product;

    return entry.name === 'Widget Pro';
  };

  createProduct() {
    console.log('Add Product...');
  }

  deleteProduct(name: string) {
    console.log('Deleting product: ' + name);
  }

  editProduct(event: any) {}
}
