import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { LoginResponse } from '@core/models/login-response.interface';
import { RegisterResponse } from '@core/models/register-response.interface';

const URL = 'https://api.accounts.ryanb.co.za';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly http = inject(HttpClient);

  register(username: string) {
    return this.http.post<RegisterResponse>(URL + '/account/register', { username });
  }

  login(username: string, code: string) {
    return this.http.post<LoginResponse>(URL + '/account/login', {
      username,
      code,
    });
  }
}
