import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  ChevronDown,
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

import {
  technicianNavigation,
  type TechnicianNavigationItem,
} from "../technicianNavigation";

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

  const maintenanceActive =
    pathname.startsWith("/technician/maintenance");

  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>({
      Maintenance: maintenanceActive,
    });

  const handleLogout = () => {
    logout();

    navigate("/login", {
      replace: true,
    });
  };

  const toggleGroup = (
    item: TechnicianNavigationItem,
  ) => {
    const firstChildPath =
      item.children?.[0]?.path;

    if (collapsed) {
      if (firstChildPath) {
        navigate(firstChildPath);
      }

      return;
    }

    setOpenGroups((current) => ({
      ...current,
      [item.label]:
        !(
          current[item.label] ??
          pathname.startsWith(
            `${item.path}/`,
          )
        ),
    }));
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
          <nav className="mt-3 min-h-0 flex flex-1 flex-col gap-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {technicianNavigation.map((item) => {
              const Icon = item.icon;

              const hasChildren =
                Boolean(item.children?.length);

              const active =
                pathname === item.path ||
                pathname.startsWith(
                  `${item.path}/`,
                );

              const expanded =
                openGroups[item.label] ??
                active;

              if (hasChildren) {
                const children =
                  item.children ?? [];

                const activeChildIndex =
                  children.findIndex(
                    (child) =>
                      pathname === child.path ||
                      pathname.startsWith(
                        `${child.path}/`,
                      ),
                  );

                const dotIndex =
                  activeChildIndex >= 0
                    ? activeChildIndex
                    : 0;

                const dotY =
                  dotIndex * 40 + 17;

                return (
                  <div key={item.path}>
                    <button
                      type="button"
                      title={
                        collapsed
                          ? item.label
                          : undefined
                      }
                      onClick={() =>
                        toggleGroup(item)
                      }
                      className={`
                        group relative flex h-12 w-full origin-left items-center rounded-md
                        transition-[color,transform] duration-200
                        hover:scale-[1.015]
                        ${
                          collapsed
                            ? "justify-center"
                            : "gap-3 px-3"
                        }
                        ${
                          active
                            ? "text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-200"
                        }
                      `}
                    >
                      {active && (
                        <span
                          className="
                            absolute left-0 top-1/2
                            h-6 w-[2px]
                            -translate-y-1/2
                            rounded-r
                            bg-orange-500
                          "
                        />
                      )}

                      <Icon
                        size={19}
                        strokeWidth={1.45}
                        className={
                          active
                            ? "text-orange-500"
                            : "text-zinc-400 transition-colors group-hover:text-zinc-200"
                        }
                      />

                      {!collapsed && (
                        <>
                          <span
                            className={`
                              flex-1 text-left
                              text-[16px]
                              tracking-[0.005em]
                              ${
                                active
                                  ? "font-semibold text-zinc-100"
                                  : "font-normal text-zinc-400 group-hover:text-zinc-200"
                              }
                            `}
                          >
                            {item.label}
                          </span>

                          <ChevronDown
                            size={15}
                            className={`
                              transition-transform duration-200
                              ${
                                expanded
                                  ? "rotate-0"
                                  : "-rotate-90"
                              }
                            `}
                          />

                          {
                            !collapsed && (
                              <span
                                className="
                                  pointer-events-none
                                  absolute bottom-[1px]
                                  left-3 right-3
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
                        </>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {!collapsed &&
                        expanded && (
                          <motion.div
                            key={`${item.path}-children`}
                            initial={{
                              height: 0,
                              opacity: 0,
                            }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                              transition: {
                                duration: 0.18,
                                delay: 0.16,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            }}
                            transition={{
                              duration: 0.22,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="overflow-hidden"
                          >
                            <div className="relative ml-[26px] border-l border-zinc-800/80 py-1 pl-4">
                              <motion.span
                                initial={{
                                  y: -4,
                                  opacity: 0,
                                }}
                                animate={{
                                  y: dotY,
                                  opacity: 1,
                                }}
                                exit={{
                                  y: -4,
                                  opacity: 0,
                                }}
                                transition={{
                                  duration: 0.24,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                                className="
                                  pointer-events-none
                                  absolute -left-[3px] top-0
                                  z-10 h-1.5 w-1.5
                                  rounded-full
                                  bg-orange-500
                                "
                              />

                              {children.map(
                                (child) => {
                                  const childActive =
                                    pathname ===
                                      child.path ||
                                    pathname.startsWith(
                                      `${child.path}/`,
                                    );

                                  return (
                                    <NavLink
                                      key={child.path}
                                      to={child.path}
                                      onClick={
                                        onCloseMobile
                                      }
                                      className={`
                                        group relative flex h-10 items-center
                                        px-3 text-[14px]
                                        transition-colors duration-150
                                        ${
                                          childActive
                                            ? "font-semibold text-zinc-100"
                                            : "font-normal text-zinc-500 hover:text-zinc-200"
                                        }
                                      `}
                                    >
                                      {child.label}
                                    </NavLink>
                                  );
                                },
                              )}
                            </div>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={
                    onCloseMobile
                  }
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                  className={`
                    group relative flex h-12 origin-left items-center rounded-md
                    transition-[color,transform] duration-200
                    hover:scale-[1.015]
                    ${
                      collapsed
                        ? "justify-center"
                        : "gap-3 px-3"
                    }
                    ${
                      active
                        ? "text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-200"
                    }
                  `}
                >
                  {active && (
                    <span
                      className="
                        absolute left-0 top-1/2
                        h-6 w-[2px]
                        -translate-y-1/2
                        rounded-r
                        bg-orange-500
                      "
                    />
                  )}

                  <Icon
                    size={19}
                    strokeWidth={1.45}
                    className={
                      active
                        ? "text-orange-500"
                        : "text-zinc-400 transition-colors group-hover:text-zinc-200"
                    }
                  />

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
                      {item.label}
                    </span>
                  )}

                  {!collapsed && (
                    <span
                      className="
                        pointer-events-none
                        absolute bottom-[1px]
                        left-3 right-3
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
          <div className="shrink-0 border-t border-zinc-800/80 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              title={
                collapsed
                  ? "Log out"
                  : undefined
              }
              className={`
                group relative flex h-11 w-full items-center rounded-md
                text-zinc-500 transition-colors duration-200
                hover:text-zinc-200
                ${
                  collapsed
                    ? "justify-center"
                    : "gap-3 px-3"
                }
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
          onClick={
            onToggleCollapsed
          }
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
