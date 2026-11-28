import type { BundleInfo } from "../utils/bundleInfo";

export function BundleBadge({ bundle }: { bundle: BundleInfo }) {
  if (!bundle.isBundled) return null;
  const count = bundle.totalOrdersCount;
  return <span title={bundle.bundledOrderIds?.join(", ") || undefined} className="mt-1 inline-flex max-w-full rounded border border-orange-500/30 px-1.5 py-0.5 text-[11px] font-medium text-orange-500">
    {count && count > 1 ? `Bundled (${count} orders)` : "Bundled"}
  </span>;
}

export function BundleOrderList({ bundle }: { bundle: BundleInfo }) {
  if (!bundle.isBundled) return null;
  return <div className="rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-3">
    <BundleBadge bundle={bundle} />
    <p className="mt-2 text-[12px] font-medium text-[var(--tech-text)]">Orders in this mission</p>
    {bundle.bundledOrderIds?.length ? <ul className="mt-1 space-y-1 text-[12px] text-[var(--tech-text-secondary)]">
      {bundle.bundledOrderIds.map(id => <li key={id} className="break-all">{id}</li>)}
    </ul> : <p className="mt-1 text-[12px] text-[var(--tech-muted)]">Order list unavailable.</p>}
  </div>;
}
