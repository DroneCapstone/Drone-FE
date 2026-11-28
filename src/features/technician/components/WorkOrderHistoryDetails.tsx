import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ZoomIn } from "lucide-react";
import { getWorkOrderApi } from "../api/maintenanceApi";
import { technicianApiRequest, unwrapObject, isRecord, toBackendNumericId, TechnicianApiError } from "../api/httpClient";
import { validProofUrl } from "../utils/workOrderInspection";
import { FullImage } from "./TechnicianProofImage";
import { TechnicianLoadingState } from "./TechnicianLoadingState";

export type WorkOrderHistorySummary = {
  id: string; rawId: string; droneId: string; batteryId: string; issue: string;
  actionTaken: string; createdAt: string; resolvedAt: string;
  raw: Record<string, unknown>;
};
function str(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
async function getAudit(id: string) {
  let numeric = id;
  try { numeric = String(toBackendNumericId(id)); } catch { /* exact ID */ }
  const request = (key: string) => technicianApiRequest(`/technician/fleet/work-orders/${encodeURIComponent(key)}/proof-images`);
  try { return await request(numeric); }
  catch (err) { if (numeric !== id && err instanceof TechnicianApiError && err.status === 404) return request(id); throw err; }
}
function imageEntries(value: unknown, label: string) {
  return list(value).flatMap(entry => {
    const row = isRecord(entry) ? entry : {};
    const url = validProofUrl(typeof entry === "string" ? entry : row.proof_image_url);
    return url ? [{url, label: str(row.type) ? `${label} · ${str(row.type).replace(/_/g, " ")}` : label, recordedAt: str(row.recorded_at), description: str(row.description)}] : [];
  });
}
export function WorkOrderHistoryDetails({ item, onClose, formatTime }: { item: WorkOrderHistorySummary; onClose: () => void; formatTime: (value: string) => string }) {
  const [expanded, setExpanded] = useState<{url: string; label: string} | null>(null);
  const query = useQuery({
    queryKey: ["technician", "work-order-inspection-history", item.rawId],
    queryFn: async () => {
      const [audit, detail] = await Promise.allSettled([getAudit(item.rawId), getWorkOrderApi(item.rawId)]);
      if (audit.status === "rejected" && detail.status === "rejected") throw audit.reason;
      return {
        audit: audit.status === "fulfilled" ? unwrapObject(audit.value) : {},
        detail: detail.status === "fulfilled" ? unwrapObject(detail.value) : {},
        partial: audit.status === "rejected" || detail.status === "rejected",
      };
    },
    staleTime: 0, refetchOnWindowFocus: false, retry: false,
  });
  const audit = query.data?.audit ?? {};
  const detail = { ...item.raw, ...query.data?.detail };
  const checklist = [audit.inspection_items, detail.inspection_items_json, detail.inspection_items].find(value => Array.isArray(value) && value.length > 0);
  const rows = list(checklist).filter(isRecord);
  const images = [
    ...imageEntries(audit.proof_images, "Inspection proof"),
    ...imageEntries(audit.parts_replaced_images, "Parts replacement proof"),
    ...imageEntries([detail.proof_image_url ?? audit.proof_image_url], "Inspection proof"),
    ...imageEntries([detail.parts_replaced_proof_url ?? audit.parts_replaced_proof_url], "Parts replacement proof"),
  ];
  const uniqueImages = images.filter((image, index) => images.findIndex(other => other.url === image.url && other.label.split(" · ")[0] === image.label.split(" · ")[0]) === index);
  const logs = list(audit.status_logs ?? detail.status_logs_json).filter(isRecord);
  const fields = [
    ["Work order", item.id], ["Drone ID", item.droneId], ["Battery ID", item.batteryId],
    ["Status", str(detail.status) || "Completed"],
    ["Resulting drone status", str(detail.resulting_drone_status ?? audit.resulting_drone_status)],
    ["Created at", formatTime(item.createdAt)], ["Completed at", formatTime(item.resolvedAt)],
  ];
  return <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/35 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Work order details" className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
      <header className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-4"><h2 className="text-[19px] font-semibold text-[var(--tech-text)]">Work order details</h2><button type="button" autoFocus aria-label="Close details" onClick={onClose} className="text-[var(--tech-muted)] hover:text-orange-500"><X size={19}/></button></header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{fields.map(([label, value]) => <div key={label}><dt className="text-[11px] text-[var(--tech-muted)]">{label}</dt><dd className="mt-1 break-words text-[13px] font-medium text-[var(--tech-text)]">{value || "—"}</dd></div>)}</dl>
        {[["Task / issue", item.issue], ["Diagnosis", str(detail.diagnosis ?? audit.diagnosis)], ["Action taken", str(detail.action_taken ?? audit.action_taken) || item.actionTaken]].map(([label,value]) => <section key={label}><h3 className="text-[12px] font-semibold text-[var(--tech-text)]">{label}</h3><p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-[var(--tech-text-secondary)]">{value || "—"}</p></section>)}
        {query.isPending ? <TechnicianLoadingState label="Loading inspection history..."/> : <>
          {(query.isError || query.data?.partial) && <p role="alert" className="rounded-md border border-orange-500/30 p-3 text-[12px] text-[var(--tech-text-secondary)]">{query.isError ? "Could not load inspection details. Showing available list data." : "Some inspection history is unavailable. Showing available information."} <button type="button" onClick={() => void query.refetch()} className="ml-2 text-orange-500 underline">Retry</button></p>}
          <section className="border-t border-[var(--tech-border)] pt-3"><h3 className="mb-2 text-[13px] font-semibold text-[var(--tech-text)]">Inspection checklist {rows.length > 0 && `(${rows.filter(row => row.checked === true).length}/${rows.length})`}</h3>
            {rows.length ? <div className="space-y-2">{rows.map((row,index) => <div key={index} className="rounded-md border border-[var(--tech-border)] p-2 text-[13px] text-[var(--tech-text)]"><div className="flex justify-between gap-2"><span>{str(row.item) || "—"}</span><span className={row.checked === true ? "text-emerald-600" : "text-[var(--tech-muted)]"}>{row.checked === true ? "Checked" : row.checked === false ? "Not checked" : "Not reported"}</span></div>{Boolean(row.status || row.note) && <p className="mt-1 text-[12px] text-[var(--tech-muted)]">{[str(row.status),str(row.note)].filter(Boolean).join(" · ")}</p>}</div>)}</div> : <p className="text-[12px] text-[var(--tech-muted)]">No saved checklist available.</p>}
          </section>
          <section className="border-t border-[var(--tech-border)] pt-3"><h3 className="mb-2 text-[13px] font-semibold text-[var(--tech-text)]">Proof images ({uniqueImages.length})</h3>{uniqueImages.length ? <div className="grid gap-3 sm:grid-cols-2">{uniqueImages.map((image,index) => <div key={index} className="rounded-md border border-[var(--tech-border)] p-2"><button type="button" onClick={() => setExpanded(image)} className="relative block w-full rounded-md bg-[var(--tech-surface-2)]"><img loading="lazy" src={image.url} alt={image.label} className="h-36 w-full object-contain"/><ZoomIn size={16} className="absolute bottom-2 right-2 text-orange-500"/></button><p className="mt-2 text-[13px] text-[var(--tech-text)]">{image.label}</p>{image.recordedAt && <p className="text-[11px] text-[var(--tech-muted)]">{formatTime(image.recordedAt)}</p>}{image.description && <p className="text-[12px] text-[var(--tech-muted)]">{image.description}</p>}</div>)}</div> : <p className="rounded-md border border-dashed border-[var(--tech-border)] p-3 text-center text-[12px] text-[var(--tech-muted)]">No proof images available.</p>}</section>
          {logs.length > 0 && <section className="border-t border-[var(--tech-border)] pt-3"><h3 className="mb-2 text-[13px] font-semibold text-[var(--tech-text)]">Status history</h3>{logs.map((row,index) => <div key={index} className="border-b border-[var(--tech-border)] py-2 text-[12px] text-[var(--tech-text-secondary)]"><p>{str(row.old_status ?? row.from_status) || "—"} → {str(row.new_status ?? row.to_status) || "—"}</p><p className="text-[var(--tech-muted)]">{[str(row.changed_by), formatTime(str(row.changed_at ?? row.created_at)), str(row.reason)].filter(Boolean).join(" · ")}</p></div>)}</section>}
        </>}
      </div>
      <footer className="flex justify-end border-t border-[var(--tech-border)] px-5 py-3"><button type="button" onClick={onClose} className="rounded-md border border-[var(--tech-border)] px-4 py-2 text-[13px] text-[var(--tech-text)] hover:text-orange-500">Close</button></footer>
      {expanded && <FullImage url={expanded.url} label={expanded.label} close={() => setExpanded(null)}/>}
    </div>
  </div>;
}
