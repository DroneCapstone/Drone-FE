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
import { adminAlerts } from "../data/adminData";
import { getReplacementRequests } from "../services/prototypeWorkflow";
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
  const [,setVersion]=useState(0);
  useEffect(()=>{const fn=()=>setVersion(v=>v+1);window.addEventListener('admin-data-updated',fn);return()=>window.removeEventListener('admin-data-updated',fn);},[]);
  const unreadCount = adminAlerts.length + getReplacementRequests().filter(r=>r.status==='PENDING').length;

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
