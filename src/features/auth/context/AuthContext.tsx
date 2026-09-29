import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  AuthContext,
  type AuthContextValue,
} from "./authContextValue";

import { authService } from "../services/authService";

import type {
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UserRole,
} from "../types/auth";

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const hasStoredAccessToken =
    Boolean(
      authService.getAccessToken(),
    );

  const [user, setUser] =
    useState<AuthUser | null>(() =>
      hasStoredAccessToken
        ? authService.getCurrentUser()
        : null,
    );

  const [isRestoring, setIsRestoring] =
    useState(
      hasStoredAccessToken,
    );

  useEffect(() => {
    let active = true;

    if (!authService.getAccessToken()) {
      setUser(null);
      setIsRestoring(false);
      return;
    }

    authService
      .restoreSession()
      .then((nextUser) => {
        if (active) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsRestoring(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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

  const forgotPassword = useCallback(
    (
      payload: ForgotPasswordPayload,
    ) =>
      authService.forgotPassword(
        payload,
      ),
    [],
  );

  const resetPassword = useCallback(
    (
      payload: ResetPasswordPayload,
    ) =>
      authService.resetPassword(
        payload,
      ),
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

  const loginWithGoogle =
    useCallback(() => {
      authService.loginWithGoogle();
    }, []);

  const logout = useCallback(
    async () => {
      await authService.logout();
      setUser(null);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRestoring,
      login,
      register,
      forgotPassword,
      resetPassword,
      loginAsRole,
      loginWithGoogle,
      logout,
    }),
    [
      user,
      isRestoring,
      login,
      register,
      forgotPassword,
      resetPassword,
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
