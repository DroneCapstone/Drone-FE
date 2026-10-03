import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminHeader } from "../features/admin/components/AdminHeader";
import { AdminSidebar } from "../features/admin/components/AdminSidebar";
import "../features/admin/admin-theme.css";

type ThemeMode = "dark" | "light";
const THEME_KEY = "droneoptai.admin.theme";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"));
  useEffect(() => localStorage.setItem(THEME_KEY, theme), [theme]);
  return (
    <div data-admin-theme={theme} className="admin-app min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)]">
      <AdminSidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? "lg:ml-[78px]" : "lg:ml-[252px]"}`}>
        <AdminHeader theme={theme} onToggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")} onOpenMobile={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-68px)]"><Outlet /></main>
      </div>
    </div>
  );
}
