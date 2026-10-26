import type { RouteOption } from '../types/operator';

export interface RouteLegBatteryUse {
  legNumber: number;
  batteryUsePct?: number;
}

const validPct = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

/**
 * Battery percentages on routes with battery swaps are PER BATTERY, not additive.
 * Read BE Analyze legs_detail[].battery_consumption_pct, then legs[] fallback.
 * Only derive a percentage from a single leg's BE start/end charge levels.
 * Do not use route.batteryConsumptionPct for any one relay leg.
 */
export function getRouteLegBatteryUse(route: RouteOption): RouteLegBatteryUse[] {
  const count = Math.max(route.legDetails?.length ?? 0, route.legs?.length ?? 0);

  return Array.from({ length: count }, (_, index) => {
    const detailed = route.legDetails?.[index];
    const mapped = route.legs?.[index];
    const fromApi = detailed?.battery_consumption_pct ?? mapped?.batteryConsumptionPct;
    const start = detailed?.battery_charge_pct ?? mapped?.batteryChargePct;
    const end = detailed?.remaining_battery_pct ?? mapped?.endingSocPct;
    const derived = validPct(start) && validPct(end) ? start - end : undefined;
    const candidate = validPct(fromApi) ? fromApi : derived;

    return {
      legNumber: index + 1,
      batteryUsePct: validPct(candidate) ? Number(candidate.toFixed(1)) : undefined,
    };
  });
}
