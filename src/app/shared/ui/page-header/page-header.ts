import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ButtonComponent } from '@shared/components/button/button';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  title = input.required<string>();

  subtitle = input('');

  buttonText = input('');

  buttonVariant = input<
    'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'error' | 'success'
  >('primary');

  buttonClicked = output<void>();

  showButton = computed(() => this.buttonText().length > 0);
}
