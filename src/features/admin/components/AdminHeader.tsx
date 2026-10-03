import { Bell, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";

export function AdminHeader({ theme, onToggleTheme, onOpenMobile }: { theme: "dark" | "light"; onToggleTheme: () => void; onOpenMobile: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/"); };
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-header)]/95 px-4 backdrop-blur sm:px-6">
      <button type="button" onClick={onOpenMobile} className="rounded-lg p-2 text-[var(--admin-muted)] lg:hidden"><Menu size={19} /></button>
      <div className="hidden min-w-[280px] max-w-[520px] flex-1 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 md:flex">
        <Search size={15} className="text-[var(--admin-muted)]" /><input className="w-full bg-transparent text-[13px] text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-muted)]" placeholder="Search hubs, drones, users, logs..." />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className="relative rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2.5 text-[var(--admin-muted)] hover:text-orange-500"><Bell size={16} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-500" /></button>
        <button type="button" onClick={onToggleTheme} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2.5 text-[var(--admin-muted)] hover:text-orange-500">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <div className="hidden items-center gap-2 border-l border-[var(--admin-border)] pl-3 sm:flex"><div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500 text-[12px] font-bold text-white">AD</div><div className="max-w-[150px]"><p className="truncate text-[12px] font-semibold text-[var(--admin-text)]">{user?.name || "Administrator"}</p><p className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Admin</p></div></div>
        <button type="button" onClick={handleLogout} className="rounded-lg p-2.5 text-[var(--admin-muted)] hover:bg-red-500/10 hover:text-red-500" title="Sign out"><LogOut size={16} /></button>
      </div>
    </header>
  );
}
