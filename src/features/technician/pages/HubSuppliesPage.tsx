import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle, ChevronLeft, ChevronRight,
  Package, Plus, RefreshCw, Search, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { formatApiDateTime } from "../api/httpClient";
import { getHubSupplyDetailApi, type HubSupply, type PartsRequest, type PartRequestStatus } from "../api/hubSuppliesApi";
import {
  useFulfillPartsRequestMutation,
  useHubSuppliesQuery,
  useHubSupplyDetailQuery,
  useMyPartsRequestsQuery,
  usePartsRequestDetailQuery,
  useRequestPartsMutation,
  useUseHubPartsMutation,
  inventoryDetailKey,
} from "../hooks/useHubSuppliesQueries";

const PAGE_SIZE = 9;
const inputClass = "tech-control h-10 w-full rounded-md px-3 text-[13px]";
const subtle = "text-[var(--tech-muted)]";
const outlineBtn = "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40";
const primaryBtn = "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 text-[12px] font-semibold text-black transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50";
type Tab = "inventory" | "requests";
type StockFilter = "All" | "Low stock" | "Out of stock";
type RequestFilter = "All" | PartRequestStatus;
type RequestEditor = { partCategoryId: string; quantity: string; description: string; droneId: string };
const blankRequest: RequestEditor = { partCategoryId: "", quantity: "1", description: "", droneId: "" };

function readableDate(value: string | null | undefined) {
  return value ? formatApiDateTime(value, "—") : "—";
}
function nameFallback(categoryId: number) {
  return `Part category #${categoryId}`;
}
function Pagination({ count, page, onPageChange }: { count: number; page: number; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(page, pages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tech-border)] px-4 py-3 text-[11px] text-[var(--tech-muted)]">
      <span>{count ? `Showing ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, count)} of ${count}` : "0 records"}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={outlineBtn} title="Previous page" disabled={current === 1} onClick={() => onPageChange(current - 1)}><ChevronLeft size={14} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onPageChange(n)}
            className={`h-8 min-w-8 rounded-md px-2 ${current === n ? "bg-orange-500 font-semibold text-black" : "border border-[var(--tech-border)] text-[var(--tech-text-secondary)]"}`}>{n}</button>
        ))}
        <button type="button" className={outlineBtn} title="Next page" disabled={current === pages} onClick={() => onPageChange(current + 1)}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}
