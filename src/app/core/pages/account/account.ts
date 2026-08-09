import { Component, computed, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { ButtonComponent } from '@shared/components/button/button';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputComponent } from '@shared/components/form/input/input';
import { UserApiService } from '@core/services/user-api.service';
import { UserStateService } from '@core/services/user-state.service';
import { IconComponent } from '@shared/ui/icon/icon';

@Component({
  selector: 'app-account',
  imports: [
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    CardComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    IconComponent,
  ],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountPage {
  private readonly userApiService = inject(UserApiService);
  private readonly userStateService = inject(UserStateService);
  private readonly fb = inject(FormBuilder);

  readonly registerLoading = signal(false);
  readonly registrationCode = signal<string | null>(null);
  readonly registerErrorMessage = signal<string | null>(null);
  readonly registrationComplete = computed(() => this.registrationCode() !== null);
  readonly registerForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
  });

  readonly loginLoading = signal(false);
  readonly loginErrorMessage = signal<string | null>(null);
  readonly loginForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    code: ['', Validators.required],
  });

  register(): void {
    if (this.registerLoading()) {
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username } = this.registerForm.getRawValue();

    this.registerLoading.set(true);
    this.registerErrorMessage.set(null);

    this.userApiService.register(username).subscribe({
      next: (response) => {
        this.userStateService.register({
          id: response.user.id,
          username,
        });

        this.registrationCode.set(response.code);
        this.registerLoading.set(false);
      },

      error: (error) => {
        this.registerErrorMessage.set(
          error?.error?.error ?? 'Something went wrong. Please try again.',
        );

        this.registerLoading.set(false);
      },
    });
  }

  login(): void {
    if (this.loginLoading()) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, code } = this.loginForm.getRawValue();

    this.loginLoading.set(true);
    this.loginErrorMessage.set(null);

    this.userApiService.login(username, code).subscribe({
      next: (response) => {
        this.userStateService.login({
          id: response.user.id,
          username,
        });

        this.loginLoading.set(false);
      },

      error: (error) => {
        this.loginErrorMessage.set(
          error?.error?.error ?? 'Something went wrong. Please try again.',
        );

        this.loginLoading.set(false);
      },
    });
  }
}
