import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PageHeader } from "../../operator/components/PageHeader";
import { adminNavigation } from "../adminNavigation";

function isChildActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function AdminPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const section = adminNavigation.find((item) =>
    item.children?.some((child) => isChildActive(pathname, child.path)),
  );

  return (
    <>
      <PageHeader workspace="Admin" title={title} subtitle={description} action={actions} />
      {section?.children?.length ? (
        <nav className="subtabs" aria-label={`${section.label} navigation`}>
          {section.children.map((child) => (
            <NavLink key={child.path} to={child.path} className={isChildActive(pathname, child.path) ? "active" : ""}>
              {child.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
      {children}
    </>
  );
}
