import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  standalone: true,
  templateUrl: './page-layout.html',
  styleUrl: './page-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLayoutComponent {}
