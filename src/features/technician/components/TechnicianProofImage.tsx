import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Image as ImageIcon, X, ZoomIn } from "lucide-react";
import { proofStageLabel, type OrderProofImage } from "../utils/proofImages";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 200 * 1024; // Binary image size, before Base64 encoding.
const MAX_IMAGE_EDGE = 1280;
const MIN_IMAGE_EDGE = 640;
const JPEG_QUALITIES = [0.8, 0.7, 0.6, 0.5];
const accepted = ["image/jpeg", "image/png", "image/webp"];
const button = "rounded-md border border-[var(--tech-border)] px-3 py-2 text-[13px] font-medium text-[var(--tech-text)] hover:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50";

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.onabort = () => reject(new Error("Image reading was cancelled."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read this image."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onerror = () => reject(new Error("The selected file is not a readable image."));
    image.onload = () => resolve(image);
    image.src = url;
  });
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || blob.type !== "image/jpeg") {
        reject(new Error("Could not optimize this image. Choose another image."));
        return;
      }
      resolve(blob);
    }, "image/jpeg", quality);
  });
}

export async function readFile(file: File): Promise<string> {
  if (!accepted.includes(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size === 0) throw new Error("The selected image is empty.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Choose an image up to 10 MB.");

  // Decode once and verify that the file is actually a readable image.
  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longest) throw new Error("The selected file is not a readable image.");

    // Already small: keep the original bytes, quality and format.
    if (file.size <= TARGET_IMAGE_BYTES) return await toDataUrl(file);

    // Resize large photos without cropping or changing their aspect ratio.
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image optimization is unavailable in this browser.");

    try {
      let edge = Math.min(longest, MAX_IMAGE_EDGE);
      const minimumEdge = Math.min(edge, MIN_IMAGE_EDGE);
      while (true) {
        const scale = edge / longest;
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        // JPEG has no transparency; use a white background for PNG/WebP.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of JPEG_QUALITIES) {
          const compressed = await encodeJpeg(canvas, quality);
          if (compressed.size <= TARGET_IMAGE_BYTES) {
            return await toDataUrl(compressed);
          }
        }
        if (edge <= minimumEdge) break;
        edge = Math.max(minimumEdge, Math.floor(edge * 0.85));
      }
      throw new Error("Could not optimize this image to 200 KB. Choose another image.");
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function FullImage({ url, label, close }: { url: string; label: string; close: () => void }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, [close]);
  return createPortal(<div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[220] flex flex-col bg-black/90 p-4 text-white" onClick={close}>
    <div className="flex items-center justify-between gap-4 pb-3" onClick={event => event.stopPropagation()}><span className="text-sm font-medium">{label}</span><button type="button" autoFocus aria-label="Close image" onClick={close} className="rounded-md p-2 hover:bg-white/20"><X size={22} /></button></div>
    <div className="flex min-h-0 flex-1 items-center justify-center" onClick={event => event.stopPropagation()}><img src={url} alt={label} className="max-h-full max-w-full object-contain" /></div>
  </div>, document.body);
}

