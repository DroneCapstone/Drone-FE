import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import droneOptLogo from "../../../assets/images/droneopt-logo.png";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../auth/hooks/useAuth";
import { adminNavigation } from "../adminNavigation";

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

function childIsActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: AdminSidebarProps) {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    onCloseMobile();
  };

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}>
        <div className="brand-row">
          <NavLink to="/admin/dashboard" className="brand" aria-label="DroneOptAI admin dashboard">
            <img src={droneOptLogo} alt="" className="brand-logo" />
            <span className="brand-name">
              <span className="brand-strong">Drone</span>
              <span className="brand-light">OptAI</span>
            </span>
          </NavLink>
          <button type="button" className="icon-button sidebar-close" onClick={onCloseMobile} aria-label="Close navigation">
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="side-nav" aria-label="Admin navigation">
          <span className="nav-caption">CONTROL</span>
          {adminNavigation.map((item) => {
            const active =
              pathname === item.path ||
              pathname.startsWith(`${item.path}/`) ||
              Boolean(item.children?.some((child) => childIsActive(pathname, child.path)));
            const NavIcon = item.icon;

            return (
              <div key={item.label} className={`nav-group ${active ? "active" : ""}`}>
                <NavLink
                  to={item.path}
                  className="nav-main"
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                >
                  <NavIcon size={18} className="nav-icon" strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {item.children ? <Icon name="chevron" size={13} className="nav-chevron" /> : null}
                </NavLink>

                <AnimatePresence initial={false}>
                  {item.children && active ? (
                    <motion.div
                      className="nav-children"
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                      {item.children.map((child) => (
                        <NavLink key={child.path} to={child.path} onClick={onCloseMobile}>
                          {child.label}
                        </NavLink>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={handleLogout} title="Log out">
            <LogOut size={20} strokeWidth={1.8} />
            <span>Log out</span>
          </button>
        </div>

        <button
          type="button"
          className="sidebar-collapse-handle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="collapse" size={15} />
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.button
            type="button"
            className="sidebar-backdrop"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
