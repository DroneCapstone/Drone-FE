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

import {
  pickNumber,
  pickString,
  unwrapObject,
} from "../api/httpClient";

import {
  useUnreadCountQuery,
} from "../hooks/useNotificationQueries";

import {
  useTechnicianProfileQuery,
} from "../hooks/useProfileQueries";

import {
  TechnicianQueryProvider,
} from "../query/TechnicianQueryProvider";

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

function TechnicianHeaderContent({
  onOpenMobile,
  theme,
  onToggleTheme,
}: TechnicianHeaderProps) {
  const {
    user,
  } = useAuth();

  const profileQuery =
    useTechnicianProfileQuery();

  const unreadQuery =
    useUnreadCountQuery();

  const [
    technicianProfile,
    setTechnicianProfile,
  ] =
    useState<TechnicianProfile | null>(
      () => getSavedProfile(),
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
    if (!profileQuery.data) {
      return;
    }

    const profileData = unwrapObject(
      profileQuery.data,
    );

    setTechnicianProfile((current) => ({
      name: pickString(
        profileData,
        ["name", "full_name"],
        current?.name ??
          user?.name ??
          "Technician",
      ),
      email: pickString(
        profileData,
        ["email"],
        current?.email ??
          user?.email ??
          "",
      ),
      avatar:
        current?.avatar ?? null,
      technicianId: pickString(
        profileData,
        ["technician_id", "user_id", "id"],
        current?.technicianId ?? "",
      ),
      controlCenter: pickString(
        profileData,
        ["hub_name", "hub", "control_center"],
        current?.controlCenter ?? "",
      ),
    }));
  }, [
    profileQuery.data,
    user?.email,
    user?.name,
  ]);

  const unreadData =
    unwrapObject(
      unreadQuery.data,
    );

  const unreadNotificationCount =
    typeof unreadQuery.data === "number"
      ? unreadQuery.data
      : unreadQuery.data
        ? pickNumber(
            unreadData,
            ["unread_count", "count", "total"],
            getUnreadNotificationCount(),
          )
        : getUnreadNotificationCount();


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


export function TechnicianHeader(
  props: TechnicianHeaderProps,
) {
  return (
    <TechnicianQueryProvider>
      <TechnicianHeaderContent
        {...props}
      />
    </TechnicianQueryProvider>
  );
}
