import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { operatorNavigation } from '../../../constants/operatorNavigation';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { Icon } from '../../ui/Icon';
import droneOptLogo from '../../../assets/images/droneopt-logo.png';

interface OperatorSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

/** A group can own more than one URL prefix (e.g. Orders + Missions). */
function matchesNavigationGroup(pathname: string, item: (typeof operatorNavigation)[number]) {
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;

  return Boolean(item.children?.some((child) => {
    const [, workspace, section] = child.path.split('/');
    const sectionPrefix = `/${workspace}/${section}`;
    return pathname === child.path || pathname.startsWith(`${child.path}/`) ||
      pathname === sectionPrefix || pathname.startsWith(`${sectionPrefix}/`);
  }));
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

  // Like Technician: the expanded state belongs to the user's click, not the
  // current route. A previously opened group stays open when navigating away.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // A route may be opened from a notification or a deep link. Expand that
  // section once, without re-opening one the user explicitly collapsed.
  useEffect(() => {
    const matchingGroup = operatorNavigation.find((item) =>
      item.children?.length && matchesNavigationGroup(pathname, item),
    );
    if (!matchingGroup) return;

    setOpenGroups((current) =>
      matchingGroup.label in current
        ? current
        : { ...current, [matchingGroup.label]: true },
    );
  }, [pathname]);

  const toggleGroup = (item: (typeof operatorNavigation)[number], active: boolean) => {
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
    navigate('/login', { replace: true });
    onCloseMobile();
  };

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="brand-row">
          <NavLink to="/operator/dashboard" className="brand" aria-label="DroneOptAI dashboard" onClick={onCloseMobile}>
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

        <nav className="side-nav" aria-label="Operator navigation">
          <span className="nav-caption">CONTROL</span>

          {operatorNavigation.map((item) => {
            const active = matchesNavigationGroup(pathname, item);
            const hasChildren = Boolean(item.children?.length);
            const expanded = openGroups[item.label] ?? active;
            const showChildren = (mobileOpen || !collapsed) && expanded;

            return (
              <div key={item.label} className={`nav-group ${active ? 'active' : ''}`}>
                {hasChildren ? (
                  <button
                    type="button"
                    className="nav-main"
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    onClick={() => toggleGroup(item, active)}
                    aria-expanded={expanded}
                    aria-controls={`operator-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  >
                    <Icon name={item.icon} size={19} className="nav-icon" />
                    <span>{item.label}</span>
                    <Icon name="chevron" size={15} className={`nav-chevron ${expanded ? 'is-expanded' : ''}`} />
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    className="nav-main"
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    onClick={onCloseMobile}
                  >
                    <Icon name={item.icon} size={19} className="nav-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                )}

                <AnimatePresence initial={false}>
                  {hasChildren && showChildren && (
                    <motion.div
                      id={`operator-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className="nav-children"
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                      {item.children?.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={onCloseMobile}
                          className={({ isActive }) => {
                            const isMission = child.path === '/operator/missions/all' && pathname.startsWith('/operator/missions/');
                            const isOrder = child.path === '/operator/orders/all' && pathname.startsWith('/operator/orders/');
                            const isFleet = child.path.startsWith('/operator/fleet-hubs/') &&
                              (pathname === child.path || pathname.startsWith(`${child.path}/`));
                            return isActive || isMission || isOrder || isFleet ? 'active' : undefined;
                          }}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="collapse" size={15} />
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
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
        )}
      </AnimatePresence>
    </>
  );
}
