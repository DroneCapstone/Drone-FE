import { useMemo, useState, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { formatApiDateTime } from "../api/httpClient";
import { getHubSupplyDetailApi, type HubSupply } from "../api/hubSuppliesApi";
import {
  inventoryDetailKey,
  useHubSuppliesQuery,
  useHubSupplyDetailQuery,
  useUseHubPartsMutation,
} from "../hooks/useHubSuppliesQueries";

const PAGE_SIZE = 9;
const inputClass = "tech-control h-10 w-full rounded-md px-3 text-[13px]";
const subtle = "text-[var(--tech-muted)]";
const outlineBtn = "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40";
const primaryBtn = "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 text-[12px] font-semibold text-black transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50";

type StockFilter = "All" | "Low stock" | "Out of stock";

function readableDate(value: string | null | undefined) {
  return value ? formatApiDateTime(value, "—") : "—";
}

function partName(row: HubSupply) {
  return row.partCategory?.name ?? `Part category #${row.partCategoryId}`;
}

function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-[var(--tech-text)]">{title}</h2>
          <button type="button" className={outlineBtn} aria-label="Close dialog" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StockDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useHubSupplyDetailQuery(id);
  const item = q.data;
  const category = item?.partCategory;
  return (
    <Modal title="Inventory details" onClose={onClose}>
      {q.isPending ? <p className={subtle}>Loading details...</p>
        : q.isError ? <p className="text-red-500">{q.error instanceof Error ? q.error.message : "Failed to load details."}</p>
        : item ? (
          <div className="space-y-3 text-[13px] text-[var(--tech-text)]">
            <p><strong>Part:</strong> {partName(item)}</p>
            <p><strong>Inventory ID:</strong> #{item.id}</p>
            <p><strong>Part category ID:</strong> #{item.partCategoryId}</p>
            <p><strong>Category type:</strong> {category?.categoryType || "—"}</p>
            <p><strong>Quantity:</strong> {item.quantity} · <strong>Min stock:</strong> {item.minStockThreshold}</p>
            <p><strong>Compatible drones:</strong> {category?.compatibleDroneModels.length ? category.compatibleDroneModels.join(", ") : "—"}</p>
            <p><strong>Unit cost:</strong> {category?.unitCost != null ? `${category.unitCost.toLocaleString("vi-VN")} VND` : "—"}</p>
            <p><strong>Description:</strong> {category?.description || "—"}</p>
            <p><strong>Updated:</strong> {readableDate(item.updatedAt)}</p>
          </div>
        ) : <p className={subtle}>Inventory not found.</p>}
    </Modal>
  );
}

