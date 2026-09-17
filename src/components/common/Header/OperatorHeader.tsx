import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../../features/auth/hooks/useAuth";

import { CommandSearch } from "../CommandSearch/CommandSearch";

import { Icon } from "../../ui/Icon";

interface OperatorHeaderProps {
  isDark: boolean;

  searchOpen: boolean;

  onToggleTheme: () => void;

  onOpenMobile: () => void;

  onOpenSearch: () => void;

  onCloseSearch: () => void;
}

function getInitials(
  name?: string,
) {
  if (!name) {
    return "OP";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join("");
}

export function OperatorHeader({
  isDark,

  searchOpen,

  onToggleTheme,

  onOpenMobile,

  onOpenSearch,

  onCloseSearch,
}: OperatorHeaderProps) {
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const profileRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }

    const closeOnOutside = (
      event: MouseEvent,
    ) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node,
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      closeOnOutside,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        closeOnOutside,
      );
  }, [profileOpen]);

  const handleLogout = () => {
    logout();

    setProfileOpen(false);

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Icon name="menu" />
      </button>

      <CommandSearch
        open={searchOpen}
        onOpen={onOpenSearch}
        onClose={onCloseSearch}
      />

      <div className="topbar-actions">
        <span className="connection-pill">
          <i />
          Live sync
        </span>

        <button
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={
            isDark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          <Icon
            name={
              isDark
                ? "sun"
                : "moon"
            }
          />
        </button>

        <NavLink
          className="icon-button notification-button"
          to="/operator/notifications"
          aria-label="Notifications"
        >
          <Icon name="bell" />

          <span>3</span>
        </NavLink>

        <div
          className="profile-menu-wrap"
          ref={profileRef}
        >
          <button
            type="button"
            className="profile-chip profile-chip-button"
            onClick={() =>
              setProfileOpen(
                (value) => !value,
              )
            }
            aria-expanded={
              profileOpen
            }
            aria-haspopup="menu"
          >
            <span className="avatar">
              {getInitials(
                user?.name,
              )}
            </span>

            <span>
              <strong>
                {user?.name ??
                  "Operator"}
              </strong>

              <small>
                {user?.role ??
                  "operator"}
              </small>
            </span>

            <Icon
              name="chevron"
              size={13}
            />
          </button>

          {profileOpen && (
            <div
              className="profile-popover"
              role="menu"
            >
              <div className="profile-popover-head">
                <strong>
                  {user?.name ??
                    "Operator"}
                </strong>

                <small>
                  {user?.email}
                </small>
              </div>

              <NavLink
                to="/operator/profile"
                role="menuitem"
                onClick={() =>
                  setProfileOpen(false)
                }
              >
                <Icon
                  name="user"
                  size={16}
                />

                Profile
              </NavLink>

              <button
                type="button"
                role="menuitem"
                onClick={
                  handleLogout
                }
              >
                <Icon
                  name="logout"
                  size={16}
                />

                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  ); }