import { Component, computed, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@layout/page-layout/page-layout';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header';
import { CardComponent } from '@shared/components/card/card';
import { ButtonComponent } from '@shared/components/button/button';
import { FormFieldComponent } from '@shared/components/form/form-field/form-field';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputComponent } from '@shared/components/form/input/input';
import { UserStateService } from '@core/services/user-state.service';
import { IconComponent } from '@shared/ui/icon/icon';
import {
  AccountRegisterPost200Response,
  AccountService,
  ApiMeGet200Response,
} from '@thenewestera/accounts-ng';
import { finalize } from 'rxjs';
import { ErrorAlertComponent } from '@shared/components/alert/error/error';

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
    ErrorAlertComponent,
  ],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountPage {
  private readonly accountsService = inject(AccountService);
  private readonly userStateService = inject(UserStateService);
  private readonly fb = inject(FormBuilder);

  readonly userState = inject(UserStateService);

  readonly logoutLoading = signal(false);

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
    if (this.registerLoading()) return;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username } = this.registerForm.getRawValue();

    this.registerLoading.set(true);
    this.registerErrorMessage.set(null);

    this.accountsService
      .accountRegisterPost({ username })
      .pipe(
        finalize(() => {
          this.registerLoading.set(false);
        }),
      )
      .subscribe({
        next: (response: AccountRegisterPost200Response) => {
          if (response.user) {
            this.userStateService.setUser(response.user);
            this.registrationCode.set(response.code);
          }
        },

        error: (error) => {
          this.registerErrorMessage.set(
            error?.error?.error ?? 'Something went wrong. Please try again.',
          );
        },
      });
  }

  login(): void {
    if (this.loginLoading()) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, code } = this.loginForm.getRawValue();

    this.loginLoading.set(true);
    this.loginErrorMessage.set(null);

    this.accountsService
      .accountLoginPost({ username, code })
      .pipe(
        finalize(() => {
          this.loginLoading.set(false);
        }),
      )
      .subscribe({
        next: (response: ApiMeGet200Response) => {
          if (response.user) this.userStateService.setUser(response.user);
        },

        error: (error) => {
          this.loginErrorMessage.set(
            error?.error?.error ?? 'Something went wrong. Please try again.',
          );
        },
      });
  }

  logout(): void {
    if (this.logoutLoading()) return;

    this.logoutLoading.set(true);

    this.accountsService
      .accountLogoutPost()
      .pipe(
        finalize(() => {
          this.logoutLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.userState.logout();
        },

        error: () => {
          this.userState.logout();
        },
      });
  }
}
