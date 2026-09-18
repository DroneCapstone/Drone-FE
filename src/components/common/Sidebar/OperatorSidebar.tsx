import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { LogOut } from "lucide-react";

import { operatorNavigation } from "../../../constants/operatorNavigation";

import { useAuth } from "../../../features/auth/hooks/useAuth";

import { Icon } from "../../ui/Icon";

import droneOptLogo from "../../../assets/images/droneopt-logo.png";

interface OperatorSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export function OperatorSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: OperatorSidebarProps) {
  const { pathname } = useLocation();

  const reduceMotion = useReducedMotion();

  const navigate = useNavigate();

  const { logout } = useAuth();

  const handleLogout = () => {
    /*
     * Quan trọng:
     * phải logout khỏi AuthContext trước.
     *
     * Nếu chỉ navigate("/login"),
     * AppRoutes thấy isAuthenticated = true
     * và redirect ngược về dashboard.
     */
    logout();

    navigate("/login", {
      replace: true,
    });

    onCloseMobile();
  };

  return (
    <>
      <aside
        className={`sidebar ${mobileOpen ? "is-open" : ""
          } ${collapsed ? "is-collapsed" : ""}`}
      >
        {/* =========================
            BRAND
        ========================= */}

        <div className="brand-row">
          <NavLink
            to="/operator/dashboard"
            className="brand"
            aria-label="DroneOptAI dashboard"
          >
            <img
              src={droneOptLogo}
              alt=""
              className="brand-logo"
            />

            <span className="brand-name">
              <span className="brand-strong">
                Drone
              </span>

              <span className="brand-light">
                OptAI
              </span>
            </span>
          </NavLink>

          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <Icon
              name="close"
              size={18}
            />
          </button>
        </div>

        {/* =========================
            NAVIGATION
        ========================= */}

        <nav
          className="side-nav"
          aria-label="Operator navigation"
        >
          <span className="nav-caption">
            CONTROL
          </span>

          {operatorNavigation.map((item) => {
            const active =
              pathname === item.path ||
              Boolean(
                item.children?.some(
                  (child) =>
                    pathname === child.path ||
                    pathname.startsWith(
                      `${child.path}/`,
                    ),
                ),
              );

            return (
              <div
                key={item.label}
                className={`nav-group ${active ? "active" : ""
                  }`}
              >
                <NavLink
                  to={item.path}
                  className="nav-main"
                  onClick={onCloseMobile}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                >
                  <Icon
                    name={item.icon}
                    size={18}
                    className="nav-icon"
                  />

                  <span>
                    {item.label}
                  </span>

                  {item.children && (
                    <Icon
                      name="chevron"
                      size={13}
                      className="nav-chevron"
                    />
                  )}
                </NavLink>

                <AnimatePresence
                  initial={false}
                >
                  {item.children &&
                    active && (
                      <motion.div
                        className="nav-children"
                        initial={
                          reduceMotion
                            ? false
                            : {
                              opacity: 0,
                              height: 0,
                            }
                        }
                        animate={{
                          opacity: 1,
                          height: "auto",
                        }}
                        exit={
                          reduceMotion
                            ? undefined
                            : {
                              opacity: 0,
                              height: 0,
                            }
                        }
                        transition={{
                          duration: 0.16,
                          ease: "easeOut",
                        }}
                      >
                        {item.children.map(
                          (child) => (
                            <NavLink
                              key={
                                child.path
                              }
                              to={
                                child.path
                              }
                              onClick={
                                onCloseMobile
                              }
                            >
                              {
                                child.label
                              }
                            </NavLink>
                          ),
                        )}
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* =========================
            SIDEBAR FOOTER
        ========================= */}

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title="Log out"
          >
            {/* <Icon
              name="logout"
              size={19}
            /> */}

            <LogOut size={20} strokeWidth={1.8} />

            <span>
              Log out
            </span>
          </button>
        </div>

        {/* =========================
            COLLAPSE HANDLE
        ========================= */}

        <button
          type="button"
          className="sidebar-collapse-handle"
          onClick={onToggleCollapsed}
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <Icon
            name="collapse"
            size={15}
          />
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            className="sidebar-backdrop"
            initial={
              reduceMotion
                ? false
                : { opacity: 0 }
            }
            animate={{
              opacity: 1,
            }}
            exit={
              reduceMotion
                ? undefined
                : { opacity: 0 }
            }
            transition={{
              duration: 0.16,
            }}
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
        )}
      </AnimatePresence>
    </>
  );
}