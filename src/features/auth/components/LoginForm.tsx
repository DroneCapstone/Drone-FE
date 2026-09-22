import { useState, type FormEvent } from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import { Input } from "../../../components/ui/Input";

import type { UserRole } from "../types/auth";

interface LoginFormProps {
  onSwitchMode: () => void;
}

const ROLE_PATHS: Partial<Record<UserRole, string>> = {
  customer: "/customer/dashboard",
  operator: "/operator/dashboard",
  technician: "/technician/dashboard",
};

export function LoginForm({ onSwitchMode }: LoginFormProps) {
  const navigate = useNavigate();

  const { loginAsRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // NORMAL LOGIN
  // Tạm thời không redirect
  // =========================================================
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    // Sau này khi nối backend thì xử lý login tại đây.
  };

  // =========================================================
  // MOCK ROLE LOGIN
  // Chỉ các role đã có page mới được redirect
  // =========================================================
  const handleMockLogin = (role: UserRole) => {
    const path = ROLE_PATHS[role];

    // Role chưa có route thì không làm gì
    if (!path) {
      return;
    }

    loginAsRole(role);

    navigate(path, {
      replace: true,
    });
  };

  // =========================================================
  // GOOGLE
  // Tạm thời không redirect
  // =========================================================
  const handleGoogleLogin = () => {
    // Sau này implement Google login tại đây.
  };

  return (
    <div className="auth-form-slide">
      <div className="auth-form-content">
        <span className="auth-eyebrow">SECURE ACCESS</span>

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
          <span className="google-mark">G</span>
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

            <Input
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
              <Input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter password"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword((value) => !value)
                }
              >
                {showPassword ? "Hide" : "Show"}
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
          >
            <span>Sign in</span>
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
            {/* CUSTOMER */}
            <button
              type="button"
              onClick={() =>
                handleMockLogin("customer")
              }
            >
              Customer
            </button>

            {/* OPERATOR */}
            <button
              type="button"
              onClick={() =>
                handleMockLogin("operator")
              }
            >
              Operator
            </button>

            {/* ADMIN - chưa có */}
            <button
              type="button"
              onClick={() =>
                handleMockLogin("admin")
              }
            >
              Admin
            </button>

            {/* TECHNICIAN */}
            <button
              type="button"
              onClick={() =>
                handleMockLogin("technician")
              }
            >
              Technician
            </button>
          </div>
        </div>

        {/* =========================
            REGISTER
        ========================== */}

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