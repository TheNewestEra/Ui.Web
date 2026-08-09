import { UserResponse } from './user-response.interface';

export interface RegisterResponse {
  user: UserResponse;
  code: string;
}
