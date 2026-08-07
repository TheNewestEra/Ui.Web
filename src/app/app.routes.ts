import { Routes } from "@angular/router";
import { DashboardPage } from "@core/pages/dashboard/dashboard";
import { ProductsPage } from "@core/pages/products/products";

export const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "",
        component: DashboardPage,
      },
      {
        path: "products",
        component: ProductsPage,
      },
    ],
  },
];
