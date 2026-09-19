import { createContext } from "react";

import type { AuthUser, LoginPayload, RegisterPayload, UserRole } from "../types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  loginAsRole: (role: UserRole) => AuthUser;
  loginWithGoogle: () => AuthUser;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
