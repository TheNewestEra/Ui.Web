import { Component, inject } from '@angular/core';
import { AppShellComponent } from '@layout/app-shell/app-shell';
import { SeoService } from '@core/services/seo.service';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.init();
  }
}
