import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import logo from "../../../assets/images/home/logo.png";

const navigation = [
  {
    label: "How it works",
    href: "#delivery",
  },
  {
    label: "Aircraft",
    href: "#aircraft",
  },
  {
    label: "Hub network",
    href: "#hub",
  },
  {
    label: "Platform",
    href: "#platform",
  },
];

export function HomeHeader() {
  const [open, setOpen] = useState(false);

  const { user, isAuthenticated } = useAuth();

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
      <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-6 lg:px-12">
        {/* BRAND */}
        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <img
            src={logo}
            alt="DroneOptAI"
            className="h-10 w-auto object-contain"
          />

          <div className="flex items-baseline tracking-[-0.035em]">
            <span className="bg-gradient-to-r from-[#F9B35B] via-[#F28A3C] to-[#ED742E] bg-clip-text text-[18px] font-semibold text-transparent">
              Drone
            </span>

            <span className="bg-gradient-to-r from-[#F1A14B] to-[#ED742E] bg-clip-text text-[18px] font-light text-transparent">
              OptAI
            </span>
          </div>
        </Link>

        {/* NAV */}
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

        {/* DESKTOP ACTIONS */}
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
  className="
    inline-flex h-11 items-center justify-center
    rounded-md
    bg-orange-500
    px-6
    text-[13px] font-semibold text-black
    shadow-[0_8px_24px_rgba(249,115,22,0.14)]
    transition-all duration-200
    hover:-translate-y-[1px]
    hover:bg-orange-400
    hover:shadow-[0_10px_28px_rgba(249,115,22,0.20)]
  "
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

        {/* MOBILE BUTTON */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-white lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? (
            <X size={23} />
          ) : (
            <Menu size={23} />
          )}
        </button>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="border-t border-white/[0.07] bg-[#050505] px-6 py-6 lg:hidden">
          <nav className="flex flex-col">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/[0.06] py-4 text-sm text-white/60"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-6">
            {!isAuthenticated ? (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="border border-white/15 px-5 py-3 text-center text-sm text-white"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="bg-[#ED742E] px-5 py-3 text-center text-sm font-semibold text-black"
                >
                  Register
                </Link>
              </div>
            ) : user?.role === "customer" ? (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/customer/deliveries"
                  onClick={() => setOpen(false)}
                  className="border border-white/15 px-4 py-3 text-center text-sm text-white"
                >
                  My deliveries
                </Link>

                <Link
                  to="/customer/deliveries/create"
                  onClick={() => setOpen(false)}
                  className="bg-[#ED742E] px-4 py-3 text-center text-sm font-semibold text-black"
                >
                  Create delivery
                </Link>
              </div>
            ) : (
              <Link
                to={getWorkspacePath()}
                onClick={() => setOpen(false)}
                className="block bg-[#ED742E] px-5 py-3 text-center text-sm font-semibold text-black"
              >
                Open workspace
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}