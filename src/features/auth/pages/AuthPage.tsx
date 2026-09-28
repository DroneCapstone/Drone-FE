import {
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import droneOptLogo from "../../../assets/images/droneopt-logo.png";

import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { LoginForm } from "../components/LoginForm";
import { RegisterForm } from "../components/RegisterForm";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

type AuthMode =
  | "login"
  | "register"
  | "forgot"
  | "reset";

function getAuthMode(
  pathname: string,
): AuthMode {
  if (pathname === "/register") {
    return "register";
  }

  if (pathname === "/forgot-password") {
    return "forgot";
  }

  if (pathname === "/reset-password") {
    return "reset";
  }

  return "login";
}

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion =
    useReducedMotion();

  const mode = getAuthMode(
    location.pathname,
  );

  const isRegister =
    mode === "register";

  const isRecovery =
    mode === "forgot" ||
    mode === "reset";

  return (
    <main
      className={`auth-page ${
        isRegister
          ? "is-register"
          : "is-login"
      }`}
    >
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />
      <div className="auth-grid" />

      <motion.section
        className="auth-card"
        initial={
          reduceMotion
            ? false
            : {
                opacity: 0,
                y: 10,
                scale: 0.992,
              }
        }
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.28,
          ease: "easeOut",
        }}
      >
        <aside className="auth-visual">
          <div className="auth-brand">
            <img
              src={droneOptLogo}
              alt=""
            />

            <span className="auth-brand-name">
              <strong>Drone</strong>
              <span>OptAI</span>
            </span>
          </div>

          <div className="auth-orbit auth-orbit-large" />
          <div className="auth-orbit auth-orbit-small" />
          <div className="auth-route-line" />
          <div className="auth-route-dot auth-route-dot-one" />
          <div className="auth-route-dot auth-route-dot-two" />
        </aside>

        <section className="auth-form-stage">
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={
                mode === "login" ||
                isRecovery
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate("/login", {
                  replace: true,
                })
              }
            >
              Sign in
            </button>

            <button
              type="button"
              className={
                mode === "register"
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate("/register", {
                  replace: true,
                })
              }
            >
              Register
            </button>
          </div>

          <div className="auth-form-viewport">
            {mode === "login" && (
              <div className="auth-form-track">
                <LoginForm
                  onSwitchMode={() =>
                    navigate("/register")
                  }
                />

                <RegisterForm
                  onSwitchMode={() =>
                    navigate("/login")
                  }
                />
              </div>
            )}

            {mode === "register" && (
              <div className="auth-form-track">
                <LoginForm
                  onSwitchMode={() =>
                    navigate("/register")
                  }
                />

                <RegisterForm
                  onSwitchMode={() =>
                    navigate("/login")
                  }
                />
              </div>
            )}

            {mode === "forgot" && (
              <ForgotPasswordForm />
            )}

            {mode === "reset" && (
              <ResetPasswordForm />
            )}
          </div>
        </section>
      </motion.section>
    </main>
  );
}
