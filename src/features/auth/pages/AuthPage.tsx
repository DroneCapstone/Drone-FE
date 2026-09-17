import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import droneOptLogo from "../../../assets/images/droneopt-logo.png";

import { LoginForm } from "../components/LoginForm";
import { RegisterForm } from "../components/RegisterForm";

export function AuthPage() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const isRegister =
    location.pathname === "/register";

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

      <section className="auth-card">
        {/* ==================================
            VISUAL
        =================================== */}

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

          {/* Background visual only */}

          <div className="auth-orbit auth-orbit-large" />
          <div className="auth-orbit auth-orbit-small" />

          <div className="auth-route-line" />

          <div className="auth-route-dot auth-route-dot-one" />
          <div className="auth-route-dot auth-route-dot-two" />

         
        </aside>

        {/* ==================================
            FORM
        =================================== */}

        <section className="auth-form-stage">
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={
                !isRegister
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate(
                  "/login",
                  {
                    replace: true,
                  },
                )
              }
            >
              Sign in
            </button>

            <button
              type="button"
              className={
                isRegister
                  ? "active"
                  : ""
              }
              onClick={() =>
                navigate(
                  "/register",
                  {
                    replace: true,
                  },
                )
              }
            >
              Register
            </button>
          </div>

          <div className="auth-form-viewport">
            <div className="auth-form-track">
              <LoginForm
                onSwitchMode={() =>
                  navigate(
                    "/register",
                  )
                }
              />

              <RegisterForm
                onSwitchMode={() =>
                  navigate(
                    "/login",
                  )
                }
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}