import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { authService } from "../services/authService";

import type {
  LoginPayload,
  RegisterPayload,
  UserRole,
} from "../types/auth";
import type { AuthUser } from "../types/auth";
import { AuthContext, type AuthContextValue } from "./authContextValue";

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