function StockName({ supply }: { supply: HubSupply }) {
  // List endpoint only contains part_category_id. Details include the actual name.
  // Each visible row is a cached independent query; stock table doesn't block on details.
  const detail = useHubSupplyDetailQuery(supply.id);
  const category = detail.data?.partCategory ?? supply.partCategory;
  return (
    <>
      <p className="font-semibold text-[var(--tech-text)]">{category?.name ?? nameFallback(supply.partCategoryId)}</p>
      <p className={`mt-1 text-[10px] ${subtle}`}>Inventory #{supply.id} · Category #{supply.partCategoryId}</p>
    </>
  );
}
function CategoryName({ categoryId, inventory }: { categoryId: number; inventory: HubSupply[] }) {
  const record = inventory.find(item => item.partCategoryId === categoryId);
  const detail = useHubSupplyDetailQuery(record?.id);
  return <span>{detail.data?.partCategory?.name ?? record?.partCategory?.name ?? nameFallback(categoryId)}</span>;
}
function InventoryRow({
  row, number, onUse, onRequest, onDetails,
}: {
  row: HubSupply; number: number; onUse: (row: HubSupply) => void;
  onRequest: (row: HubSupply) => void; onDetails: (row: HubSupply) => void;
}) {
  return (
    <tr className="hover:bg-[var(--tech-surface-2)]">
      <td className={`px-4 py-4 text-center ${subtle}`}>{number}</td>
      <td className="px-4 py-4"><StockName supply={row} /></td>
      <td className={`px-4 py-4 text-center ${subtle}`}>{row.hubId || "—"}</td>
      <td className="px-4 py-4 text-center font-semibold text-[var(--tech-text)]">{row.quantity}</td>
      <td className={`px-4 py-4 text-center ${subtle}`}>{row.minStockThreshold}</td>
      <td className="px-4 py-4 text-center">
        {row.quantity === 0 ? <span className="text-red-500">Out of stock</span> : row.isLowStock
          ? <span className="inline-flex items-center gap-1 text-orange-500"><AlertTriangle size={13} /> Low stock</span>
          : <span className="text-emerald-500">In stock</span>}
      </td>
      <td className={`px-4 py-4 text-center ${subtle}`}>{readableDate(row.updatedAt)}</td>
      <td className="px-4 py-4"><div className="flex justify-end gap-2">
        <button type="button" className={outlineBtn} onClick={() => onDetails(row)}>Details</button>
        <button type="button" className={outlineBtn} disabled={row.quantity === 0} onClick={() => onUse(row)}>Use</button>
        <button type="button" className={primaryBtn} onClick={() => onRequest(row)}>Request</button>
      </div></td>
    </tr>
  );
}
function RequestStatus({ status }: { status: PartRequestStatus }) {
  const style = status === "Approved" ? "text-emerald-500 border-emerald-500/30"
    : status === "Rejected" ? "text-red-500 border-red-500/30"
      : status === "Fulfilled" ? "text-[var(--tech-muted)] border-[var(--tech-border)]"
        : "text-orange-500 border-orange-500/30";
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${style}`}>{status}</span>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-[17px] font-semibold text-[var(--tech-text)]">{title}</h2>
          <button type="button" className={outlineBtn} aria-label="Close dialog" onClick={onClose}><X size={17}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function StockDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useHubSupplyDetailQuery(id);
  const record = q.data;
  const category = record?.partCategory;
  return <Modal title="Inventory details" onClose={onClose}>
    {q.isPending ? <p className={subtle}>Loading details...</p> : q.isError ? <p className="text-red-500">{q.error instanceof Error ? q.error.message : "Failed to load details."}</p> : record && (
      <div className="space-y-3 text-[13px] text-[var(--tech-text)]">
        <p><strong>Part:</strong> {category?.name ?? nameFallback(record.partCategoryId)}</p>
        <p><strong>Inventory ID:</strong> #{record.id}</p><p><strong>Part category ID:</strong> #{record.partCategoryId}</p>
        <p><strong>Category type:</strong> {category?.categoryType || "—"}</p>
        <p><strong>Quantity:</strong> {record.quantity} · <strong>Min stock:</strong> {record.minStockThreshold}</p>
        <p><strong>Compatible drones:</strong> {category?.compatibleDroneModels.length ? category.compatibleDroneModels.join(", ") : "—"}</p>
        <p><strong>Unit cost:</strong> {category?.unitCost != null ? category.unitCost.toLocaleString("vi-VN") + " VND" : "—"}</p>
        <p><strong>Description:</strong> {category?.description || "—"}</p>
        <p><strong>Updated:</strong> {readableDate(record.updatedAt)}</p>
      </div>
    )}
  </Modal>;
}
function RequestDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const q = usePartsRequestDetailQuery(id);
  const item = q.data;
  return <Modal title={`Request #${id}`} onClose={onClose}>
    {q.isPending ? <p className={subtle}>Loading request...</p> : q.isError ? <p className="text-red-500">{q.error instanceof Error ? q.error.message : "Failed to load details."}</p> : item && (
      <div className="space-y-3 text-[13px] text-[var(--tech-text)]">
        <p><strong>Status:</strong> <RequestStatus status={item.status}/></p>
        <p><strong>Category ID:</strong> #{item.partCategoryId}</p>
        <p><strong>Quantity needed:</strong> {item.quantityNeeded}</p>
        <p><strong>Reason:</strong> {item.description || "—"}</p>
        <p><strong>Drone ID:</strong> {item.droneId || "—"}</p>
        <p><strong>Admin note:</strong> {item.adminNote || "—"}</p>
        <p><strong>Reviewed by:</strong> {item.reviewedBy || "—"} · {readableDate(item.reviewedAt)}</p>
        <p><strong>Actual cost:</strong> {item.actualCost != null ? item.actualCost.toLocaleString("vi-VN") + " VND" : "—"}</p>
        <p><strong>Requested:</strong> {readableDate(item.createdAt)}</p>
        <p><strong>Received:</strong> {readableDate(item.fulfilledAt)}</p>
      </div>
    )}
  </Modal>;
}

