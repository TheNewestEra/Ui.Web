import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  forwardRef,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-otp-input',
  standalone: true,
  templateUrl: './otp-input.html',
  styleUrl: './otp-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInputComponent),
      multi: true,
    },
  ],
})
export class OtpInputComponent implements ControlValueAccessor {
  length = input(6);

  @ViewChildren('otpInput')
  private readonly inputs!: QueryList<ElementRef<HTMLInputElement>>;

  values: string[] = [];

  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.values = Array(this.length()).fill('');
  }

  writeValue(value: string | null): void {
    const length = this.length();

    const digits = (value ?? '').replace(/\D/g, '').slice(0, length);

    this.values = Array.from({ length }, (_, index) => digits[index] ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;

    const value = input.value.replace(/\D/g, '').slice(-1);

    this.values[index] = value;

    this.emitValue();

    if (value && index < this.length() - 1) {
      this.focus(index + 1);
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.values[index] && index > 0) {
      this.values[index - 1] = '';

      this.emitValue();

      this.focus(index - 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, this.length());

    if (!pasted) {
      return;
    }

    this.writeValue(pasted);
    this.emitValue();

    const nextIndex = Math.min(pasted.length, this.length() - 1);

    this.focus(nextIndex);
  }

  onBlur(): void {
    this.onTouched();
  }

  private emitValue(): void {
    this.onChange(this.values.join(''));
  }

  private focus(index: number): void {
    setTimeout(() => {
      this.inputs.get(index)?.nativeElement.focus();
    });
  }
}
