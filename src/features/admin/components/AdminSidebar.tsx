import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { adminNavigation } from "../adminNavigation";
import logo from "../../../assets/images/droneopt-logo.png";

export function AdminSidebar({ collapsed, mobileOpen, onCloseMobile, onToggleCollapsed }: { collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void; onToggleCollapsed: () => void }) {
  const { pathname } = useLocation();
  const initialOpen = useMemo(() => new Set(adminNavigation.filter((item) => item.children?.some((child) => pathname.startsWith(child.path))).map((item) => item.label)), [pathname]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);
  const toggleGroup = (label: string) => setOpenGroups((current) => {
    const next = new Set(current);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  return (
    <>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onCloseMobile} aria-label="Close admin navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--admin-border)] bg-[var(--admin-sidebar)] transition-all duration-200 ${collapsed ? "w-[78px]" : "w-[252px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-[68px] items-center gap-3 border-b border-[var(--admin-border)] px-4">
          <img src={logo} alt="DroneOptAI" className="h-9 w-9 rounded-lg object-contain" />
          {!collapsed && <div className="min-w-0"><strong className="block truncate text-[14px] text-[var(--admin-text)]">DroneOptAI</strong><span className="text-[10px] uppercase tracking-[0.16em] text-orange-500">Admin console</span></div>}
          <button type="button" onClick={onCloseMobile} className="ml-auto rounded-md p-2 text-[var(--admin-muted)] lg:hidden"><X size={17} /></button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const groupActive = pathname.startsWith(item.path.split("/").slice(0, 3).join("/"));
              const open = openGroups.has(item.label) || groupActive;
              return (
                <div key={item.label}>
                  <div className="flex items-center gap-1">
                    <NavLink to={item.path} onClick={onCloseMobile} className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${isActive || groupActive ? "bg-orange-500/10 font-semibold text-orange-500" : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]"}`}>
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                    {!collapsed && item.children && <button type="button" onClick={() => toggleGroup(item.label)} className="rounded-md p-2 text-[var(--admin-muted)]"><ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>}
                  </div>
                  {!collapsed && item.children && open && <div className="ml-9 mt-1 space-y-1 border-l border-[var(--admin-border)] pl-3">{item.children.map((child) => <NavLink key={child.path} to={child.path} onClick={onCloseMobile} className={({ isActive }) => `block rounded-md px-2 py-1.5 text-[12px] ${isActive ? "font-semibold text-orange-500" : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"}`}>{child.label}</NavLink>)}</div>}
                </div>
              );
            })}
          </div>
        </nav>
        <button type="button" onClick={onToggleCollapsed} className="hidden h-12 items-center justify-center border-t border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-orange-500 lg:flex">{collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span className="ml-2 text-[12px]">Collapse</span></>}</button>
      </aside>
    </>
  );
}
