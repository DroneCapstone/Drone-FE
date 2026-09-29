import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import { Input } from "../../../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";

interface LoginFormProps {
  onSwitchMode: () => void;
}

const ROLE_PATHS: Partial<
  Record<UserRole, string>
> = {
  customer: "/customer/dashboard",
  operator: "/operator/dashboard",
  technician: "/technician/dashboard",
  admin: "/admin/dashboard",
};

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const ENABLE_DEMO_ACCESS =
  import.meta.env.DEV ||
  viteEnv?.VITE_ENABLE_DEMO_AUTH ===
  "true";

export function LoginForm({
  onSwitchMode,
}: LoginFormProps) {
  const navigate = useNavigate();

  const {
    login,
    loginAsRole,
    loginWithGoogle,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const redirectForRole = (
    role: UserRole,
  ) => {
    const path = ROLE_PATHS[role];

    if (!path) {
      throw new Error(
        `No frontend route is configured for role ${role}.`,
      );
    }

    navigate(path, {
      replace: true,
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const user = await login({
        email,
        password,
      });

      redirectForRole(user.role);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockLogin = (
    role: UserRole,
  ) => {
    try {
      const user = loginAsRole(role);
      redirectForRole(user.role);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to open demo access.",
      );
    }
  };

  return (
    <div className="auth-form-slide">
      <div className="auth-form-content">
        <span className="auth-eyebrow">
          SECURE ACCESS
        </span>

        <h1>Welcome back.</h1>

        <p className="auth-form-copy">
          Sign in to continue to DroneOptAI.
        </p>

        <button
          type="button"
          className="auth-google"
          onClick={loginWithGoogle}
        >
          <span className="google-mark">
            G
          </span>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Email address</span>

            <Input
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="name@droneopt.ai"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>

            <span className="auth-password-wrap">
              <Input
                autoComplete="current-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Enter password"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (value) => !value,
                  )
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </span>
          </label>

          <p className="auth-switch-copy">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/forgot-password",
                )
              }
            >
              Forgot password?
            </button>
          </p>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={submitting}
          >
            <span>
              {submitting
                ? "Signing in…"
                : "Sign in"}
            </span>
            <b>→</b>
          </button>
        </form>

        {ENABLE_DEMO_ACCESS && (
          <div className="auth-demo">
            <span className="auth-demo-label">
              DEMO ACCESS · UI ONLY
            </span>

            <div className="auth-role-grid">
              <button
                type="button"
                onClick={() =>
                  handleMockLogin(
                    "customer",
                  )
                }
              >
                Customer
              </button>

              <button
                type="button"
                onClick={() =>
                  handleMockLogin(
                    "operator",
                  )
                }
              >
                Operator
              </button>

              <button
                type="button"
                onClick={() =>
                  handleMockLogin("admin")
                }
              >
                Admin
              </button>

              <button
                type="button"
                onClick={() =>
                  handleMockLogin(
                    "technician",
                  )
                }
              >
                Technician
              </button>
            </div>
          </div>
        )}

        <p className="auth-switch-copy">
          New to DroneOptAI?

          <button
            type="button"
            onClick={onSwitchMode}
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}
