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
  copyError = signal<string | null>(null);

  async copy(): Promise<void> {
    try {
      this.copyError.set(null);
      await navigator.clipboard.writeText(this.code());

      this.copied.set(true);

      setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    } catch {
      this.copyError.set('Unable to copy the code. Please select and copy it manually.');
    }
  }
}
