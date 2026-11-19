import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/DropdownMenu";
import { Icon } from "../../ui/Icon";

interface OperatorHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenMobile: () => void;
}

function getInitials(name?: string) {
  if (!name) return "OP";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function OperatorHeader({
  isDark,
  onToggleTheme,
  onOpenMobile,
}: OperatorHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button mobile-menu"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Icon name="menu" />
      </button>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={isDark ? "sun" : "moon"} />
        </button>

        <NavLink
          className="icon-button notification-button"
          to="/operator/notifications"
          aria-label="Notifications, 3 unread"
        >
          <Icon name="bell" />
          <span className="notification-count" aria-hidden="true">3</span>
        </NavLink>

        <DropdownMenu>
          <div className="profile-menu-wrap">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="profile-chip profile-chip-button"
                aria-label="Open profile menu"
              >
                <span className="avatar">{getInitials(user?.name)}</span>
                <span>
                  <strong>{user?.name ?? "Operator"}</strong>
                  <small>{user?.role ?? "operator"}</small>
                </span>
                <Icon name="chevron" size={13} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="profile-popover">
              <DropdownMenuLabel asChild>
                <div className="profile-popover-head">
                  <strong>{user?.name ?? "Operator"}</strong>
                  <small>{user?.email}</small>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/operator/profile">
                  <Icon name="user" size={16} />
                  Profile
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button type="button" onClick={handleLogout}>
                  <Icon name="logout" size={16} />
                  Log out
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </div>
        </DropdownMenu>
      </div>
    </header>
  );
}
