export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
