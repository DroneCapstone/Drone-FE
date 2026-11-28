import { useEffect, useRef, useState } from "react";
import { ImagePlus, ZoomIn } from "lucide-react";
import { FullImage, readFile } from "./TechnicianProofImage";

export function WorkOrderProofField({ label, value, onChange, disabled, onBusyChange }: {
  label: string; value: string; onChange: (url: string) => void;
  disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  async function select(file: File) {
    const token = ++sequence.current;
    setBusy(true); onBusyChange(true); setError("");
    try {
      const url = await readFile(file);
      if (token === sequence.current) onChange(url);
    } catch (err) {
      if (token === sequence.current) setError(err instanceof Error ? err.message : "Unable to read image.");
    } finally {
      if (token === sequence.current) { setBusy(false); onBusyChange(false); }
    }
  }
  return <div className="min-w-0 space-y-2">
    <p className="text-[13px] font-medium text-[var(--tech-text)]">{label} <span className="font-normal text-[var(--tech-muted)]">(optional)</span></p>
    {value && <div className="rounded-md border border-[var(--tech-border)] p-2">
      <button type="button" onClick={() => setExpanded(true)} aria-label={`View ${label}`} className="relative block w-full rounded-md bg-[var(--tech-surface-2)]">
        <img src={value} alt={label} className="h-36 w-full object-contain"/><ZoomIn size={16} className="absolute bottom-2 right-2 text-orange-500"/>
      </button>
      {!disabled && <button type="button" disabled={busy} onClick={() => { sequence.current++; onChange(""); setError(""); }} className="mt-2 text-[12px] text-orange-500 disabled:opacity-50">Remove</button>}
    </div>}
    {!disabled && <label className={`flex flex-col items-center gap-2 rounded-md border border-dashed border-[var(--tech-border)] p-4 text-center text-[13px] text-[var(--tech-text-secondary)] ${busy ? "opacity-60" : "cursor-pointer hover:border-orange-500"}`}>
      <ImagePlus size={20} className="text-orange-500"/><span>{busy ? "Optimizing image..." : value ? "Replace image" : "Choose image"}</span><span className="text-[11px] text-[var(--tech-muted)]">JPG, PNG, WebP · Up to 10 MB</span>
      <input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} className="sr-only" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void select(file); }}/>
    </label>}
    {error && <p role="alert" className="text-[12px] text-red-500">{error}</p>}
    {expanded && value && <FullImage url={value} label={label} close={() => setExpanded(false)}/>}
  </div>;
}
