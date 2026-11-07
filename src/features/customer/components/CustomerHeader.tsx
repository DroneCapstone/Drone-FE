import {
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "../customerTheme.css";
import { setCustomerTheme, useCustomerTheme } from "../customerTheme";

import logo from "../../../assets/images/home/logo.png";
import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerApi,
  extractUnreadCount,
} from "../services/customerApi";

const navigation = [
  {
    label: "Dashboard",
    to: "/customer/dashboard",
  },
  {
    label: "Create delivery",
    to: "/customer/deliveries/create",
  },
  {
    label: "My deliveries",
    to: "/customer/deliveries",
  },
  {
    label: "Pricing & services",
    to: "/customer/pricing",
  },
  {
    label: "Help & policies",
    to: "/customer/help",
  },
];

export function CustomerHeader() {
  const theme = useCustomerTheme();
  const isLight = theme === "light";

  // Customer-only: never change the Operator, Technician or Admin themes.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-customer-theme", theme);
    return () => { document.documentElement.removeAttribute("data-customer-theme"); };
  }, [theme]);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const { user, logout } =
    useAuth();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      try {
        const response =
          await customerApi.getUnreadCount();

        if (!cancelled) {
          setUnreadCount(
            extractUnreadCount(
              response,
            ),
          );
        }
      } catch {
        // Keep the header usable even if notifications fail.
      }
    }

    void loadUnread();

    const timer =
      window.setInterval(
        () => {
          void loadUnread();
        },
        30000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        timer,
      );
    };
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();

    navigate("/", {
      replace: true,
    });
  };

  const initial =
    user?.name
      ?.trim()
      .charAt(0)
      .toUpperCase() ??
    "C";

  const isNavActive = (
    to: string,
  ) => {
    const path =
      location.pathname;

    if (
      to ===
      "/customer/dashboard"
    ) {
      return path === to;
    }

    if (
      to ===
      "/customer/deliveries/create"
    ) {
      return (
        path ===
          "/customer/deliveries/create" ||
        path ===
          "/customer/deliveries/review"
      );
    }

    if (
      to ===
      "/customer/deliveries"
    ) {
      const deliveryRoute =
        path ===
          "/customer/deliveries" ||
        path.startsWith(
          "/customer/deliveries/",
        ) ||
        path.startsWith(
          "/customer/payment/",
        );

      const createFlow =
        path ===
          "/customer/deliveries/create" ||
        path ===
          "/customer/deliveries/review";

      return (
        deliveryRoute &&
        !createFlow
      );
    }

    return path === to;
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#050505]/98 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
          {/* BRAND */}
          <Link
            to="/customer/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            <img
              src={logo}
              alt="DroneOptAI"
              className="h-8 w-auto object-contain sm:h-9"
            />

            <span className="text-[16px] font-semibold tracking-[-0.025em] text-orange-400 sm:text-[17px]">
              DroneOptAI
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden h-full items-center gap-5 lg:flex xl:gap-7">
            {navigation.map(
              (item) => {
                const active =
                  isNavActive(
                    item.to,
                  );

                const target =
                  item.to ===
                  "/customer/deliveries/create"
                    ? "/customer/deliveries/create?new=1"
                    : item.to;

                return (
                  <Link
                    key={item.to}
                    to={target}
                    className="relative flex h-full items-center px-0.5"
                  >
                    <span
                      className={`text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300 bg-clip-text font-bold text-transparent"
                          : "text-white/54 hover:text-white"
                      }`}
                    >
                      {
                        item.label
                      }
                    </span>

                    {active && (
                      <span className="absolute bottom-0 left-0 h-[2px] w-full bg-orange-500" />
                    )}
                  </Link>
                );
              },
            )}
          </nav>

          {/* DESKTOP ACCOUNT */}
          <div className="hidden items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={() => setCustomerTheme(isLight ? "dark" : "light")}
              className="customer-theme-icon-button flex h-9 w-9 items-center justify-center rounded-lg text-white/72 transition hover:bg-white/[0.07] hover:text-orange-400"
              aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
              title={isLight ? "Dark mode" : "Light mode"}
            >
              {isLight ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <Link
              to="/customer/notifications"
              className={`relative flex h-9 w-9 items-center justify-center text-white/48 transition hover:text-white ${
                location.pathname ===
                "/customer/notifications"
                  ? "bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300 bg-clip-text font-bold text-transparent"
                  : ""
              }`}
              aria-label="Notifications"
            >
              <Bell size={17} />

              {unreadCount >
                0 && (
                <span className="absolute right-0 top-0 min-w-[15px] rounded-full bg-orange-500 px-1 text-center text-[8px] font-bold leading-[15px] text-black">
                  {unreadCount >
                  99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </Link>

            <Link
              to="/customer/profile"
              className="flex items-center gap-3 px-1.5 py-1"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-[13px] font-semibold text-black">
                {initial}
              </div>

              <div className="hidden min-w-0 xl:block">
                <p className="max-w-[150px] truncate text-[12px] font-medium text-white/88">
                  {user?.name ??
                    "Customer"}
                </p>

                <p className="mt-0.5 text-[10px] text-white/38">
                  Customer
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="flex h-9 w-9 items-center justify-center text-white/38 transition hover:text-white"
              aria-label="Sign out"
            >
              <LogOut
                size={16}
              />
            </button>
          </div>

          {/* MOBILE BUTTON */}
          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (value) =>
                  !value,
              )
            }
            className="flex h-10 w-10 items-center justify-center text-white/72 transition hover:text-white lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={
              mobileOpen
            }
          >
            {mobileOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() =>
            setMobileOpen(false)
          }
          className="fixed inset-0 top-[72px] z-40 bg-black/55 lg:hidden"
        />
      )}

      {/* MOBILE NAV */}
      <div
        className={`fixed inset-x-0 top-[72px] z-50 transition duration-200 lg:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div className="mx-auto max-h-[calc(100vh-72px)] max-w-[520px] overflow-y-auto border-x border-b border-white/[0.07] bg-[#080808] px-5 pb-5 pt-3 shadow-[0_24px_50px_rgba(0,0,0,0.46)]">
          <nav>
            {navigation.map(
              (item) => {
                const active =
                  isNavActive(
                    item.to,
                  );

                const target =
                  item.to ===
                  "/customer/deliveries/create"
                    ? "/customer/deliveries/create?new=1"
                    : item.to;

                return (
                  <Link
                    key={item.to}
                    to={target}
                    onClick={() =>
                      setMobileOpen(
                        false,
                      )
                    }
                    className={`relative flex h-[49px] items-center px-4 text-[13px] font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300 bg-clip-text font-bold text-transparent"
                        : "text-white/72 hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-orange-500" />
                    )}

                    {
                      item.label
                    }
                  </Link>
                );
              },
            )}

            <Link
              to="/customer/notifications"
              onClick={() =>
                setMobileOpen(false)
              }
              className={`relative flex h-[49px] items-center justify-between px-4 text-[13px] font-medium transition ${
                location.pathname ===
                "/customer/notifications"
                  ? "bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300 bg-clip-text font-bold text-transparent"
                  : "text-white/72 hover:text-white"
              }`}
            >
              {location.pathname ===
                "/customer/notifications" && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-orange-500" />
              )}

              <span>
                Notifications
              </span>

              {unreadCount >
                0 && (
                <span className="min-w-[20px] rounded-full bg-orange-500 px-1.5 text-center text-[9px] font-bold leading-[20px] text-black">
                  {unreadCount >
                  99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          <div className="my-3 h-px bg-white/[0.08]" />

          <Link
            to="/customer/profile"
            onClick={() =>
              setMobileOpen(false)
            }
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p
                className={`max-w-[220px] truncate text-[13px] ${
                  location.pathname ===
                  "/customer/profile"
                    ? "bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300 bg-clip-text font-bold text-transparent"
                    : "font-medium text-white/90"
                }`}
              >
                {user?.name ??
                  "Customer"}
              </p>

              <p className="mt-1 text-[10px] text-white/42">
                View profile
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[12px] font-semibold text-black">
              {initial}
            </div>
          </Link>

          <div className="customer-appearance mx-4 mb-2 mt-1 flex items-center justify-between gap-3 rounded-xl border border-white/[0.10] bg-white/[0.025] p-3">
            <div className="flex items-center gap-2.5 text-white/80">
              {isLight ? <Sun size={16} className="text-orange-500" /> : <Moon size={16} className="text-orange-400" />}
              <span className="text-[12px] font-medium">Appearance</span>
            </div>
            <div className="flex rounded-lg border border-white/[0.10] bg-white/[0.035] p-0.5" role="group" aria-label="Customer appearance">
              <button type="button" onClick={() => setCustomerTheme("dark")}
                aria-pressed={!isLight}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${!isLight ? "bg-orange-500 text-black" : "text-white/62 hover:text-white"}`}>
                Dark
              </button>
              <button type="button" onClick={() => setCustomerTheme("light")}
                aria-pressed={isLight}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${isLight ? "bg-orange-500 text-black" : "text-white/62 hover:text-white"}`}>
                Light
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-1 flex h-[46px] w-full items-center px-4 text-left text-[13px] font-medium text-white/54 transition hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
