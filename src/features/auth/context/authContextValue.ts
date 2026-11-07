import {
  createContext,
} from "react";

import type {
  AuthTokens,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from "../types/auth";

export interface AuthContextValue {
  user: AuthUser | null;

  isAuthenticated: boolean;

  isRestoring: boolean;

  login: (
    payload: LoginPayload,
  ) => Promise<AuthUser>;

  register: (
    payload: RegisterPayload,
  ) => Promise<AuthUser>;

  forgotPassword: (
    payload:
      ForgotPasswordPayload,
  ) => Promise<string>;

  resetPassword: (
    payload:
      ResetPasswordPayload,
  ) => Promise<string>;

  loginWithGoogle: () => void;

  completeGoogleLogin: (
    tokens: AuthTokens,
  ) => Promise<AuthUser>;


  logout: () => Promise<void>;
}

export const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);
