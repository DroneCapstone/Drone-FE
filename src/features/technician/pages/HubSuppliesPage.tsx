import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { getHubSupplyDetailApi, type HubSupply } from "../api/hubSuppliesApi";
import {
  inventoryDetailKey,
  useHubSuppliesQuery,
} from "../hooks/useHubSuppliesQueries";

const PAGE_SIZE = 9;
const inputClass = "tech-control h-10 w-full rounded-md px-3 text-[13px]";
const subtle = "text-[var(--tech-muted)]";
// Neutral dividers remain subtle in both the light and dark Technician themes.
const rowDivider = "1px solid rgba(128, 128, 128, 0.18)";
const headerCellStyle = {
  color: "var(--tech-text)",
  fontWeight: 700,
  opacity: 1,
  borderBottom: rowDivider,
};
const outlineBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40";

function partName(row: HubSupply): string {
  return row.partCategory?.name ?? `Part category #${row.partCategoryId}`;
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
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("All models");
  const [page, setPage] = useState(1);

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

  return (
    <TechnicianPageShell title="Spare Parts" description="">
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
              <thead className="bg-[var(--tech-surface)] text-[12px] uppercase tracking-wide">
                <tr>
                  <th style={headerCellStyle} className="w-[36%] px-4 py-4 text-left">Spare part</th>
                  <th style={headerCellStyle} className="w-[17%] px-4 py-4 text-left">Category</th>
                  <th style={headerCellStyle} className="w-[35%] px-4 py-4 text-left">Compatible drone models</th>
                  <th style={headerCellStyle} className="w-[12%] px-4 py-4 text-center">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--tech-surface-2)]">
                    <td style={{ borderBottom: rowDivider }} className="px-4 py-4 text-[13px] font-semibold text-[var(--tech-text)]">
                      {partName(item)}
                    </td>
                    <td style={{ borderBottom: rowDivider }} className="px-4 py-4 text-[12px] text-[var(--tech-text-secondary)]">
                      {item.partCategory?.categoryType || "—"}
                    </td>
                    <td style={{ borderBottom: rowDivider }} className="px-4 py-4 text-[12px] text-[var(--tech-text-secondary)]">
                      {item.partCategory?.compatibleDroneModels.length
                        ? item.partCategory.compatibleDroneModels.join(", ")
                        : "—"}
                    </td>
                    <td style={{ borderBottom: rowDivider }} className="px-4 py-4 text-center text-[14px] font-semibold text-[var(--tech-text)]">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-14 text-center text-[13px] ${subtle}`}>
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

    </TechnicianPageShell>
  );
}
