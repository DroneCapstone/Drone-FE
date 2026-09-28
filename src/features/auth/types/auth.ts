export type UserRole =
  | "operator"
  | "customer"
  | "technician"
  | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
}
