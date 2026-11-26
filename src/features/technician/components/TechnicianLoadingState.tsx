import { LoaderCircle } from "lucide-react";

/** Shared initial-load presentation matching Technician Notifications. */
export function TechnicianLoadingState({ label, panel = false }: {
  label: string;
  panel?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true"
      className={`flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 py-5 text-center ${panel ? "rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)]" : ""}`}>
      <LoaderCircle size={25} className="animate-spin text-orange-500" aria-hidden="true" />
      <p className="text-[13px] font-medium text-[var(--tech-text-secondary)]">{label}</p>
      <p className="text-[11px] text-[var(--tech-subtle)]">Fetching data from Backend.</p>
    </div>
  );
}
