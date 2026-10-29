import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Minus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { TechnicianPageShell } from "../components/TechnicianPageShell";
import type { HubSupply, HubSupplyInput } from "../api/hubSuppliesApi";
import {
  useAdjustHubSupplyMutation,
  useCreateHubSupplyMutation,
  useDeleteHubSupplyMutation,
  useHubSuppliesQuery,
  useUpdateHubSupplyMutation,
} from "../hooks/useHubSuppliesQueries";
import { formatApiDateTime } from "../api/httpClient";

const PAGE_SIZE = 9;
// UI-only threshold, not a Backend-owned low-stock/notification rule.
const LOW_STOCK_THRESHOLD = 5;
const inputClass = "tech-control h-10 w-full rounded-md px-3 text-[13px]";
type EditorState = { id?: number; itemName: string; quantity: string; unit: string };
const EMPTY_EDITOR: EditorState = { itemName: "", quantity: "0", unit: "" };

function normalizeEditor(input: EditorState): HubSupplyInput {
  const quantity = Number(input.quantity);
  if (!input.itemName.trim()) throw new Error("Supply name is required.");
  if (!input.unit.trim()) throw new Error("Unit is required (for example: chiếc, bộ, cái).");
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative whole number.");
  }
  return { item_name: input.itemName.trim(), quantity, unit: input.unit.trim() };
}

