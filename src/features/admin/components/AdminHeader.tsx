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
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    let sequence = 0;
    setUnreadCount(null);
    if (!user?.id) return;
    const refresh = async () => {
      const current = ++sequence;
      try {
        let count: number;
        try { count = await adminOperationsApi.notificationUnreadCount(); }
        catch { count = (await adminOperationsApi.notifications({ page: 1, page_size: 1 })).unread_count; }
        if (alive && current === sequence && Number.isSafeInteger(count) && count >= 0) setUnreadCount(count);
      } catch { /* Keep the last confirmed count; do not display a false zero. */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(onVisible, 60000);
    window.addEventListener('admin-notifications-updated', refresh);
    window.addEventListener('focus', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('admin-notifications-updated', refresh);
      window.removeEventListener('focus', onVisible);
    };
  }, [user?.id]);

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

        <NavLink className="icon-button notification-button" to="/admin/notifications" aria-label={unreadCount === null ? "Notifications" : `${unreadCount} unread notifications`}>
          <Icon name="bell" />
          {unreadCount !== null && unreadCount > 0 ? <span className="notification-count" aria-hidden="true">{unreadCount}</span> : null}
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
