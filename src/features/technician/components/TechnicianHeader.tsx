import {
  useEffect,
  useState,
} from "react";

import {
  Bell,
  Menu,
  Moon,
  Sun,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import {
  useAuth,
} from "../../auth/hooks/useAuth";

type ThemeMode =
  | "dark"
  | "light";

interface TechnicianHeaderProps {
  onOpenMobile: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

interface TechnicianProfile {
  name: string;
  email: string;
  avatar: string | null;
  technicianId: string;
  controlCenter: string;
}

type StoredNotification = {
  unread?: boolean;
};

const PROFILE_STORAGE_KEY =
  "droneoptai.technician.profile";

const NOTIFICATION_STORAGE_KEY =
  "droneoptai.technician.notifications.v3";

/*
 * Current frontend mock has 3 unread notifications.
 * Later this value should come directly from the notifications API.
 */
const DEFAULT_UNREAD_NOTIFICATION_COUNT = 3;

function getInitials(
  name?: string,
) {
  if (!name) {
    return "TC";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

function getSavedProfile():
  | TechnicianProfile
  | null {
  try {
    const saved =
      localStorage.getItem(
        PROFILE_STORAGE_KEY,
      );

    if (!saved) {
      return null;
    }

    return JSON.parse(
      saved,
    ) as TechnicianProfile;
  } catch {
    return null;
  }
}

function getUnreadNotificationCount() {
  try {
    const saved =
      localStorage.getItem(
        NOTIFICATION_STORAGE_KEY,
      );

    if (!saved) {
      return DEFAULT_UNREAD_NOTIFICATION_COUNT;
    }

    const notifications =
      JSON.parse(
        saved,
      ) as StoredNotification[];

    if (
      !Array.isArray(
        notifications,
      )
    ) {
      return 0;
    }

    return notifications.filter(
      (notification) =>
        notification.unread,
    ).length;
  } catch {
    return 0;
  }
}

export function TechnicianHeader({
  onOpenMobile,
  theme,
  onToggleTheme,
}: TechnicianHeaderProps) {
  const {
    user,
  } = useAuth();

  const [
    technicianProfile,
    setTechnicianProfile,
  ] =
    useState<TechnicianProfile | null>(
      () => getSavedProfile(),
    );

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(
    getUnreadNotificationCount,
  );

  useEffect(() => {
    const handleProfileUpdate = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<TechnicianProfile>;

      setTechnicianProfile(
        customEvent.detail,
      );
    };

    window.addEventListener(
      "technician-profile-updated",
      handleProfileUpdate,
    );

    return () => {
      window.removeEventListener(
        "technician-profile-updated",
        handleProfileUpdate,
      );
    };
  }, []);

  useEffect(() => {
    const refreshNotificationCount =
      () => {
        setUnreadNotificationCount(
          getUnreadNotificationCount(),
        );
      };

    const handleStorage = (
      event: StorageEvent,
    ) => {
      if (
        event.key ===
        NOTIFICATION_STORAGE_KEY
      ) {
        refreshNotificationCount();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage,
    );

    window.addEventListener(
      "technician-notifications-updated",
      refreshNotificationCount,
    );

    window.addEventListener(
      "focus",
      refreshNotificationCount,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );

      window.removeEventListener(
        "technician-notifications-updated",
        refreshNotificationCount,
      );

      window.removeEventListener(
        "focus",
        refreshNotificationCount,
      );
    };
  }, []);

  const displayName =
    technicianProfile?.name ??
    user?.name ??
    "Technician Demo";

  const avatar =
    technicianProfile?.avatar ??
    null;

  const notificationBadge =
    unreadNotificationCount > 99
      ? "99+"
      : unreadNotificationCount;

  return (
    <header
      className="
        sticky top-0 z-20
        flex h-[68px]
        items-center
        justify-between
        border-b
        border-[var(--tech-border)]
        bg-[var(--tech-header)]
        px-6
      "
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="
            text-[var(--tech-muted)]
            lg:hidden
          "
        >
          <Menu size={20} />
        </button>

      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          className="
            grid h-10 w-10
            place-items-center
            rounded-md
            border
            border-[var(--tech-border)]
            bg-[var(--tech-surface)]
            text-[var(--tech-muted)]
            transition
            hover:border-orange-500/30
            hover:text-orange-500
          "
        >
          {theme === "dark" ? (
            <Sun
              size={18}
              strokeWidth={1.5}
            />
          ) : (
            <Moon
              size={17}
              strokeWidth={1.5}
            />
          )}
        </button>

        <NavLink
          to="/technician/notifications"
          aria-label={`Notifications${
            unreadNotificationCount > 0
              ? `, ${unreadNotificationCount} unread`
              : ""
          }`}
          className="
            relative
            grid h-10 w-10
            place-items-center
            rounded-md
            border
            border-[var(--tech-border)]
            bg-[var(--tech-surface)]
            text-[var(--tech-muted)]
            transition
            hover:border-orange-500/30
            hover:text-orange-500
          "
        >
          <Bell
            size={17}
            strokeWidth={1.5}
          />

          {unreadNotificationCount >
            0 && (
            <span
              className="
                absolute
                -right-2
                -top-2
                flex min-h-[20px]
                min-w-[20px]
                items-center
                justify-center
                rounded-full
                border-2
                border-[var(--tech-header)]
                bg-orange-500
                px-1
                text-[10px]
                font-semibold
                leading-none
                text-white
                shadow-sm
              "
            >
              {notificationBadge}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/technician/profile"
          className="
            group
            flex items-center
            gap-2
            rounded-md
            px-1 py-1
            transition
            hover:bg-black/[0.025]
          "
        >
          <div
            className="
              grid h-10 w-10
              place-items-center
              overflow-hidden
              rounded-md
              border
              border-[var(--tech-border)]
              bg-[var(--tech-surface-2)]
              text-[11px]
              font-semibold
              text-[var(--tech-text)]
            "
          >
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              getInitials(
                displayName,
              )
            )}
          </div>

          <div className="max-sm:hidden">
            <p
              className="
                text-[12px]
                font-medium
                text-[var(--tech-text)]
              "
            >
              {displayName}
            </p>

            <p
              className="
                mt-[1px]
                text-[10px]
                font-normal
                text-[var(--tech-muted)]
              "
            >
              Technician
            </p>
          </div>
        </NavLink>
      </div>
    </header>
  );
}
