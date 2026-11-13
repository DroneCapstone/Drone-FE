import { NavLink, useNavigate } from "react-router-dom";
import { CommandSearch } from "../../../components/common/CommandSearch/CommandSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/DropdownMenu";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../auth/hooks/useAuth";
import { adminOperationsApi } from "../api/adminOperationsApi";
import { useEffect, useState } from "react";

function getInitials(name?: string) {
  if (!name) return "AD";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdminHeader({
  isDark,
  searchOpen,
  onToggleTheme,
  onOpenMobile,
  onOpenSearch,
  onCloseSearch,
}: {
  isDark: boolean;
  searchOpen: boolean;
  onToggleTheme: () => void;
  onOpenMobile: () => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || "Administrator";
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      adminOperationsApi.notificationUnreadCount().then(count => {
        if (alive) setUnreadCount(count);
      }).catch(() => {
        // The OpenAPI response schema is unspecified; fall back to the visible notification page.
        adminOperationsApi.notifications().then(items => {
          if (alive) setUnreadCount(items.filter(item => !item.is_read).length);
        }).catch(() => { if (alive) setUnreadCount(0); });
      });
    };
    refresh();
    window.addEventListener('admin-notifications-updated', refresh);
    return () => { alive = false; window.removeEventListener('admin-notifications-updated', refresh); };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-button mobile-menu" onClick={onOpenMobile} aria-label="Open navigation">
        <Icon name="menu" />
      </button>

      <CommandSearch
        open={searchOpen}
        onOpen={onOpenSearch}
        onClose={onCloseSearch}
        placeholder="Search hubs, drones, batteries, users..."
        ariaLabel="Search admin workspace"
      />

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={isDark ? "sun" : "moon"} />
        </button>

        <NavLink className="icon-button notification-button" to="/admin/notifications" aria-label={`${unreadCount} admin alerts`}>
          <Icon name="bell" />
          {unreadCount > 0 ? <span className="notification-count" aria-hidden="true">{unreadCount}</span> : null}
        </NavLink>

        <DropdownMenu>
          <div className="profile-menu-wrap">
            <DropdownMenuTrigger asChild>
              <button type="button" className="profile-chip profile-chip-button" aria-label="Open profile menu">
                <span className="avatar">{getInitials(displayName)}</span>
                <span>
                  <strong>{displayName}</strong>
                  <small>admin</small>
                </span>
                <Icon name="chevron" size={13} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="profile-popover">
              <DropdownMenuLabel asChild>
                <div className="profile-popover-head">
                  <strong>{displayName}</strong>
                  <small>{user?.email}</small>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/admin/profile">
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
