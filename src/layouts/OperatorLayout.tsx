import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { CommandSearch } from "../components/common/CommandSearch/CommandSearch";
import { OperatorHeader } from "../components/common/Header/OperatorHeader";
import { OperatorSidebar } from "../components/common/Sidebar/OperatorSidebar";
import { useOperatorTheme } from "../hooks/useOperatorTheme";

export function OperatorLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isDark, toggleTheme } = useOperatorTheme();
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
      <div className="main-column">
        <OperatorHeader
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenSearch={openSearch}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <CommandSearch
        open={searchOpen}
        onClose={closeSearch}
        onOpen={openSearch}
      />
    </div>
  );
}
