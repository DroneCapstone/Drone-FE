import { useState } from "react";
import { Eye, X, ZoomIn } from "lucide-react";
import { FullImage } from "./TechnicianProofImage";
import { formatApiDateTime } from "../api/httpClient";
import { proofStageLabel, type HistoryProofFields } from "../utils/proofImages";

export function HistoryDetailsButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-[var(--tech-border)] px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:text-orange-500"><Eye size={14} /> Details</button>;
}

function ImageTile({ url, label, onClick }: { url: string; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={`View ${label}`} className="relative block w-full overflow-hidden rounded-md bg-[var(--tech-surface-2)] hover:ring-1 hover:ring-orange-500">
    <img src={url} alt={label} loading="lazy" className="h-36 w-full object-contain" />
    <span className="absolute bottom-2 right-2 rounded bg-black/60 p-1 text-white"><ZoomIn size={15} /></span>
  </button>;
}

export function TechnicianHistoryDetails({ title, fields, record, onClose, note }: {
  title: string;
  fields: { label: string; value?: string }[];
  record: HistoryProofFields;
  onClose: () => void;
  note?: string;
}) {
  const [selected, setSelected] = useState<{ url: string; label: string } | null>(null);
  const images = record.proofImages ?? [];
  const equipment = [
    { label: "Current drone image", url: record.droneImageUrl },
    { label: "Current battery image", url: record.batteryImageUrl },
  ].filter((image): image is { label: string; url: string } => Boolean(image.url));
  // Keep the details dialog inside the Technician theme scope, like the history dialog.
  return (<div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/35 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-4">
        <h2 className="text-[19px] font-semibold text-[var(--tech-text)]">{title}</h2>
        <button type="button" autoFocus aria-label="Close details" onClick={onClose} className="rounded-md p-1.5 text-[var(--tech-muted)] hover:text-orange-500"><X size={19}/></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
          {fields.map(field => <div key={field.label} className="min-w-0"><dt className="text-[11px] text-[var(--tech-muted)]">{field.label}</dt><dd className="mt-1 break-words text-[13px] font-medium text-[var(--tech-text)]">{field.value || "—"}</dd></div>)}
        </dl>
        <section className="border-t border-[var(--tech-border)] pt-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--tech-text)]">Proof images ({images.length})</h3>
          {note && <p className="mb-3 text-[12px] text-[var(--tech-muted)]">{note}</p>}
          {images.length === 0 ? <p className="rounded-md border border-dashed border-[var(--tech-border)] p-4 text-center text-[12px] text-[var(--tech-muted)]">No proof images available.</p> :
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{images.map((image, index) => {
              const label = proofStageLabel(image.stage);
              const metadata = [image.legId && `Leg: ${image.legId}`, image.technicianId && `Technician: ${image.technicianId}`].filter(Boolean);
              return <div key={`${image.stage}:${image.recordedAt}:${index}`} className="min-w-0 rounded-md border border-[var(--tech-border)] p-2">
                <ImageTile url={image.url} label={label} onClick={() => setSelected({ url: image.url, label })}/>
                <div className="space-y-1 px-1 py-2"><p className="text-[13px] font-medium text-[var(--tech-text)]">{label}</p><p className="text-[11px] text-[var(--tech-muted)]">{formatApiDateTime(image.recordedAt)}</p>
                  {metadata.map(value => <p key={value} className="break-all text-[11px] text-[var(--tech-muted)]">{value}</p>)}
                  {image.checklist?.length ? <div className="space-y-1 border-t border-[var(--tech-border)] pt-2"><p className="text-[11px] font-semibold text-[var(--tech-text)]">Checklist</p>{image.checklist.map((item, i) => <div key={`${item.item}:${i}`} className="text-[11px] text-[var(--tech-text-secondary)]"><p>{item.item} · {item.checked === true ? "Checked" : item.checked === false ? "Not checked" : "Not reported"}{item.status ? ` · ${item.status}` : ""}</p>{item.note && <p className="text-[var(--tech-muted)]">{item.note}</p>}</div>)}</div> : null}
                </div>
              </div>;
            })}</div>}
        </section>
        {equipment.length > 0 && <section className="border-t border-[var(--tech-border)] pt-4"><h3 className="text-[13px] font-semibold text-[var(--tech-text)]">Current equipment images</h3><p className="mb-3 mt-1 text-[11px] text-[var(--tech-muted)]">Latest equipment images, not proof of this historical event.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{equipment.map(image => <div key={image.label} className="rounded-md border border-[var(--tech-border)] p-2"><ImageTile {...image} onClick={() => setSelected(image)}/><p className="mt-2 text-[12px] text-[var(--tech-text-secondary)]">{image.label}</p></div>)}</div></section>}
      </div>
      <div className="flex justify-end border-t border-[var(--tech-border)] px-5 py-3"><button type="button" onClick={onClose} className="rounded-md border border-[var(--tech-border)] px-4 py-2 text-[13px] text-[var(--tech-text)] hover:text-orange-500">Close</button></div>
      {selected && <FullImage url={selected.url} label={selected.label} close={() => setSelected(null)}/>}
    </div>
  </div>);
}