export function HubSuppliesPage() {
  const suppliesQuery = useHubSuppliesQuery();
  const createMutation = useCreateHubSupplyMutation();
  const updateMutation = useUpdateHubSupplyMutation();
  const adjustMutation = useAdjustHubSupplyMutation();
  const deleteMutation = useDeleteHubSupplyMutation();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"All" | "Low stock" | "Out of stock">("All");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HubSupply | null>(null);

  const supplies = suppliesQuery.data ?? [];
  const totalQuantity = supplies.reduce((sum, row) => sum + row.quantity, 0);
  const lowStockCount = supplies.filter((row) => row.quantity < LOW_STOCK_THRESHOLD).length;
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return supplies.filter((item) => {
      const matchesText = !query || String(item.id).includes(query) ||
        item.itemName.toLowerCase().includes(query) || item.unit.toLowerCase().includes(query);
      const matchesStock = stockFilter === "All" ||
        (stockFilter === "Low stock" && item.quantity < LOW_STOCK_THRESHOLD) ||
        (stockFilter === "Out of stock" && item.quantity === 0);
      return matchesText && matchesStock;
    });
  }, [supplies, search, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const visible = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const clearMessage = () => { setErrorMessage(""); setSuccessMessage(""); };
  const openAdd = () => { clearMessage(); setEditor({ ...EMPTY_EDITOR }); };
  const openEdit = (row: HubSupply) => {
    clearMessage();
    setEditor({ id: row.id, itemName: row.itemName, quantity: String(row.quantity), unit: row.unit });
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || isSaving) return;
    try {
      setErrorMessage("");
      const payload = normalizeEditor(editor);
      if (editor.id !== undefined) {
        await updateMutation.mutateAsync({ id: editor.id, payload });
        setSuccessMessage("Supply updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        setSuccessMessage("Supply added successfully.");
      }
      setEditor(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save supply.");
    }
  };
  const adjust = async (row: HubSupply, delta: number) => {
    if (workingId !== null || row.quantity + delta < 0) return;
    setWorkingId(row.id);
    clearMessage();
    try {
      await adjustMutation.mutateAsync({ id: row.id, delta });
      setSuccessMessage(`${row.itemName}: quantity updated.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to adjust inventory.");
    } finally { setWorkingId(null); }
  };
  const remove = async () => {
    if (!deleteCandidate || deleteMutation.isPending) return;
    clearMessage();
    try {
      await deleteMutation.mutateAsync(deleteCandidate.id);
      setDeleteCandidate(null);
      setSuccessMessage("Supply record deleted.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete supply.");
      setDeleteCandidate(null);
    }
  };

  return (
    <TechnicianPageShell
      title="Hub supplies"
      description="Consumable maintenance materials stored at your assigned hub. Inventory changes are saved to Backend."
    >
      {errorMessage && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">
          {errorMessage} <button type="button" className="ml-3 underline" onClick={() => setErrorMessage("")}>Dismiss</button>
        </div>
      )}
      {successMessage && <p role="status" className="mb-4 text-[13px] text-emerald-500">{successMessage}</p>}
      {suppliesQuery.error instanceof Error && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">
          {suppliesQuery.error.message}
          <button type="button" onClick={() => void suppliesQuery.refetch()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {[
          { title: "Supply items", value: suppliesQuery.isPending ? "—" : supplies.length, note: "Distinct inventory records" },
          { title: "Total quantity", value: suppliesQuery.isPending ? "—" : totalQuantity, note: "Across all units (mixed types)" },
          { title: "Low stock", value: suppliesQuery.isPending ? "—" : lowStockCount, note: `Quantity < ${LOW_STOCK_THRESHOLD} · UI-only threshold` },
        ].map((stat) => (
          <Card key={stat.title} className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-5">
              <p className="text-[12px] text-[var(--tech-text-secondary)]">{stat.title}</p>
              <p className="mt-3 text-[28px] font-semibold text-[var(--tech-text)]">{stat.value}</p>
              <p className="mt-1 text-[11px] text-[var(--tech-muted)]">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] p-4">
          <div className="relative min-w-[230px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[var(--tech-muted)]" />
            <input type="search" className={`${inputClass} pl-9`} placeholder="Search supply ID, name or unit..." value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <select className={`${inputClass} !w-[155px]`} value={stockFilter}
            onChange={(event) => { setStockFilter(event.target.value as typeof stockFilter); setPage(1); }}>
            <option>All</option><option>Low stock</option><option>Out of stock</option>
          </select>
          <button type="button" onClick={() => void suppliesQuery.refetch()}
            disabled={suppliesQuery.isFetching} title="Refresh supplies"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] text-[var(--tech-text-secondary)] disabled:opacity-60">
            <RefreshCw size={15} className={suppliesQuery.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={openAdd}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-orange-500 px-4 text-[12px] font-semibold text-black hover:bg-orange-600">
            <Plus size={16} /> Add supply
          </button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-[12px]">
              <thead className="border-b border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[10px] uppercase tracking-wide text-[var(--tech-subtle)]">
                <tr><th className="px-4 py-4 text-center">No.</th><th className="px-4 py-4 text-left">Item / ID</th>
                  <th className="px-4 py-4 text-center">Hub ID</th><th className="px-4 py-4 text-center">Quantity</th>
                  <th className="px-4 py-4 text-center">Unit</th><th className="px-4 py-4 text-center">Updated</th>
                  <th className="px-4 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--tech-border)]">
                {visible.map((row, index) => (
                  <tr key={row.id} className="hover:bg-[var(--tech-surface-2)]">
                    <td className="px-4 py-4 text-center text-[var(--tech-muted)]">{(activePage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-4"><p className="font-semibold text-[var(--tech-text)]">{row.itemName}</p>
                      <p className="mt-1 text-[10px] text-[var(--tech-muted)]">#{row.id}</p></td>
                    <td className="px-4 py-4 text-center text-[var(--tech-muted)]">{row.hubId || "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-semibold ${row.quantity < LOW_STOCK_THRESHOLD ? "text-orange-500" : "text-[var(--tech-text)]"}`}>{row.quantity}</span>
                      {row.quantity < LOW_STOCK_THRESHOLD && <span title="Low stock" className="ml-1 inline-block align-middle text-orange-500"><AlertTriangle size={13} /></span>}
                    </td>
                    <td className="px-4 py-4 text-center text-[var(--tech-muted)]">{row.unit}</td>
                    <td className="px-4 py-4 text-center text-[var(--tech-muted)]">{row.updatedAt ? formatApiDateTime(row.updatedAt) : "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" title="Remove one unit" aria-label={`Remove one ${row.itemName}`} disabled={workingId !== null || row.quantity === 0}
                          onClick={() => void adjust(row, -1)} className="rounded-md border border-[var(--tech-border)] p-1.5 text-[var(--tech-muted)] hover:text-orange-500 disabled:opacity-30"><Minus size={15} /></button>
                        <button type="button" title="Add one unit" aria-label={`Add one ${row.itemName}`} disabled={workingId !== null}
                          onClick={() => void adjust(row, 1)} className="rounded-md border border-[var(--tech-border)] p-1.5 text-[var(--tech-muted)] hover:text-orange-500 disabled:opacity-30"><Plus size={15} /></button>
                        <button type="button" title="Edit supply" aria-label={`Edit ${row.itemName}`} onClick={() => openEdit(row)} className="rounded-md border border-[var(--tech-border)] p-1.5 text-[var(--tech-muted)] hover:text-orange-500"><Pencil size={15} /></button>
                        <button type="button" title="Delete record" aria-label={`Delete ${row.itemName}`} onClick={() => { clearMessage(); setDeleteCandidate(row); }}
                          className="rounded-md border border-[var(--tech-border)] p-1.5 text-[var(--tech-muted)] hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center text-[13px] text-[var(--tech-muted)]">
                    {suppliesQuery.isPending ? "Loading hub supplies..." : suppliesQuery.isError && !suppliesQuery.data ? "Unable to load hub supplies." : "No supplies match the current filters."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tech-border)] px-4 py-3 text-[11px] text-[var(--tech-muted)]">
            <span>{filtered.length ? `Showing ${(activePage - 1) * PAGE_SIZE + 1}–${Math.min(activePage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "0 supplies"}</span>
            <div className="flex items-center gap-1">
              <button type="button" title="Previous page" disabled={activePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-[var(--tech-border)] p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button type="button" key={number} onClick={() => setPage(number)}
                  className={`h-8 min-w-8 rounded-md px-2 ${activePage === number ? "bg-orange-500 font-semibold text-black" : "border border-[var(--tech-border)] text-[var(--tech-text-secondary)]"}`}>{number}</button>
              ))}
              <button type="button" title="Next page" disabled={activePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded-md border border-[var(--tech-border)] p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-[var(--tech-muted)]"><Package size={13} /> Inventory changes are scoped to your Technician hub by Backend. Low stock warnings on this page are display-only.</p>

      {editor && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-label={editor.id ? "Edit hub supply" : "Add hub supply"} className="w-full max-w-md rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-[17px] font-semibold text-[var(--tech-text)]">{editor.id ? "Edit hub supply" : "Add hub supply"}</h2>
              <button type="button" aria-label="Close" onClick={() => { setEditor(null); clearMessage(); }} className="text-[var(--tech-muted)]"><X size={18} /></button>
            </div>
            {errorMessage && <p role="alert" className="mb-3 text-[12px] text-red-500">{errorMessage}</p>}
            <form onSubmit={(e) => void save(e)} className="space-y-4">
              <label className="block text-[12px] text-[var(--tech-text-secondary)]">Supply name
                <input className={`mt-1 ${inputClass}`} autoFocus value={editor.itemName} maxLength={150} onChange={(e) => setEditor((old) => old && { ...old, itemName: e.target.value })} placeholder="e.g. Propeller DJI Matrice 100" required />
              </label>
              <label className="block text-[12px] text-[var(--tech-text-secondary)]">Quantity
                <input className={`mt-1 ${inputClass}`} type="number" min="0" step="1" value={editor.quantity} onChange={(e) => setEditor((old) => old && { ...old, quantity: e.target.value })} required />
              </label>
              <label className="block text-[12px] text-[var(--tech-text-secondary)]">Unit
                <input className={`mt-1 ${inputClass}`} value={editor.unit} maxLength={30} onChange={(e) => setEditor((old) => old && { ...old, unit: e.target.value })} placeholder="e.g. chiếc, bộ, cái" required />
              </label>
              <p className="text-[11px] text-[var(--tech-muted)]">The Backend automatically assigns your hub. There is no hub selector for Technician.</p>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditor(null)} className="rounded-md border border-[var(--tech-border)] px-4 py-2 text-[12px] text-[var(--tech-text-secondary)]">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-md bg-orange-500 px-4 py-2 text-[12px] font-semibold text-black disabled:opacity-50">{isSaving ? "Saving..." : "Save supply"}</button></div>
            </form>
          </div>
        </div>
      )}
      {deleteCandidate && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div role="alertdialog" aria-modal="true" aria-label="Confirm delete supply" className="w-full max-w-md rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5 shadow-2xl">
            <div className="flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /><h2 className="text-[17px] font-semibold text-[var(--tech-text)]">Delete supply record?</h2></div>
            <p className="mt-3 text-[13px] text-[var(--tech-muted)]">This deletes <strong className="text-[var(--tech-text)]">{deleteCandidate.itemName}</strong> (#{deleteCandidate.id}) from inventory. Use Edit or adjust quantity to 0 if the item is still tracked.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteCandidate(null)} className="rounded-md border border-[var(--tech-border)] px-4 py-2 text-[12px]">Cancel</button>
              <button type="button" disabled={deleteMutation.isPending} onClick={() => void remove()} className="rounded-md bg-red-600 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}
