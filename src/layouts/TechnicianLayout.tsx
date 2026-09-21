import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
} from "react-router-dom";

import { TechnicianHeader } from "../features/technician/components/TechnicianHeader";
import { TechnicianSidebar } from "../features/technician/components/TechnicianSidebar";

type ThemeMode =
  | "dark"
  | "light";

const THEME_KEY =
  "droneoptai.theme";

export function TechnicianLayout() {
  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    theme,
    setTheme,
  ] = useState<ThemeMode>(() => {
    const saved =
      localStorage.getItem(
        THEME_KEY,
      );

    if (
      saved === "light" ||
      saved === "dark"
    ) {
      return saved;
    }

    return "dark";
  });

  useEffect(() => {
    localStorage.setItem(
      THEME_KEY,
      theme,
    );
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark"
        ? "light"
        : "dark",
    );
  };

  return (
    <div
      data-theme={theme}
      className="
        technician-app
        min-h-screen
        bg-[var(--tech-bg)]
        text-[var(--tech-text)]
      "
    >
      <TechnicianSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() =>
          setMobileOpen(false)
        }
        onToggleCollapsed={() =>
          setCollapsed(
            (value) => !value,
          )
        }
      />

      <div
        className={`
          min-h-screen
          transition-[margin]
          duration-200

          ${
            collapsed
              ? "lg:ml-[78px]"
              : "lg:ml-[252px]"
          }
        `}
      >
        <TechnicianHeader
          theme={theme}
          onToggleTheme={
            toggleTheme
          }
          onOpenMobile={() =>
            setMobileOpen(true)
          }
        />

        <main className="min-h-[calc(100vh-68px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}