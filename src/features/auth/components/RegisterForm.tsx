import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { Input } from "../../../components/ui/Input";

export function RegisterForm({
  onSwitchMode,
}: {
  onSwitchMode: () => void;
}) {
  const navigate =
    useNavigate();

  const { register } =
    useAuth();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );

      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match.",
      );

      return;
    }

    setSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
      });

      navigate(
        "/customer/dashboard",
        {
          replace: true,
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create account.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form-slide">
      <div className="auth-form-content">
        <span className="auth-eyebrow">
          CREATE ACCOUNT
        </span>

        <h1>Join DroneOptAI.</h1>

        <p className="auth-form-copy">
          Create your account to get started.
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Full name</span>

            <Input
              autoComplete="name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Your name"
              required
            />
          </label>

          <label className="auth-field">
            <span>Email address</span>

            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="name@email.com"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>

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
            <span>
              Confirm password
            </span>

            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Repeat password"
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

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            <span>
              {submitting
                ? "Creating…"
                : "Create account"}
            </span>

            <b>→</b>
          </button>
        </form>

        <p className="auth-switch-copy">
          Already have an account?

          <button
            type="button"
            onClick={onSwitchMode}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
