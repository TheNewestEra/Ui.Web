import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ButtonComponent } from '@shared/components/button/button';

@Component({
  selector: 'app-code-display',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './code-display.html',
  styleUrl: './code-display.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeDisplayComponent {
  code = input.required<string>();

  copied = signal(false);

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());

      this.copied.set(true);

      setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code', error);
    }
  }
}
