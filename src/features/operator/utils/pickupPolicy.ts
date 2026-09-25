export const PICKUP_POLICY = {
  standardHoldMinutes: 2 * 24 * 60,
  foodAndBeverageHoldMinutes: 3 * 60,
  finalReminderBeforeMinutes: 60,
} as const;

export function isFoodOrBeverage(packageType: string) {
  const normalized = packageType.toLowerCase();
  return [
    'food',
    'meal',
    'beverage',
    'drink',
    'perishable',
  ].some((keyword) => normalized.includes(keyword));
}

export function getPickupHoldMinutes(packageType: string) {
  return isFoodOrBeverage(packageType)
    ? PICKUP_POLICY.foodAndBeverageHoldMinutes
    : PICKUP_POLICY.standardHoldMinutes;
}
