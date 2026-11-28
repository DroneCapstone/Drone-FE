import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminNavigation, getActiveAdminChildPath } from "../adminNavigation";

function isChildActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Admin page header shares the TechnicianPageShell title scale and vertical rhythm.
 * Breadcrumbs are intentionally not rendered: they repeat the page name and sidebar.
 * The optional breadcrumbLabel and description props are retained for backwards compatibility.
 * Page headers intentionally display the title only, without a subtitle.
 *
 * Header measurements (TechnicianPageShell):
 * - 28px IBM Plex Sans / weight 600 / -0.025em tracking
 * - 28px space below the header
 * - 20px horizontal gap between title and action
 * - 32px desktop / 24px smaller screens content top padding (Admin layout already
 *   provides approximately this spacing via page-content).
 */
export function AdminPageShell({
  title,
  actions,
  hideSectionTabs = false,
  children,
}: {
  title: string;
  breadcrumbLabel?: string;
  description?: string;
  actions?: ReactNode;
  hideSectionTabs?: boolean;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const section = adminNavigation.find((item) =>
    item.children?.some((child) => isChildActive(pathname, child.path)),
  );
  const activeChildPath = getActiveAdminChildPath(pathname, section?.children ?? []);

  return (
    <>
      <header className="page-heading">
        <div className="page-heading-copy min-w-0"><h1>{title}</h1></div>
        {actions ? <div className="page-heading-actions">{actions}</div> : null}
      </header>

      {!hideSectionTabs && section?.children?.length ? (
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
