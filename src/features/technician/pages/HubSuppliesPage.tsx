import { useState, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { getHubSupplyDetailApi, type HubSupply } from "../api/hubSuppliesApi";
import {
  inventoryDetailKey,
  useHubSuppliesQuery,
  useUseHubPartsMutation,
} from "../hooks/useHubSuppliesQueries";

const PAGE_SIZE = 9;
const inputClass = "tech-control h-10 w-full rounded-md px-3 text-[13px]";
const subtle = "text-[var(--tech-muted)]";
const outlineBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40";
const primaryBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 text-[12px] font-semibold text-black transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50";

function partName(row: HubSupply): string {
  return row.partCategory?.name ?? `Part category #${row.partCategoryId}`;
}

function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5 shadow-2xl"
      >
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

function Pagination({ count, page, onPageChange }: {
  count: number;
  page: number;
  onPageChange: (next: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(page, pages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tech-border)] px-4 py-3 text-[11px] text-[var(--tech-muted)]">
      <span>
        {count
          ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, count)} of ${count}`
          : "0 records"}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={outlineBtn} title="Previous page" disabled={current === 1}
          onClick={() => onPageChange(current - 1)}>
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
          <button type="button" key={number} onClick={() => onPageChange(number)}
            className={`h-8 min-w-8 rounded-md px-2 ${current === number
              ? "bg-orange-500 font-semibold text-black"
              : "border border-[var(--tech-border)] text-[var(--tech-text-secondary)]"}`}>
            {number}
          </button>
        ))}
        <button type="button" className={outlineBtn} title="Next page" disabled={current === pages}
          onClick={() => onPageChange(current + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function HubSuppliesPage() {
  const inventoryQuery = useHubSuppliesQuery();
  const usePartsMutation = useUseHubPartsMutation();
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("All models");
  const [page, setPage] = useState(1);
  const [useTarget, setUseTarget] = useState<HubSupply | null>(null);
  const [useQuantity, setUseQuantity] = useState("1");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const supplies = inventoryQuery.data ?? [];
  // Most list responses already contain part_category. Query detail only if missing.
  const detailQueries = useQueries({
    queries: supplies.map((row) => ({
      queryKey: inventoryDetailKey(row.id),
      queryFn: () => getHubSupplyDetailApi(row.id),
      enabled: !row.partCategory,
      staleTime: 5 * 60_000,
      gcTime: 60 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const enriched = supplies.map((row, index) => ({
    ...row,
    partCategory: row.partCategory ?? detailQueries[index]?.data?.partCategory,
  }));

  const models = Array.from(new Set(
    enriched.flatMap((item) => item.partCategory?.compatibleDroneModels ?? []),
  )).sort((a, b) => a.localeCompare(b));

  const filtered = enriched.filter((item) => {
    const query = search.trim().toLowerCase();
    const category = item.partCategory;
    const searchable = [
      category?.name,
      category?.categoryType,
      ...(category?.compatibleDroneModels ?? []),
    ].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) &&
      (modelFilter === "All models" || Boolean(category?.compatibleDroneModels.includes(modelFilter)));
  });

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const confirmUse = async () => {
    if (!useTarget || usePartsMutation.isPending) return;
    const quantity = Number(useQuantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > useTarget.quantity) {
      setErrorMessage("Quantity used must be a whole number from 1 to the available quantity.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const updated = await usePartsMutation.mutateAsync({
        inventoryId: useTarget.id,
        quantityUsed: quantity,
      });
      setUseTarget(null);
      setSuccessMessage(`${quantity} part(s) deducted successfully. Remaining: ${updated.quantity}.`);
      void inventoryQuery.refetch();
    } catch (error) {
      setErrorMessage(
        `${error instanceof Error ? error.message : "Unable to use parts."} ` +
        "Refresh inventory before retrying if the request may have reached the server, to avoid double deduction.",
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
      {successMessage && (
        <p role="status" className="mb-4 text-[13px] text-emerald-500">{successMessage}</p>
      )}
      {inventoryQuery.isError && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">
          {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : "Unable to load hub inventory."}
          <button type="button" className="ml-3 underline" onClick={() => void inventoryQuery.refetch()}>Retry</button>
        </div>
      )}

      
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] p-4">
          <div className="relative min-w-[230px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[var(--tech-muted)]" />
            <input type="search" className={`${inputClass} pl-9`} value={search}
              placeholder="Search part name, category or drone model..."
              onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <select aria-label="Compatible drone model" className={`${inputClass} !w-[190px]`}
            value={modelFilter}
            onChange={(event) => { setModelFilter(event.target.value); setPage(1); }}>
            <option value="All models">All models</option>
            {models.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
          <button type="button" className={`${outlineBtn} h-10`} disabled={inventoryQuery.isFetching}
            onClick={() => void inventoryQuery.refetch()}>
            <RefreshCw size={15} className={inventoryQuery.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-[12px]">
              <thead className="border-b border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[10px] uppercase tracking-wide text-[var(--tech-subtle)]">
                <tr>
                  <th className="w-[33%] px-4 py-4 text-left">Spare part</th>
                  <th className="w-[16%] px-4 py-4 text-left">Category</th>
                  <th className="w-[32%] px-4 py-4 text-left">Compatible drone models</th>
                  <th className="w-[10%] px-4 py-4 text-center">Quantity</th>
                  <th className="w-[9%] px-4 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tech-border)]">
                {visible.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--tech-surface-2)]">
                    <td className="px-4 py-4 text-[13px] font-semibold text-[var(--tech-text)]">
                      {partName(item)}
                    </td>
                    <td className="px-4 py-4 text-[12px] text-[var(--tech-text-secondary)]">
                      {item.partCategory?.categoryType || "—"}
                    </td>
                    <td className="px-4 py-4 text-[12px] text-[var(--tech-text-secondary)]">
                      {item.partCategory?.compatibleDroneModels.length
                        ? item.partCategory.compatibleDroneModels.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-center text-[14px] font-semibold text-[var(--tech-text)]">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button type="button" className={outlineBtn} disabled={item.quantity === 0}
                        onClick={() => {
                          setErrorMessage("");
                          setUseTarget(item);
                          setUseQuantity("1");
                        }}>
                        Use
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`px-4 py-14 text-center text-[13px] ${subtle}`}>
                      {inventoryQuery.isPending
                        ? "Loading hub inventory..."
                        : inventoryQuery.isError && !inventoryQuery.data
                          ? "Unable to load hub inventory."
                          : "No spare parts match the current search or filter."}
                    </td>
                  </tr>
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
            {partName(useTarget)} · Available: {useTarget.quantity}. Confirming deducts stock at this Hub.
          </p>
          <label className="block text-[12px] text-[var(--tech-text-secondary)]">
            Quantity used
            <input className={`mt-1 ${inputClass}`} type="number" min="1"
              max={useTarget.quantity} step="1" value={useQuantity}
              onChange={(event) => {
                if (/^\d*$/.test(event.target.value)) setUseQuantity(event.target.value);
              }} />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={outlineBtn} disabled={usePartsMutation.isPending}
              onClick={() => setUseTarget(null)}>Cancel</button>
            <button type="button" className={primaryBtn}
              disabled={usePartsMutation.isPending || !Number.isSafeInteger(Number(useQuantity)) || Number(useQuantity) < 1 || Number(useQuantity) > useTarget.quantity}
              onClick={() => void confirmUse()}>
              {usePartsMutation.isPending ? "Saving..." : "Confirm use"}
            </button>
          </div>
        </Modal>
      )}
    </TechnicianPageShell>
  );
}
