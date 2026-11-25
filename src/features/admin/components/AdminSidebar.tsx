import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import droneOptLogo from "../../../assets/images/droneopt-logo.png";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../auth/hooks/useAuth";
import { adminNavigation, getActiveAdminChildPath } from "../adminNavigation";

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

function matchesNavigationGroup(pathname: string, item: (typeof adminNavigation)[number]) {
  return pathname === item.path || pathname.startsWith(`${item.path}/`) ||
    Boolean(getActiveAdminChildPath(pathname, item.children ?? []));
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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const matchingGroup = adminNavigation.find((item) =>
      item.children?.length && matchesNavigationGroup(pathname, item),
    );
    if (!matchingGroup) return;
    setOpenGroups((current) =>
      matchingGroup.label in current
        ? current
        : { ...current, [matchingGroup.label]: true },
    );
  }, [pathname]);

  const toggleGroup = (item: (typeof adminNavigation)[number], active: boolean) => {
    if (collapsed && !mobileOpen) {
      navigate(item.children?.[0]?.path ?? item.path);
      return;
    }
    setOpenGroups((current) => ({
      ...current,
      [item.label]: !(current[item.label] ?? active),
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    onCloseMobile();
  };

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}>
        <div className="brand-row">
          <NavLink to="/admin/dashboard" className="brand" aria-label="DroneOptAI admin dashboard" onClick={onCloseMobile}>
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
            const active = matchesNavigationGroup(pathname, item);
            const activeChildPath = getActiveAdminChildPath(pathname, item.children ?? []);
            const hasChildren = Boolean(item.children?.length);
            const expanded = openGroups[item.label] ?? active;
            const showChildren = (mobileOpen || !collapsed) && expanded;
            const groupId = `admin-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            const NavIcon = item.icon;

            return (
              <div key={item.label} className={`nav-group ${active ? "active" : ""}`}>
                {hasChildren ? (
                  <button
                    type="button"
                    className="nav-main"
                    title={item.label}
                    onClick={() => toggleGroup(item, active)}
                    aria-expanded={showChildren}
                    aria-controls={groupId}
                  >
                    <NavIcon size={19} className="nav-icon" strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.label}</span>
                    <Icon name="chevron" size={15} className={`nav-chevron ${expanded ? "is-expanded" : ""}`} />
                  </button>
                ) : (
                  <NavLink to={item.path} className="nav-main" title={item.label} onClick={onCloseMobile}>
                    {item.path === "/admin/dashboard" ? (
                      <Icon name="grid" size={19} className="nav-icon" />
                    ) : item.path === "/admin/profile" ? (
                      <Icon name="user" size={19} className="nav-icon" />
                    ) : (
                      <NavIcon size={19} className="nav-icon" strokeWidth={1.8} aria-hidden="true" />
                    )}
                    <span>{item.label}</span>
                  </NavLink>
                )}

                <AnimatePresence initial={false}>
                  {hasChildren && showChildren ? (
                    <motion.div
                      id={groupId}
                      className="nav-children"
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      {item.children?.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={activeChildPath === child.path ? "active" : undefined}
                          aria-current={activeChildPath === child.path ? "page" : undefined}
                          onClick={onCloseMobile}
                        >
                          {child.label}
                        </Link>
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
            <LogOut size={19} strokeWidth={1.4} />
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
