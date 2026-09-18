import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { OperatorHeader } from "../components/common/Header/OperatorHeader";
import { OperatorSidebar } from "../components/common/Sidebar/OperatorSidebar";
import { useOperatorTheme } from "../hooks/useOperatorTheme";

export function OperatorLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isDark, toggleTheme } = useOperatorTheme();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <OperatorSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <div className="main-column min-w-0 overflow-x-hidden">
        <OperatorHeader
          isDark={isDark}
          searchOpen={searchOpen}
          onToggleTheme={toggleTheme}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenSearch={openSearch}
          onCloseSearch={closeSearch}
        />
        <main className="page-content min-w-0 overflow-x-hidden">
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
