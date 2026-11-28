/** Bundle fields returned by the Technician v10 endpoints. Optional for older rows. */
export type BundleInfo = {
  isBundled?: boolean;
  bundledOrderIds?: string[];
  totalOrdersCount?: number;
  isSecondaryBundledOrder?: boolean;
};

export function readBundleInfo(value: Record<string, unknown>): BundleInfo {
  const ids = Array.isArray(value.bundled_order_ids)
    ? [...new Set(value.bundled_order_ids.filter((id): id is string => typeof id === "string" && !!id.trim()).map(id => id.trim()))]
    : [];
  const count = value.total_orders_count;
  const secondary = value.is_secondary_bundled_order === true;
  return {
    isBundled: value.is_bundled === true || secondary,
    bundledOrderIds: ids,
    totalOrdersCount: typeof count === "number" && Number.isInteger(count) && count > 0 ? count : ids.length || undefined,
    isSecondaryBundledOrder: secondary,
  };
}
