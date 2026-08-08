import { Component, input } from '@angular/core';
import { AbstractControl, FormControl } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
})
export class FormFieldComponent {
  label = input.required<string>();

  hint = input('');

  control = input<AbstractControl | null>(null);

  get isRequired(): boolean {
    const control = this.control();

    if (!control?.validator) return false;

    const testControl = new FormControl('');

    const errors = control.validator(testControl);

    return !!errors?.['required'];
  }

  get showError(): boolean {
    const control = this.control();

    return !!control && control.invalid && control.touched;
  }

  get errorMessage(): string {
    const control = this.control();

    if (!control?.errors) return '';

    if (control.errors['required']) return `${this.label()} is required.`;

    if (control.errors['email']) return 'Please enter a valid email address.';

    if (control.errors['min']) return 'The value is too small.';

    if (control.errors['max']) return 'The value is too large.';

    return 'Invalid value.';
  }
}
