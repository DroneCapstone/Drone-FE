import type { ReactNode } from "react";
import { sectionTitles } from "../constants/operatorRoutes";

export function PageHeader({
  section,
  action,
}: {
  section: string;
  action?: ReactNode;
}) {
  const [title, subtitle] = sectionTitles[section] || sectionTitles.dashboard;

  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <div className="breadcrumb">
          Operator <span>/</span> {title}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {action ? <div className="page-heading-actions">{action}</div> : null}
    </div>
  );
}
