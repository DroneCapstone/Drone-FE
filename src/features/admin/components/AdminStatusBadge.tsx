import type { ReactNode } from "react";

export function AdminStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return (
    <span className={`admin-status admin-status--${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