export function HubSuppliesPage() {
  const [tab, setTab] = useState<Tab>("inventory");
  const inventoryQuery = useHubSuppliesQuery();
  const requestsQuery = useMyPartsRequestsQuery();
  const requestMutation = useRequestPartsMutation();
  const useMutation = useUseHubPartsMutation();
  const fulfillMutation = useFulfillPartsRequestMutation();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("All");
  const [page, setPage] = useState(1);
  const [requestEditor, setRequestEditor] = useState<RequestEditor | null>(null);
  const [useTarget, setUseTarget] = useState<HubSupply | null>(null);
  const [useQuantity, setUseQuantity] = useState("1");
  const [receiptTarget, setReceiptTarget] = useState<PartsRequest | null>(null);
  const [stockDetailsId, setStockDetailsId] = useState<number | null>(null);
  const [requestDetailsId, setRequestDetailsId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const supplies = inventoryQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  // The list API doesn't return a part name. Fetch detail in parallel without
  // delaying initial list rendering, so Search can also match names.
  const detailQueries = useQueries({
    queries: supplies.map(row => ({
      queryKey: inventoryDetailKey(row.id),
      queryFn: () => getHubSupplyDetailApi(row.id),
      staleTime: 5 * 60_000,
      gcTime: 60 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const categoryNames = useMemo(() => new Map(supplies.map((row, index) => [
    row.id, detailQueries[index]?.data?.partCategory?.name ?? row.partCategory?.name ?? "",
  ])), [supplies, detailQueries]);
  const lowStockCount = supplies.filter(row => row.isLowStock).length;
  const totalQuantity = supplies.reduce((sum, row) => sum + row.quantity, 0);
  const filteredInventory = useMemo(() => supplies.filter(row => {
    const query = search.trim().toLowerCase();
    const matches = !query || String(row.id).includes(query) || String(row.partCategoryId).includes(query) ||
      categoryNames.get(row.id)?.toLowerCase().includes(query);
    const stock = stockFilter === "All" || (stockFilter === "Low stock" && row.isLowStock) ||
      (stockFilter === "Out of stock" && row.quantity === 0);
    return matches && stock;
  }), [supplies, search, stockFilter, categoryNames]);
  const filteredRequests = useMemo(() => requests.filter(item => {
    const query = search.trim().toLowerCase();
    const matches = !query || String(item.id).includes(query) || String(item.partCategoryId).includes(query) ||
      item.description.toLowerCase().includes(query) || (item.droneId ?? "").toLowerCase().includes(query);
    return matches && (requestFilter === "All" || item.status === requestFilter);
  }), [requests, search, requestFilter]);
  const current = tab === "inventory" ? filteredInventory : filteredRequests;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(current.length / PAGE_SIZE)));
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleInventory = filteredInventory.slice(start, start + PAGE_SIZE);
  const visibleRequests = filteredRequests.slice(start, start + PAGE_SIZE);
  const clearMessage = () => { setErrorMessage(""); setSuccessMessage(""); };
  const switchTab = (next: Tab) => { setTab(next); setSearch(""); setPage(1); clearMessage(); };
  const openRequest = (row?: HubSupply) => {
    clearMessage();
    setRequestEditor({ ...blankRequest, partCategoryId: row ? String(row.partCategoryId) : "",
      description: row?.isLowStock ? "Inventory below minimum stock threshold" : "" });
  };
  const saveRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestEditor || requestMutation.isPending) return;
    const category = Number(requestEditor.partCategoryId);
    const quantity = Number(requestEditor.quantity);
    if (!Number.isSafeInteger(category) || category < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || !requestEditor.description.trim()) {
      setErrorMessage("Choose a valid category, positive quantity and enter the reason."); return;
    }
    clearMessage();
    try {
      await requestMutation.mutateAsync({ part_category_id: category, quantity_needed: quantity,
        description: requestEditor.description.trim(), ...(requestEditor.droneId.trim() ? { drone_id: requestEditor.droneId.trim() } : {}) });
      setRequestEditor(null); setSuccessMessage("Request sent to Admin successfully.");
      setTab("requests"); setSearch(""); setPage(1);
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Unable to request parts."); }
  };
  const useParts = async () => {
    if (!useTarget || useMutation.isPending) return;
    const qty = Number(useQuantity);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > useTarget.quantity) {
      setErrorMessage("Quantity used must be between 1 and available stock."); return;
    }
    clearMessage();
    try {
      await useMutation.mutateAsync({ inventoryId: useTarget.id, quantityUsed: qty });
      setSuccessMessage(`${qty} part(s) deducted from inventory.`);
      setUseTarget(null);
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Unable to use parts."); }
  };
  const confirmReceipt = async () => {
    if (!receiptTarget || receiptTarget.status !== "Approved" || fulfillMutation.isPending) return;
    clearMessage();
    try {
      await fulfillMutation.mutateAsync(receiptTarget.id);
      setReceiptTarget(null);
      setSuccessMessage("Parts received. Backend has updated hub inventory.");
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Unable to confirm receipt."); }
  };
  const activeQuery = tab === "inventory" ? inventoryQuery : requestsQuery;
  const error = activeQuery.error instanceof Error ? activeQuery.error.message : "";

  return (
    <TechnicianPageShell title="Hub supplies" description="">
      {errorMessage && <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">{errorMessage}<button type="button" className="ml-3 underline" onClick={() => setErrorMessage("")}>Dismiss</button></div>}
      {successMessage && <p role="status" className="mb-4 text-[13px] text-emerald-500">{successMessage}</p>}
      {error && <div role="alert" className="mb-4 rounded-md border border-red-500/30 p-3 text-[13px] text-red-500">{error}<button className="ml-3 underline" type="button" onClick={() => void activeQuery.refetch()}>Retry</button></div>}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {[
          { label: "Supply categories", value: inventoryQuery.isPending ? "—" : supplies.length, note: "" },
          { label: "Total quantity", value: inventoryQuery.isPending ? "—" : totalQuantity, note: "" },
          { label: "Low stock", value: inventoryQuery.isPending ? "—" : lowStockCount, note: "" },
        ].map(card => <Card key={card.label} className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none"><CardContent className="p-5">
          <p className="text-[12px] text-[var(--tech-text-secondary)]">{card.label}</p>
          <p className="mt-3 text-[28px] font-semibold text-[var(--tech-text)]">{card.value}</p>
          <p className={`mt-1 text-[11px] ${subtle}`}>{card.note}</p>
        </CardContent></Card>)}
      </div>
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="flex items-center gap-4 border-b border-[var(--tech-border)] px-4 pt-2">
          {([{ id: "inventory", label: "Inventory" }, { id: "requests", label: "My requests" }] as const).map(item => (
            <button key={item.id} type="button" onClick={() => switchTab(item.id)}
              className={`border-b-2 px-2 py-3 text-[13px] font-medium ${tab === item.id ? "border-orange-500 text-orange-500" : "border-transparent text-[var(--tech-muted)]"}`}>{item.label}{item.id === "requests" ? ` (${requests.length})` : ""}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] p-4">
          <div className="relative min-w-[230px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[var(--tech-muted)]"/>
            <input type="search" className={`${inputClass} pl-9`} value={search} placeholder={tab === "inventory" ? "Search inventory or category ID..." : "Search request ID, category or reason..."} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
          </div>
          {tab === "inventory" ? <select className={`${inputClass} !w-[155px]`} value={stockFilter} onChange={e => { setStockFilter(e.target.value as StockFilter); setPage(1); }}><option>All</option><option>Low stock</option><option>Out of stock</option></select>
            : <select className={`${inputClass} !w-[155px]`} value={requestFilter} onChange={e => { setRequestFilter(e.target.value as RequestFilter); setPage(1); }}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option><option>Fulfilled</option></select>}
          <button className={`${outlineBtn} h-10`} type="button" disabled={activeQuery.isFetching} onClick={() => void activeQuery.refetch()}><RefreshCw size={15} className={activeQuery.isFetching ? "animate-spin" : ""}/> Refresh</button>
          <button type="button" className={`${primaryBtn} h-10`} onClick={() => openRequest()}><Plus size={16}/> Request parts</button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {tab === "inventory" ? <table className="w-full min-w-[1050px] text-[12px]">
              <thead className="border-b border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[10px] uppercase tracking-wide text-[var(--tech-subtle)]"><tr>
                <th className="px-4 py-4 text-center">No.</th><th className="px-4 py-4 text-left">Part / ID</th><th className="px-4 py-4 text-center">Hub ID</th>
                <th className="px-4 py-4 text-center">Quantity</th><th className="px-4 py-4 text-center">Min stock</th><th className="px-4 py-4 text-center">Stock status</th>
                <th className="px-4 py-4 text-center">Updated</th><th className="px-4 py-4 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-[var(--tech-border)]">
                {visibleInventory.map((row, index) => <InventoryRow key={row.id} row={row} number={start + index + 1} onUse={item => { clearMessage(); setUseTarget(item); setUseQuantity("1"); }} onRequest={openRequest} onDetails={item => setStockDetailsId(item.id)}/>)}
                {!visibleInventory.length && <tr><td colSpan={8} className={`px-4 py-14 text-center text-[13px] ${subtle}`}>
                  {inventoryQuery.isPending ? "Loading hub inventory..." : inventoryQuery.isError && !inventoryQuery.data ? "Unable to load hub inventory." : "No inventory matches the current filters."}
                </td></tr>}
              </tbody>
            </table> : <table className="w-full min-w-[930px] text-[12px]">
              <thead className="border-b border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[10px] uppercase tracking-wide text-[var(--tech-subtle)]"><tr>
                <th className="px-4 py-4 text-center">No.</th><th className="px-4 py-4 text-left">Request / Part</th><th className="px-4 py-4 text-center">Quantity</th>
                <th className="px-4 py-4 text-center">Requested at</th><th className="px-4 py-4 text-center">Status</th><th className="px-4 py-4 text-right">Actions</th>
              </tr></thead><tbody className="divide-y divide-[var(--tech-border)]">
                {visibleRequests.map((item, index) => <tr key={item.id} className="hover:bg-[var(--tech-surface-2)]">
                  <td className={`px-4 py-4 text-center ${subtle}`}>{start + index + 1}</td>
                  <td className="px-4 py-4"><p className="font-semibold text-[var(--tech-text)]"><CategoryName categoryId={item.partCategoryId} inventory={supplies}/></p>
                    <p className={`mt-1 text-[10px] ${subtle}`}>Request #{item.id} · Category #{item.partCategoryId}</p>
                    <p className={`mt-1 max-w-xs truncate text-[11px] ${subtle}`} title={item.description}>{item.description}</p></td>
                  <td className="px-4 py-4 text-center text-[var(--tech-text)]">{item.quantityNeeded}</td>
                  <td className={`px-4 py-4 text-center ${subtle}`}>{readableDate(item.createdAt)}</td>
                  <td className="px-4 py-4 text-center"><RequestStatus status={item.status}/></td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2">
                    <button type="button" className={outlineBtn} onClick={() => setRequestDetailsId(item.id)}>Details</button>
                    {item.status === "Approved" && <button type="button" className={primaryBtn} onClick={() => { clearMessage(); setReceiptTarget(item); }}>Confirm receipt</button>}
                  </div></td>
                </tr>)}
                {!visibleRequests.length && <tr><td colSpan={6} className={`px-4 py-14 text-center text-[13px] ${subtle}`}>
                  {requestsQuery.isPending ? "Loading supply requests..." : requestsQuery.isError && !requestsQuery.data ? "Unable to load requests." : "No requests match the current filters."}
                </td></tr>}
              </tbody></table>}
          </div>
          <Pagination count={current.length} page={currentPage} onPageChange={setPage}/>
        </CardContent>
      </Card>
      

      {requestEditor && <Modal title="Request parts" onClose={() => { if (!requestMutation.isPending) setRequestEditor(null); }}>
        <form className="space-y-4" onSubmit={e => void saveRequest(e)}>
          <label className="block text-[12px] text-[var(--tech-text-secondary)]">Part category ID
            <input type="number" min="1" step="1" required autoFocus className={`mt-1 ${inputClass}`} list="inventory-part-categories"
              value={requestEditor.partCategoryId} onChange={e => setRequestEditor(old => old && { ...old, partCategoryId: e.target.value })}/>
            <datalist id="inventory-part-categories">{supplies.map(item => <option key={item.id} value={item.partCategoryId}>{categoryNames.get(item.id) || nameFallback(item.partCategoryId)}</option>)}</datalist>
            <span className={`mt-1 block text-[11px] ${subtle}`}>Use the category ID shown in inventory. For new categories, ask Admin for its ID.</span>
          </label>
          <label className="block text-[12px] text-[var(--tech-text-secondary)]">Quantity needed
            <input type="number" min="1" step="1" required className={`mt-1 ${inputClass}`} value={requestEditor.quantity} onChange={e => setRequestEditor(old => old && { ...old, quantity: e.target.value })}/>
          </label>
          <label className="block text-[12px] text-[var(--tech-text-secondary)]">Reason for request
            <textarea required rows={3} className="tech-control mt-1 w-full rounded-md px-3 py-2 text-[13px]" value={requestEditor.description}
              onChange={e => setRequestEditor(old => old && { ...old, description: e.target.value })} placeholder="Why are these parts needed?"/>
          </label>
          <label className="block text-[12px] text-[var(--tech-text-secondary)]">Drone ID (optional)
            <input type="text" className={`mt-1 ${inputClass}`} placeholder="DRN-0002" value={requestEditor.droneId}
              onChange={e => setRequestEditor(old => old && { ...old, droneId: e.target.value })}/>
          </label>
          {errorMessage && <p className="text-[12px] text-red-500">{errorMessage}</p>}
          <p className={`text-[11px] ${subtle}`}>Submitting a request does not change inventory. Admin approval and physical receipt are required.</p>
          <div className="flex justify-end gap-2"><button type="button" className={outlineBtn} onClick={() => setRequestEditor(null)}>Cancel</button><button type="submit" disabled={requestMutation.isPending} className={primaryBtn}>{requestMutation.isPending ? "Sending..." : "Send request"}</button></div>
        </form>
      </Modal>}

      {useTarget && <Modal title="Use parts" onClose={() => { if (!useMutation.isPending) setUseTarget(null); }}>
        <p className={`mb-4 text-[13px] ${subtle}`}>Inventory #{useTarget.id} · Available: {useTarget.quantity}. This action deducts stock.</p>
        <label className="block text-[12px] text-[var(--tech-text-secondary)]">Quantity used
          <input className={`mt-1 ${inputClass}`} type="number" min="1" max={useTarget.quantity} step="1" value={useQuantity} onChange={e => setUseQuantity(e.target.value)}/>
        </label>
        {errorMessage && <p className="mt-2 text-[12px] text-red-500">{errorMessage}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" className={outlineBtn} onClick={() => setUseTarget(null)}>Cancel</button>
          <button type="button" className={primaryBtn} disabled={useMutation.isPending} onClick={() => void useParts()}>{useMutation.isPending ? "Saving..." : "Confirm use"}</button>
        </div>
      </Modal>}

      {receiptTarget && <Modal title="Confirm parts received" onClose={() => { if (!fulfillMutation.isPending) setReceiptTarget(null); }}>
        <div className="space-y-2 text-[13px] text-[var(--tech-text)]">
          <p><strong>Request:</strong> #{receiptTarget.id}</p>
          <p><strong>Part category ID:</strong> #{receiptTarget.partCategoryId}</p>
          <p><strong>Approved quantity:</strong> {receiptTarget.quantityNeeded}</p>
          <p><strong>Status:</strong> <RequestStatus status={receiptTarget.status}/></p>
          <p className={subtle}>Only confirm after the physical items have arrived at your hub. Backend automatically increases inventory. Do not confirm twice.</p>
        </div>
        {errorMessage && <p className="mt-3 text-[12px] text-red-500">{errorMessage}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" className={outlineBtn} onClick={() => setReceiptTarget(null)}>Cancel</button>
          <button type="button" className={primaryBtn} disabled={fulfillMutation.isPending} onClick={() => void confirmReceipt()}>
            {fulfillMutation.isPending ? "Confirming..." : "Confirm receipt"}</button>
        </div>
      </Modal>}
      {stockDetailsId !== null && <StockDetails id={stockDetailsId} onClose={() => setStockDetailsId(null)}/>}
      {requestDetailsId !== null && <RequestDetails id={requestDetailsId} onClose={() => setRequestDetailsId(null)}/>}
    </TechnicianPageShell>
  );
}
