import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components/button/button';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { InputComponent } from '@shared/components/form/input/input';
import { SelectComponent, SelectOption } from '@shared/components/form/select/select';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputComponent,
    SelectComponent,
    FormFieldComponent,
    ButtonComponent,
  ],
  templateUrl: './product.html',
})
export class ProductFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly categories: SelectOption[] = [
    {
      label: 'Electronics',
      value: 'electronics',
    },
    {
      label: 'Books',
      value: 'books',
    },
    {
      label: 'Clothing',
      value: 'clothing',
    },
  ];

  readonly productForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    category: ['', Validators.required],
  });

  save(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    console.log(this.productForm.getRawValue());
  }
}
