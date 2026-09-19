import {
  useEffect,
  useState,
} from "react";

import {
  Bell,
  Menu,
  Moon,
  Search,
  Sun,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

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

const PROFILE_STORAGE_KEY =
  "droneoptai.technician.profile";


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


export function TechnicianHeader({
  onOpenMobile,
  theme,
  onToggleTheme,
}: TechnicianHeaderProps) {
  const {
    user,
  } = useAuth();


  /* =========================================================
     TECHNICIAN PROFILE
  ========================================================= */

  const [
    technicianProfile,
    setTechnicianProfile,
  ] =
    useState<TechnicianProfile | null>(
      () => getSavedProfile(),
    );


  /* =========================================================
     LISTEN PROFILE UPDATE
  ========================================================= */

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


  /* =========================================================
     DISPLAY DATA
  ========================================================= */

  const displayName =
    technicianProfile?.name ??
    user?.name ??
    "Technician Demo";

  const avatar =
    technicianProfile?.avatar ??
    null;


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
      {/* =====================================================
          LEFT
      ===================================================== */}

      <div className="flex items-center gap-3">

        {/* MOBILE MENU */}

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


        {/* SEARCH */}

        <button
          type="button"
          className="
            flex h-10

            w-[320px]

            items-center

            gap-2

            rounded-md

            border

            border-[var(--tech-border)]

            bg-[var(--tech-surface-2)]

            px-3

            text-left

            text-[12px]

            text-[var(--tech-muted)]

            transition

            hover:border-orange-500/30
          "
        >
          <Search
            size={15}
            strokeWidth={1.5}
          />

          Search drone, work order, incident
        </button>
      </div>


      {/* =====================================================
          RIGHT
      ===================================================== */}

      <div className="flex items-center gap-3">

        {/* ===================================================
            THEME
        =================================================== */}

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


        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        <NavLink
          to="/technician/notifications"
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
          <Bell
            size={17}
            strokeWidth={1.5}
          />
        </NavLink>


        {/* ===================================================
            PROFILE
        =================================================== */}

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

          {/* AVATAR */}

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


          {/* NAME + ROLE */}

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