export function ProofActionDialog({ title, description, reference, children, confirmLabel, onCancel, onConfirm, disabled = false }: {
  title: string; description: string; reference: string; children?: ReactNode; confirmLabel: string;
  onCancel: () => void; onConfirm: (image: string) => void; disabled?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const request = useRef(0);
  const submitted = useRef(false);
  useEffect(() => () => { request.current++; }, []);
  async function select(file: File) {
    const id = ++request.current;
    setUrl(""); setName(""); setError(""); setReading(true);
    try { const data = await readFile(file); if (request.current === id) { setUrl(data); setName(data.startsWith("data:image/jpeg;") && file.type !== "image/jpeg" ? `${file.name.replace(/\.[^.]+$/, "")}.jpg` : file.name); } }
    catch (err) { if (request.current === id) setError(err instanceof Error ? err.message : "Unable to read image."); }
    finally { if (request.current === id) setReading(false); }
  }
  function remove() { request.current++; setUrl(""); setName(""); setReading(false); setError(""); }
  return (<div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-4"><div><h2 className="text-[18px] font-semibold text-[var(--tech-text)]">{title}</h2><p className="mt-1 break-all text-[12px] text-[var(--tech-muted)]">{reference}</p></div><button type="button" aria-label="Close" onClick={onCancel} className="text-[var(--tech-muted)] hover:text-orange-500"><X size={18} /></button></div>
      <div className="space-y-4 px-5 py-4"><p className="text-[13px] leading-5 text-[var(--tech-text-secondary)]">{description}</p>{children}
        <div><p className="mb-2 text-[13px] font-medium text-[var(--tech-text)]">Proof image <span className="text-orange-500">*</span></p>
          {url ? <div className="rounded-md border border-[var(--tech-border)] p-2"><button type="button" onClick={() => setExpanded(true)} aria-label="View full proof image" className="relative block w-full overflow-hidden rounded-md bg-[var(--tech-surface-2)]"><img src={url} alt="Selected proof" className="h-36 w-full object-contain" /><ZoomIn size={16} className="absolute bottom-2 right-2 text-orange-500" /></button><div className="mt-2 flex items-center justify-between gap-2"><span className="min-w-0 break-all text-xs text-[var(--tech-muted)]">{name}</span><button type="button" onClick={remove} className="shrink-0 text-xs text-orange-500">Remove</button></div></div> : <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-[var(--tech-border)] p-5 text-center text-[13px] text-[var(--tech-text-secondary)] hover:border-orange-500"><ImagePlus size={22} className="text-orange-500" /><span>{reading ? "Preparing image..." : "Choose image"}</span><span className="text-xs text-[var(--tech-muted)]">JPG, PNG, WebP · Up to 10 MB</span><input aria-label="Proof image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void select(file); }} /></label>}
          {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--tech-border)] px-5 py-4"><button type="button" onClick={onCancel} className={button}>Cancel</button><button type="button" disabled={disabled || !url || reading} onClick={() => { if (!url || reading || disabled || submitted.current) return; submitted.current = true; onConfirm(url); }} className="rounded-md bg-orange-500 px-4 py-2 text-[13px] font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{confirmLabel}</button></div>
      {expanded && <FullImage url={url} label="Proof image" close={() => setExpanded(false)} />}
    </div>
  </div>);
}

export function OrderProofGallery({ images, compact = false }: { images?: OrderProofImage[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OrderProofImage | null>(null);
  if (!images?.length) return null;
  const tiles = <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <button key={`${image.stage}:${image.recordedAt}:${index}`} type="button" onClick={() => setSelected(image)} className="overflow-hidden rounded-md border border-[var(--tech-border)] text-left hover:border-orange-500/50"><img src={image.url} alt={proofStageLabel(image.stage)} loading="lazy" className="h-24 w-full bg-[var(--tech-surface-2)] object-contain"/><div className="p-2 text-xs text-[var(--tech-text)]">{proofStageLabel(image.stage)}<p className="mt-1 break-all text-[11px] text-[var(--tech-muted)]">{image.recordedAt || ""}</p></div></button>)}</div>;
  return <>{compact ? <><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[12px] text-[var(--tech-text-secondary)] hover:text-orange-500"><ImageIcon size={14} /> Proof images ({images.length})</button>{open && (<div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 p-4"><div role="dialog" aria-modal="true" aria-label="Order proof images" className="max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5"><div className="mb-4 flex justify-between text-[var(--tech-text)]"><h2 className="font-semibold">Proof images</h2><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18}/></button></div>{tiles}</div></div>)}</> : <section><h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--tech-text)]">Proof images</h3>{tiles}</section>}{selected && <FullImage url={selected.url} label={proofStageLabel(selected.stage)} close={() => setSelected(null)} />}</>;
}
