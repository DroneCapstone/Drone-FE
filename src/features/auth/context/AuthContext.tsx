import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { authService } from "../services/authService";

import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UserRole,
} from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;

  isAuthenticated: boolean;

  login: (
    payload: LoginPayload,
  ) => Promise<AuthUser>;

  register: (
    payload: RegisterPayload,
  ) => Promise<AuthUser>;

  loginAsRole: (
    role: UserRole,
  ) => AuthUser;

  loginWithGoogle: () => AuthUser;

  logout: () => void;
}

export const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [user, setUser] =
    useState<AuthUser | null>(() =>
      authService.getCurrentUser(),
    );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const nextUser =
        await authService.login(payload);

      setUser(nextUser);

      return nextUser;
    },
    [],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const nextUser =
        await authService.register(payload);

      setUser(nextUser);

      return nextUser;
    },
    [],
  );

  const loginAsRole = useCallback(
    (role: UserRole) => {
      const nextUser =
        authService.loginAsRole(role);

      setUser(nextUser);

      return nextUser;
    },
    [],
  );

  const loginWithGoogle = useCallback(() => {
    const nextUser =
      authService.loginWithGoogle();

    setUser(nextUser);

    return nextUser;
  }, []);

  const logout = useCallback(() => {
    authService.logout();

    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),

      login,
      register,

      loginAsRole,
      loginWithGoogle,

      logout,
    }),
    [
      user,
      login,
      register,
      loginAsRole,
      loginWithGoogle,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}