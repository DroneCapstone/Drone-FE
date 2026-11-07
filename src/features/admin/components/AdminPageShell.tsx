import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminNavigation, getActiveAdminChildPath } from "../adminNavigation";

function isChildActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Admin page header shares the TechnicianPageShell title scale and vertical rhythm.
 * Breadcrumbs are intentionally not rendered: they repeat the page name and sidebar.
 * The optional breadcrumbLabel prop is retained for backwards compatibility.
 *
 * Header measurements (TechnicianPageShell):
 * - 28px IBM Plex Sans / weight 600 / -0.025em tracking
 * - 4px space between title and optional description
 * - 28px space below the header
 * - 20px horizontal gap between title and action
 * - 32px desktop / 24px smaller screens content top padding (Admin layout already
 *   provides approximately this spacing via page-content).
 */
export function AdminPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  breadcrumbLabel?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const section = adminNavigation.find((item) =>
    item.children?.some((child) => isChildActive(pathname, child.path)),
  );
  const activeChildPath = getActiveAdminChildPath(pathname, section?.children ?? []);

  return (
    <>
      <header
        className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row"
        style={{ marginBottom: 28 }}
      >
        <div className="min-w-0">
          <h1
            style={{
              fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              margin: 0,
              color: "var(--admin-text, var(--text))",
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13.5,
              fontWeight: 400,
              lineHeight: 1.5,
              letterSpacing: 0,
              color: "var(--admin-muted, var(--muted))",
            }}
          >
            {description ?? ""}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      {section?.children?.length ? (
        <nav className="subtabs" aria-label={`${section.label} navigation`}>
          {section.children.map((child) => (
            <Link
              key={child.path}
              to={child.path}
              className={activeChildPath === child.path ? "active" : undefined}
              aria-current={activeChildPath === child.path ? "page" : undefined}
            >
              {child.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {children}
    </>
  );
}
