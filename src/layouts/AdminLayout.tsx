import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { AdminHeader } from "../features/admin/components/AdminHeader";
import { AdminSidebar } from "../features/admin/components/AdminSidebar";
import "../features/admin/admin-typography.css";

const THEME_KEY = "droneoptai.admin.theme";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_KEY) !== "light");
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <div className="main-column min-w-0 overflow-x-hidden">
        <AdminHeader
          isDark={isDark}
          searchOpen={searchOpen}
          onToggleTheme={() => setIsDark((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenSearch={openSearch}
          onCloseSearch={closeSearch}
        />
        <main className="page-content admin-typography min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
