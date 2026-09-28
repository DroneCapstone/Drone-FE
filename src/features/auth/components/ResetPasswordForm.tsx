import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { Input } from "../../../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

  const { resetPassword } = useAuth();

  const tokenFromUrl = useMemo(
    () =>
      searchParams.get("token") ??
      searchParams.get("reset_token") ??
      searchParams.get("code") ??
      "",
    [searchParams],
  );

  const [manualToken, setManualToken] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const effectiveToken =
    tokenFromUrl || manualToken.trim();

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!effectiveToken) {
      setError(
        "Reset token is required.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const nextMessage =
        await resetPassword({
          token: effectiveToken,
          newPassword: password,
        });

      setMessage(nextMessage);
      setPassword("");
      setConfirmPassword("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to reset password.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="auth-form-slide"
      style={{
        width: "100%",
        minWidth: "100%",
      }}
    >
      <div className="auth-form-content">
        <span className="auth-eyebrow">
          SET NEW PASSWORD
        </span>

        <h1>Reset password.</h1>

        <p className="auth-form-copy">
          Choose a new password for your DroneOptAI account.
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {!tokenFromUrl && (
            <label className="auth-field">
              <span>Reset token</span>

              <Input
                value={manualToken}
                onChange={(event) =>
                  setManualToken(
                    event.target.value,
                  )
                }
                placeholder="Paste reset token"
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span>New password</span>

            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Minimum 8 characters"
              required
            />
          </label>

          <label className="auth-field">
            <span>Confirm new password</span>

            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Repeat new password"
              required
            />
          </label>

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="auth-error"
              role="status"
              style={{
                borderColor:
                  "rgba(34,197,94,.28)",
                color: "#22c55e",
              }}
            >
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={submitting}
          >
            <span>
              {submitting
                ? "Resetting…"
                : "Reset password"}
            </span>
            <b>→</b>
          </button>
        </form>

        <p className="auth-switch-copy">
          {message
            ? "Password updated."
            : "Return to your account?"}

          <button
            type="button"
            onClick={() =>
              navigate("/login", {
                replace: Boolean(message),
              })
            }
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
