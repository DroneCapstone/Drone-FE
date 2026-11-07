import type { ReactNode } from "react";
import { sectionTitles } from "../constants/operatorRoutes";

export function PageHeader({
  section,
  action,
  title,
  breadcrumbLabel,
  subtitle,
  workspace = "Operator",
}: {
  section?: string;
  action?: ReactNode;
  title?: string;
  breadcrumbLabel?: string;
  subtitle?: string;
  workspace?: string;
}) {
  const fallback = sectionTitles[section ?? "dashboard"] || sectionTitles.dashboard;
  const resolvedTitle = title ?? fallback[0];
  const resolvedSubtitle = subtitle ?? fallback[1];

  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <div className="breadcrumb">
          {workspace} <span>/</span> {breadcrumbLabel ?? resolvedTitle}
        </div>
        <h1>{resolvedTitle}</h1>
        {resolvedSubtitle ? <p>{resolvedSubtitle}</p> : null}
      </div>
      {action ? <div className="page-heading-actions">{action}</div> : null}
    </div>
  );
}
