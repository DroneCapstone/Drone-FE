import { NavLink, useLocation } from "react-router-dom";

import { operatorNavigation } from "../../../constants/operatorNavigation";
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

  return (
    <>
      <aside
        className={`sidebar ${mobileOpen ? "is-open" : ""} ${
          collapsed ? "is-collapsed" : ""
        }`}
      >
        {/* =========================
            BRAND
        ========================== */}
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
    <span className="brand-strong">Drone</span>
    <span className="brand-light">OptAI</span>
  </span>
</NavLink>

          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <Icon name="close" size={18} />
          </button>
        </div>


        {/* =========================
            NAVIGATION
        ========================== */}
        <nav
          className="side-nav"
          aria-label="Operator navigation"
        >
          <span className="nav-caption">CONTROL</span>

          {operatorNavigation.map((item) => {
            const active =
              pathname === item.path ||
              Boolean(
                item.children?.some(
                  (child) =>
                    pathname === child.path ||
                    pathname.startsWith(`${child.path}/`),
                ),
              );

            return (
              <div
                key={item.label}
                className={`nav-group ${
                  active ? "active" : ""
                }`}
              >
                <NavLink
                  to={item.path}
                  className="nav-main"
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    name={item.icon}
                    size={18}
                    className="nav-icon"
                  />

                  <span>{item.label}</span>

                  {item.children && (
                    <Icon
                      name="chevron"
                      size={13}
                      className="nav-chevron"
                    />
                  )}
                </NavLink>

                {item.children && active && (
                  <div className="nav-children">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onCloseMobile}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* =========================
            SYSTEM STATUS
        ========================== */}
        <div className="system-card">
          <div className="system-card-top">
            <span>
              <i />
              System status
            </span>

            <strong>Nominal</strong>
          </div>

          <div className="system-meter">
            <span />
          </div>

          <small>24 services online</small>
        </div>

        {/* =========================
            COLLAPSE HANDLE
        ========================== */}
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

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        />
      )}
    </>
  );
}