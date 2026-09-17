import {
  useState,
  type FormEvent,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type {
  AuthUser,
  UserRole,
} from "../types/auth";

interface LoginFormProps {
  onSwitchMode: () => void;
}

function getRolePath(user: AuthUser) {
  switch (user.role) {
    case "operator":
      return "/operator/dashboard";

    case "customer":
      return "/customer/dashboard";

    case "admin":
      return "/admin/dashboard";

    case "technician":
      return "/technician/dashboard";

    default:
      return "/";
  }
}

export function LoginForm({
  onSwitchMode,
}: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();

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

      const from = (
        location.state as {
          from?: {
            pathname?: string;
          };
        } | null
      )?.from?.pathname;

      navigate(
        from ?? getRolePath(user),
        {
          replace: true,
        },
      );
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
    const user =
      loginAsRole(role);

    navigate(
      getRolePath(user),
      {
        replace: true,
      },
    );
  };

  const handleGoogleLogin = () => {
    const user =
      loginWithGoogle();

    navigate(
      getRolePath(user),
      {
        replace: true,
      },
    );
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

        {/* =========================
            GOOGLE
        ========================== */}

        <button
          type="button"
          className="auth-google"
          onClick={handleGoogleLogin}
        >
          <span className="google-mark">
            G
          </span>

          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* =========================
            NORMAL LOGIN
        ========================== */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Email address</span>

            <input
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@droneopt.ai"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>

            <span className="auth-password-wrap">
              <input
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

        {/* =========================
            MOCK ROLE LOGIN
        ========================== */}

        <div className="auth-demo">
          <span className="auth-demo-label">
            DEMO ACCESS
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
                handleMockLogin(
                  "admin",
                )
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