function Pagination({ count, page, onPageChange }: {
  count: number;
  page: number;
  onPageChange: (next: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(page, pages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tech-border)] px-4 py-3 text-[11px] text-[var(--tech-muted)]">
      <span>{count ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, count)} of ${count}` : "0 records"}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={outlineBtn} title="Previous page"
          disabled={current === 1} onClick={() => onPageChange(current - 1)}><ChevronLeft size={14} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} onClick={() => onPageChange(n)}
            className={`h-8 min-w-8 rounded-md px-2 ${current === n ? "bg-orange-500 font-semibold text-black" : "border border-[var(--tech-border)] text-[var(--tech-text-secondary)]"}`}>{n}</button>
        ))}
        <button type="button" className={outlineBtn} title="Next page"
          disabled={current === pages} onClick={() => onPageChange(current + 1)}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

export function HubSuppliesPage() {
  const inventoryQuery = useHubSuppliesQuery();
  const usePartsMutation = useUseHubPartsMutation();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [useTarget, setUseTarget] = useState<HubSupply | null>(null);
  const [useQuantity, setUseQuantity] = useState("1");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const supplies = inventoryQuery.data ?? [];
  // Inventory list has category IDs; detail API adds human-readable part names.
  const detailQueries = useQueries({
    queries: supplies.map((row) => ({
      queryKey: inventoryDetailKey(row.id),
      queryFn: () => getHubSupplyDetailApi(row.id),
      staleTime: 5 * 60_000,
      gcTime: 60 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const enriched = supplies.map((row, index) => ({
    ...row,
    partCategory: detailQueries[index]?.data?.partCategory ?? row.partCategory,
  }));
  const totalQuantity = supplies.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = supplies.filter((item) => item.isLowStock).length;

  const filtered = useMemo(() => enriched.filter((item) => {
    const q = search.trim().toLowerCase();
    const matches = !q || String(item.id).includes(q) || String(item.partCategoryId).includes(q) ||
      partName(item).toLowerCase().includes(q);
    const matchesStock = stockFilter === "All" ||
      (stockFilter === "Low stock" && item.isLowStock) ||
      (stockFilter === "Out of stock" && item.quantity === 0);
    return matches && matchesStock;
  }), [enriched, search, stockFilter]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const confirmUse = async () => {
    if (!useTarget || usePartsMutation.isPending) return;
    const quantity = Number(useQuantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > useTarget.quantity) {
      setErrorMessage("Quantity used must be between 1 and current available stock.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updated = await usePartsMutation.mutateAsync({ inventoryId: useTarget.id, quantityUsed: quantity });
      setUseTarget(null);
      setSuccessMessage(`${quantity} part(s) deducted successfully. Remaining: ${updated.quantity}.`);
      void inventoryQuery.refetch();
    } catch (error) {
      setErrorMessage(
        `${error instanceof Error ? error.message : "Unable to use parts."} ` +
        "If the request may have reached the server, refresh inventory before retrying to avoid double deduction.",
      );
    }
  };

  return (
    <TechnicianPageShell title="Hub supplies" description="">
      {errorMessage && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">
          {errorMessage}
          <button type="button" className="ml-3 underline" onClick={() => setErrorMessage("")}>Dismiss</button>
        </div>
      )}
      {successMessage && <p role="status" className="mb-4 text-[13px] text-emerald-500">{successMessage}</p>}
      {inventoryQuery.isError && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">
          {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : "Unable to load hub inventory."}
          <button type="button" className="ml-3 underline" onClick={() => void inventoryQuery.refetch()}>Retry</button>
        </div>
      )}
      
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {[
          { label: "Supply categories", value: inventoryQuery.isPending ? "—" : supplies.length },
          { label: "Total quantity", value: inventoryQuery.isPending ? "—" : totalQuantity },
          { label: "Low stock", value: inventoryQuery.isPending ? "—" : lowStockCount },
        ].map((item) => (
          <Card key={item.label} className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-5">
              <p className="text-[12px] text-[var(--tech-text-secondary)]">{item.label}</p>
              <p className="mt-3 text-[28px] font-semibold text-[var(--tech-text)]">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] p-4">
          <div className="relative min-w-[230px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[var(--tech-muted)]" />
            <input type="search" className={`${inputClass} pl-9`} value={search}
              placeholder="Search inventory or part category..."
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className={`${inputClass} !w-[155px]`} value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value as StockFilter); setPage(1); }}>
            <option>All</option>
            <option>Low stock</option>
            <option>Out of stock</option>
          </select>
          <button type="button" className={`${outlineBtn} h-10`} disabled={inventoryQuery.isFetching}
            onClick={() => void inventoryQuery.refetch()}>
            <RefreshCw size={15} className={inventoryQuery.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-[12px]">
              <thead className="border-b border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[10px] uppercase tracking-wide text-[var(--tech-subtle)]">
                <tr>
                  <th className="px-4 py-4 text-center">No.</th>
                  <th className="px-4 py-4 text-left">Part / ID</th>
                  <th className="px-4 py-4 text-center">Hub ID</th>
                  <th className="px-4 py-4 text-center">Quantity</th>
                  <th className="px-4 py-4 text-center">Min stock</th>
                  <th className="px-4 py-4 text-center">Stock status</th>
                  <th className="px-4 py-4 text-center">Updated</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tech-border)]">
                {visible.map((item, index) => (
                  <tr key={item.id} className="hover:bg-[var(--tech-surface-2)]">
                    <td className={`px-4 py-4 text-center ${subtle}`}>{start + index + 1}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--tech-text)]">{partName(item)}</p>
                      
                    </td>
                    <td className={`px-4 py-4 text-center ${subtle}`}>{item.hubId || "—"}</td>
                    <td className="px-4 py-4 text-center font-semibold text-[var(--tech-text)]">{item.quantity}</td>
                    <td className={`px-4 py-4 text-center ${subtle}`}>{item.minStockThreshold}</td>
                    <td className="px-4 py-4 text-center">
                      {item.quantity === 0 ? <span className="text-red-500">Out of stock</span> :
                        item.isLowStock ? <span className="inline-flex items-center gap-1 text-orange-500"><AlertTriangle size={13} /> Low stock</span> :
                          <span className="text-emerald-500">In stock</span>}
                    </td>
                    <td className={`px-4 py-4 text-center ${subtle}`}>{readableDate(item.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={outlineBtn} onClick={() => setDetailsId(item.id)}>Details</button>
                        <button type="button" className={outlineBtn} disabled={item.quantity === 0}
                          onClick={() => {
                            setErrorMessage("");
                            setUseTarget(item);
                            setUseQuantity("1");
                          }}>Use</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr><td colSpan={8} className={`px-4 py-14 text-center text-[13px] ${subtle}`}>
                    {inventoryQuery.isPending ? "Loading hub inventory..." : inventoryQuery.isError && !inventoryQuery.data ? "Unable to load hub inventory." : "No inventory matches the current filters."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination count={filtered.length} page={currentPage} onPageChange={setPage} />
        </CardContent>
      </Card>

      {useTarget && (
        <Modal title="Use parts" onClose={() => { if (!usePartsMutation.isPending) setUseTarget(null); }}>
          <p className={`mb-4 text-[13px] ${subtle}`}>
            {partName(useTarget)} · Inventory #{useTarget.id} · Available: {useTarget.quantity}. This action deducts stock.
          </p>
          <label className="block text-[12px] text-[var(--tech-text-secondary)]">
            Quantity used
            <input className={`mt-1 ${inputClass}`} type="number" min="1" max={useTarget.quantity} step="1"
              value={useQuantity} onChange={(e) => setUseQuantity(e.target.value)} />
          </label>
          {errorMessage && <p role="alert" className="mt-2 text-[12px] text-red-500">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={outlineBtn} disabled={usePartsMutation.isPending}
              onClick={() => setUseTarget(null)}>Cancel</button>
            <button type="button" className={primaryBtn} disabled={usePartsMutation.isPending}
              onClick={() => void confirmUse()}>
              {usePartsMutation.isPending ? "Saving..." : "Confirm use"}
            </button>
          </div>
        </Modal>
      )}
      {detailsId !== null && <StockDetails id={detailsId} onClose={() => setDetailsId(null)} />}
    </TechnicianPageShell>
  );
}
