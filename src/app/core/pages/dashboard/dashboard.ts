import { Component } from '@angular/core';
import { ProductFormComponent } from '@core/components/product/product';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [PageLayoutComponent, PageHeaderComponent, ProductFormComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage {}
