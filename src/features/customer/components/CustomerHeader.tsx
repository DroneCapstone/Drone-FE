import { useEffect, useState } from "react";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import logo from "../../../assets/images/home/logo.png";

import {
  customerApi,
  extractUnreadCount,
} from "../services/customerApi";

/* =========================================================
   NAVIGATION
========================================================= */

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
];

/* =========================================================
   CUSTOMER HEADER
========================================================= */

export function CustomerHeader() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();


  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      try {
        const response =
          await customerApi.getUnreadCount();

        if (!cancelled) {
          setUnreadCount(
            extractUnreadCount(response),
          );
        }
      } catch {
        // Header remains usable when notification API is unavailable.
      }
    }

    loadUnread();

    const timer = window.setInterval(
      loadUnread,
      30000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [location.pathname]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    logout();

    navigate("/", {
      replace: true,
    });
  };

  /* =========================================================
     AVATAR
  ========================================================= */

  const initial =
    user?.name
      ?.trim()
      .charAt(0)
      .toUpperCase() ?? "C";

  /* =========================================================
     ACTIVE NAV
  ========================================================= */

  const isNavActive = (to: string) => {
    const path = location.pathname;

    /* DASHBOARD */
    if (to === "/customer/dashboard") {
      return path === "/customer/dashboard";
    }

    /* CREATE DELIVERY */
    if (
      to === "/customer/deliveries/create"
    ) {
      return (
        path ===
          "/customer/deliveries/create" ||
        path ===
          "/customer/deliveries/review"
      );
    }

    /* MY DELIVERIES */
    if (
      to === "/customer/deliveries"
    ) {
      const isDeliveryRoute =
        path ===
          "/customer/deliveries" ||
        path.startsWith(
          "/customer/deliveries/",
        ) ||
        path.startsWith(
          "/customer/payment/",
        );

      const isCreateFlow =
        path ===
          "/customer/deliveries/create" ||
        path ===
          "/customer/deliveries/review";

      return (
        isDeliveryRoute &&
        !isCreateFlow
      );
    }

    return false;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#060606]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-6 lg:px-10">
        {/* =====================================================
            BRAND
        ====================================================== */}

        <Link
          to="/"
          className="flex shrink-0 items-center gap-3"
        >
          <img
            src={logo}
            alt="DroneOptAI"
            className="h-9 w-auto object-contain"
          />

          <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500 bg-clip-text text-[17px] font-semibold tracking-[-0.02em] text-transparent">
            DroneOptAI
          </span>
        </Link>

        {/* =====================================================
            DESKTOP NAVIGATION
        ====================================================== */}

        <nav className="hidden h-full items-center gap-10 md:flex">
          {navigation.map((item) => {
            const active =
              isNavActive(item.to);

            return (
              <Link
                key={item.to}
                to={
                  item.to ===
                  "/customer/deliveries/create"
                    ? "/customer/deliveries/create?new=1"
                    : item.to
                }
                className="group relative flex h-full items-center px-1"
              >
                {/* LABEL */}
                <span
                  className={`relative z-10 text-[13px] font-medium transition-colors duration-300 ${
                    active
                      ? "text-white"
                      : "text-white/45 group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>

                {/* =============================================
                    UNDERLINE
                    Scale từ giữa ra hai bên
                ============================================== */}

                <span
                  className={`
                    absolute
    bottom-0
    left-1/2
    h-[2px]
    w-full
    -translate-x-1/2
    origin-center
    bg-gradient-to-r
    from-orange-300
    via-orange-600
    to-orange-300
    transition-transform
    duration-300
    ease-out
                    ${
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100"
                    }
                  `}
                />
              </Link>
            );
          })}
        </nav>

        {/* =====================================================
            USER ACTIONS
        ====================================================== */}

        <div className="hidden items-center gap-3 md:flex">
          {/* NOTIFICATIONS */}
          <Link
            to="/customer/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.04] hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-orange-500 px-1 text-center text-[9px] font-bold leading-4 text-black">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </Link>

          <div className="h-8 w-px bg-white/[0.08]" />

          {/* USER */}
          <Link
            to="/customer/profile"
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.035]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-[14px] font-semibold text-black">
              {initial}
            </div>

            <div className="min-w-[95px]">
              <p className="max-w-[145px] truncate text-[13px] font-medium text-white/85">
                {user?.name ??
                  "Customer"}
              </p>

              <p className="mt-0.5 text-[10px] text-white/30">
                Customer
              </p>
            </div>

            <ChevronDown
              size={14}
              className="text-white/25 transition group-hover:text-white/50"
            />
          </Link>

          <div className="h-8 w-px bg-white/[0.08]" />

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.04] hover:text-white"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>

        {/* =====================================================
            MOBILE BUTTON
        ====================================================== */}

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (value) => !value,
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] text-white/70 md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
      </div>

      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      {mobileOpen && (
        <div className="border-t border-white/[0.07] bg-[#060606] px-6 py-5 md:hidden">
          <nav className="flex flex-col">
            {navigation.map((item) => {
              const active =
                isNavActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={
                    item.to ===
                    "/customer/deliveries/create"
                      ? "/customer/deliveries/create?new=1"
                      : item.to
                  }
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={`group relative border-b border-white/[0.06] px-1 py-4 text-[13px] font-medium transition-colors ${
                    active
                      ? "text-white"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  {item.label}

                  <span
                    className={`
                      absolute
                      bottom-0
                      left-1/2
                      h-[2px]
                      w-full
                      -translate-x-1/2
                      origin-center
                      bg-gradient-to-r
                      from-orange-600
                      via-orange-300
                      to-orange-600
                      transition-transform
                      duration-300
                      ease-out
                      ${
                        active
                          ? "scale-x-100"
                          : "scale-x-0 group-hover:scale-x-100"
                      }
                    `}
                  />
                </Link>
              );
            })}
          </nav>

          {/* ===================================================
              MOBILE SECONDARY NAVIGATION
              Same style as Dashboard / Create / My deliveries
          ==================================================== */}

          <div className="flex flex-col">
            {/* NOTIFICATIONS */}
            <Link
              to="/customer/notifications"
              onClick={() =>
                setMobileOpen(false)
              }
              className={`group relative flex min-h-[52px] items-center justify-between border-b border-white/[0.06] px-1 py-4 text-[13px] font-medium transition-colors ${
                location.pathname ===
                "/customer/notifications"
                  ? "text-white"
                  : "text-white/45 hover:text-white"
              }`}
            >
              <span>Notifications</span>

              {unreadCount > 0 && (
                <span className="min-w-[18px] rounded-full bg-orange-500 px-1.5 text-center text-[9px] font-bold leading-[18px] text-black">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}

              <span
                className={`
                  absolute
                  bottom-0
                  left-1/2
                  h-[2px]
                  w-full
                  -translate-x-1/2
                  origin-center
                  bg-gradient-to-r
                  from-orange-600
                  via-orange-300
                  to-orange-600
                  transition-transform
                  duration-300
                  ease-out
                  ${
                    location.pathname ===
                    "/customer/notifications"
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }
                `}
              />
            </Link>

            {/* PROFILE */}
            <Link
              to="/customer/profile"
              onClick={() =>
                setMobileOpen(false)
              }
              className={`group relative flex min-h-[58px] items-center justify-between gap-4 border-b border-white/[0.06] px-1 py-3 text-[13px] font-medium transition-colors ${
                location.pathname ===
                "/customer/profile"
                  ? "text-white"
                  : "text-white/45 hover:text-white"
              }`}
            >
              <span>Profile</span>

              <div className="flex min-w-0 items-center gap-2.5">
                <span className="max-w-[150px] truncate text-[11px] font-normal text-white/35">
                  {user?.name ??
                    "Customer"}
                </span>

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-black">
                  {initial}
                </div>
              </div>

              <span
                className={`
                  absolute
                  bottom-0
                  left-1/2
                  h-[2px]
                  w-full
                  -translate-x-1/2
                  origin-center
                  bg-gradient-to-r
                  from-orange-600
                  via-orange-300
                  to-orange-600
                  transition-transform
                  duration-300
                  ease-out
                  ${
                    location.pathname ===
                    "/customer/profile"
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }
                `}
              />
            </Link>

            {/* SIGN OUT */}
            <button
              type="button"
              onClick={handleLogout}
              className="group relative flex min-h-[52px] w-full items-center border-b border-white/[0.06] px-1 py-4 text-left text-[13px] font-medium text-white/45 transition-colors hover:text-white"
            >
              <span>Sign out</span>

              <span
                className="
                  absolute
                  bottom-0
                  left-1/2
                  h-[2px]
                  w-full
                  -translate-x-1/2
                  origin-center
                  scale-x-0
                  bg-gradient-to-r
                  from-orange-600
                  via-orange-300
                  to-orange-600
                  transition-transform
                  duration-300
                  ease-out
                  group-hover:scale-x-100
                "
              />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}