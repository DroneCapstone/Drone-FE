import { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { useConfirmationHistoryQuery } from "../hooks/useDeliveryQueries";
import { formatApiDateTime } from "../api/httpClient";
import { TechnicianLoadingState } from "./TechnicianLoadingState";
import { HistoryDetailsButton, TechnicianHistoryDetails } from "./TechnicianHistoryDetails";

const columns = "grid grid-cols-[minmax(175px,1.2fr)_minmax(170px,1.2fr)_minmax(140px,1fr)_minmax(155px,1fr)_minmax(160px,1fr)_105px] items-center gap-4 px-5";

export function ConfirmationHistoryDialog({ onClose }: { onClose: () => void }) {
  const query = useConfirmationHistoryQuery();
  const rows = query.data ?? [];
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find(row => row.id === detailId);
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Delivery confirmation history" className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-5 py-4">
        <div><h2 className="text-[19px] font-semibold text-[var(--tech-text)]">Delivery confirmation history</h2><p className="mt-1 text-[12px] text-[var(--tech-muted)]">{query.data ? `${rows.length} history record${rows.length === 1 ? "" : "s"}` : "Completed customer pickups"}</p></div>
        <div className="flex items-center gap-2"><button type="button" aria-label="Refresh history" disabled={query.isFetching} onClick={() => void query.refetch()} className="rounded-md p-1.5 text-[var(--tech-muted)] hover:text-orange-500 disabled:opacity-50"><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""}/></button><button type="button" autoFocus aria-label="Close confirmation history" onClick={onClose} className="rounded-md p-1.5 text-[var(--tech-muted)] hover:text-orange-500"><X size={18}/></button></div>
      </div>
      {query.isError && <div role="alert" className="m-4 flex justify-between gap-3 rounded-md border border-red-500/30 p-3 text-[12px] text-red-500"><span>{"Unable to load confirmation history."}</span><button type="button" className="underline" onClick={() => void query.refetch()}>Retry</button></div>}
      <div className="min-h-0 flex-1 overflow-auto"><div className="min-w-[1030px]">
        <div className={`${columns} sticky top-0 z-10 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] py-3`}>{["Order", "Mission", "Receiver", "Arrival hub", "Customer pickup", "Action"].map(label => <span key={label} className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tech-subtle)]">{label}</span>)}</div>
        {rows.map(row => <div key={row.id} className={`${columns} border-b border-[var(--tech-border)] py-4 text-[12px] text-[var(--tech-text-secondary)]`}>
          <span className="break-all font-semibold text-[var(--tech-text)]">{row.orderId}</span><span className="break-all">{row.missionId}</span><span className="break-words">{row.receiverName || "—"}</span><span className="break-words">{row.destination || "—"}</span><span>{formatApiDateTime(row.pickupAt)}</span><div><HistoryDetailsButton onClick={() => setDetailId(row.id)} /></div>
        </div>)}
        {query.isPending ? <TechnicianLoadingState label="Loading confirmation history..."/> : !query.isError && !rows.length ? <p className="px-5 py-14 text-center text-[13px] text-[var(--tech-muted)]">No delivery confirmation history found.</p> : null}
      </div></div>
    </div>
    {detail && <TechnicianHistoryDetails key={detail.id} title="Delivery confirmation details" record={detail} onClose={() => setDetailId(null)} fields={[
      { label: "Order ID", value: detail.orderId }, { label: "Mission ID", value: detail.missionId }, { label: "Receiver", value: detail.receiverName },
      { label: "Origin hub", value: detail.origin }, { label: "Arrival hub", value: detail.destination }, { label: "Status", value: detail.status === "MISSION_COMPLETED" ? "Mission completed" : detail.status },
      { label: "Drone ID", value: detail.droneId }, { label: "Drone code", value: detail.droneCode }, { label: "Battery ID", value: detail.batteryId }, { label: "Battery code", value: detail.batteryCode },
      { label: "Drone departed", value: formatApiDateTime(detail.departedAt) }, { label: "Drone arrived", value: formatApiDateTime(detail.arrivedAt) }, { label: "Customer pickup", value: formatApiDateTime(detail.pickupAt) },
    ]}/>}
  </div>;
}
