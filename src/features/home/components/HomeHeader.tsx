import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import logo from "../../../assets/images/home/logo.png";

const navigation = [
  { label: "How it works", href: "#delivery" },
  { label: "Drone", href: "#aircraft" },
  { label: "Hub network", href: "#hub" },
  { label: "Platform", href: "#platform" },
];

export function HomeHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const getWorkspacePath = () => {
    switch (user?.role) {
      case "customer":
        return "/customer/dashboard";
      case "operator":
        return "/operator/dashboard";
      case "technician":
        return "/technician/dashboard";
      case "admin":
        return "/admin/dashboard";
      default:
        return "/login";
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#050505]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between px-5 sm:px-6 lg:h-[76px] lg:px-12">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logo}
            alt="DroneOptAI"
            className="h-8 w-auto object-contain lg:h-10"
          />

          <div className="flex items-baseline tracking-[-0.035em]">
            <span className="bg-gradient-to-r from-[#F9B35B] via-[#F28A3C] to-[#ED742E] bg-clip-text text-[16px] font-semibold text-transparent lg:text-[18px]">
              Drone
            </span>
            <span className="bg-gradient-to-r from-[#F1A14B] to-[#ED742E] bg-clip-text text-[16px] font-light text-transparent lg:text-[18px]">
              OptAI
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[13px] font-medium text-white/45 transition-colors duration-200 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="px-5 py-3 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
              >
                Sign in
              </Link>

              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center rounded-md bg-orange-500 px-6 text-[13px] font-semibold text-black shadow-[0_8px_24px_rgba(249,115,22,0.14)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-orange-400 hover:shadow-[0_10px_28px_rgba(249,115,22,0.20)]"
              >
                Register
              </Link>
            </>
          ) : user?.role === "customer" ? (
            <>
              <Link
                to="/customer/deliveries"
                className="px-5 py-3 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
              >
                My deliveries
              </Link>

              <Link
                to="/customer/deliveries/create"
                className="bg-orange-500 px-7 py-3 text-[13px] font-semibold text-black transition-colors hover:bg-orange-400"
              >
                Create delivery
              </Link>
            </>
          ) : (
            <Link
              to={getWorkspacePath()}
              className="bg-[#ED742E] px-7 py-3 text-[13px] font-semibold text-black transition-colors hover:bg-[#F5823A]"
            >
              Open workspace
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] text-white/80 transition hover:bg-white/[0.04] hover:text-white lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-[68px] h-[calc(100svh-68px)] bg-[#050505] lg:hidden">
          <div className="flex h-full flex-col px-5 pb-6 pt-4 sm:px-6">
            <nav className="flex flex-col">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex h-[54px] items-center border-b border-white/[0.07] text-[15px] font-medium text-white/72 transition hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto pt-6">
              {!isAuthenticated ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center justify-center rounded-xl border border-white/15 text-[13px] font-medium text-white"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center justify-center rounded-xl bg-orange-500 text-[13px] font-semibold text-black"
                  >
                    Register
                  </Link>
                </div>
              ) : user?.role === "customer" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/customer/deliveries"
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center justify-center rounded-xl border border-white/15 text-[13px] font-medium text-white"
                  >
                    My deliveries
                  </Link>

                  <Link
                    to="/customer/deliveries/create"
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center justify-center rounded-xl bg-orange-500 text-[13px] font-semibold text-black"
                  >
                    Create delivery
                  </Link>
                </div>
              ) : (
                <Link
                  to={getWorkspacePath()}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center justify-center rounded-xl bg-orange-500 text-[13px] font-semibold text-black"
                >
                  Open workspace
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
