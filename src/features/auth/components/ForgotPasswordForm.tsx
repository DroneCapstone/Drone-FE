import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import { Input } from "../../../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const nextMessage =
        await forgotPassword({
          email,
        });

      setMessage(nextMessage);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to request a password reset.",
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
          ACCOUNT RECOVERY
        </span>

        <h1>Forgot password?</h1>

        <p className="auth-form-copy">
          Enter the email address linked to your account. We will request reset instructions from the Backend.
        </p>

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
                ? "Sending…"
                : "Send reset request"}
            </span>
            <b>→</b>
          </button>
        </form>

        <p className="auth-switch-copy">
          Remember your password?

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
          >
            Back to sign in
          </button>
        </p>

        <p className="auth-switch-copy">
          Already have a reset token?

          <button
            type="button"
            onClick={() =>
              navigate(
                "/reset-password",
              )
            }
          >
            Reset password
          </button>
        </p>
      </div>
    </div>
  );
}
