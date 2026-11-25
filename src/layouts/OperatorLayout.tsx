import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { OperatorHeader } from "../components/common/Header/OperatorHeader";
import { OperatorSidebar } from "../components/common/Sidebar/OperatorSidebar";
import { useOperatorTheme } from "../hooks/useOperatorTheme";
import { OperatorQueryProvider } from "../features/operator/query/OperatorQueryProvider";
import { useLiveTrackingQuery } from "../features/operator/hooks/useMissionQueries";
import "../features/operator/styles/operator-shell.css";

/** Poll Live Tracking once per Operator session, even while another page/tab
 * is visible. The shared cache makes opening the map fast after dispatch. */
function LiveTrackingWarmup() {
  useLiveTrackingQuery({ subscribeOnly: false });
  useEffect(() => {
    // Load the existing lazy map page chunk before the Operator opens the tab.
    // Do not mount another map, start a replay, or create extra GPS requests.
    const timer = window.setTimeout(() => {
      void import('../features/operator/pages/operations/LiveTrackingPage').catch(() => {
        // A failed prefetch is harmless: React Router can retry on navigation.
      });
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}

export function OperatorLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useOperatorTheme();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <OperatorQueryProvider>
      <LiveTrackingWarmup />
      <div className={`app-shell operator-app ${collapsed ? "sidebar-collapsed" : ""}`}>
        <OperatorSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
        <div className="main-column min-w-0 overflow-x-hidden">
          <OperatorHeader
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenMobile={() => setMobileOpen(true)}
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
    </OperatorQueryProvider>
  );
}
