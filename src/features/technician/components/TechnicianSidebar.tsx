import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import droneOptLogo from "../../../assets/images/droneopt-logo.png";
import { useAuth } from "../../auth/hooks/useAuth";
import { technicianNavigation } from "../technicianNavigation";

interface TechnicianSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export function TechnicianSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: TechnicianSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <motion.aside
        animate={{
          width: collapsed ? 78 : 252,
        }}
        transition={{
          duration: 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`
          fixed left-0 top-0 z-40 h-screen
          border-r border-zinc-800/80
          bg-[#0b0c0e]
          ${mobileOpen ? "translate-x-0" : ""}
          max-lg:-translate-x-full
          max-lg:data-[open=true]:translate-x-0
        `}
        data-open={mobileOpen}
      >
        <div className="flex h-full flex-col px-3 py-5">
          {/* BRAND */}
          <NavLink
            to="/technician/dashboard"
            className={`
              flex h-12 items-center
              ${collapsed ? "justify-center" : "gap-2 px-2"}
            `}
          >
            <img
  src={droneOptLogo}
  alt="DroneOptAI"
  className="h-12 w-14 object-contain"
/>

{!collapsed && (
  <span
    className="
      flex items-baseline
      whitespace-nowrap
      text-[25px]
      tracking-[-0.055em]
      text-orange-500
    "
  >
    <strong className="font-semibold">
      Drone
    </strong>

    <span className="font-light">
      OptAI
    </span>
  </span>
)}
          </NavLink>

          {/* SECTION LABEL */}
          {!collapsed && (
            <span className="mt-8 px-3 text-[10px] font-normal tracking-[0.22em] text-zinc-500">
  CONTROL
</span>
          )}

          {/* NAV */}
          <nav className="mt-3 flex flex-1 flex-col gap-1">
            {technicianNavigation.map(({ label, path, icon: Icon }) => {
              const active =
                pathname === path || pathname.startsWith(`${path}/`);

              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onCloseMobile}
                  title={collapsed ? label : undefined}
                  className={`
                    group relative flex h-12 items-center rounded-md
                    transition-colors duration-200
                    ${collapsed ? "justify-center" : "gap-3 px-3"}
                    ${
                      active
                        ? "text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-200"
                    }
                  `}
                >
                  {/* LEFT ACTIVE BAR */}
{active && (
  <span
    className="
      absolute
      left-0
      top-1/2
      h-6
      w-[2px]
      -translate-y-1/2
      rounded-r
      bg-orange-500
    "
  />
)}

                  {/* ICON */}
                  <Icon
  size={19}
  strokeWidth={1.45}
  className={
    active
      ? "text-orange-500"
      : "text-zinc-400 transition-colors group-hover:text-zinc-200"
  }
/>
                  {/* LABEL */}
                  {!collapsed && (
  <span
  className={`
    text-[16px]
    tracking-[0.005em]

    ${
      active
        ? "font-semibold text-zinc-100"
        : "font-normal text-zinc-400 group-hover:text-zinc-200"
    }
  `}
>
  {label}
</span>
)}

                  {/* ACTIVE OMBRE LINE */}
                  {/* HOVER OMBRE LINE */}
{!active && !collapsed && (
  <span
    className="
      pointer-events-none

      absolute
      bottom-[1px]
      left-3
      right-3

      h-[2px]

      origin-left
      scale-x-0

      rounded-full

      bg-gradient-to-r
      from-[#e5522c]
      via-[#f47a21]
      to-[#ffd36a]

      transition-transform
      duration-250
      ease-out

      group-hover:scale-x-100
    "
  />
)}
                </NavLink>
              );
            })}
          </nav>

          {/* LOGOUT */}
          <div className="border-t border-zinc-800/80 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              title={collapsed ? "Log out" : undefined}
              className={`
                group relative flex h-11 w-full items-center rounded-md
                text-zinc-500 transition-colors duration-200
                hover:text-zinc-200
                ${collapsed ? "justify-center" : "gap-3 px-3"}
              `}
            >
              <LogOut
                size={19}
                strokeWidth={1.4}
                className="transition-colors group-hover:text-orange-500"
              />

              {!collapsed && (
                <span className="text-[14px] font-light tracking-[-0.015em]">
                  Log out
                </span>
              )}
            </button>
          </div>
        </div>

        {/* COLLAPSE */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="
            absolute right-[-14px] top-1/2
  grid h-[52px] w-7
  -translate-y-1/2
  place-items-center
  rounded-lg
  border border-zinc-800
  bg-[#101216]
  text-zinc-500
  transition
  hover:border-zinc-700
  hover:text-orange-500
  max-lg:hidden
          "
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
      </motion.aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
    </>
  );
}