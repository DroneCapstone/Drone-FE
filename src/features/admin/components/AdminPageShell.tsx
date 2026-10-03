import type { ReactNode } from "react";

export function AdminPageShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Administration</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-text)] sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-[var(--admin-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
