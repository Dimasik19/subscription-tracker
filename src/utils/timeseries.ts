import type { Currency, FxRates, Subscription, SubscriptionCategory } from "../types";
import { fromRub, toRub } from "./finance";

export type TimeseriesPoint = {
  month: string;
  total: number;
} & Partial<Record<SubscriptionCategory, number>>;

function rangeToMonths(range: "3m" | "6m" | "12m"): number {
  if (range === "3m") {
    return 3;
  }
  if (range === "6m") {
    return 6;
  }
  return 12;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createMonthSlots(range: "3m" | "6m" | "12m"): Date[] {
  const count = rangeToMonths(range);
  const end = new Date();
  const slots: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    slots.push(new Date(end.getFullYear(), end.getMonth() - i, 1));
  }
  return slots;
}

function isBilledInMonth(subscription: Subscription, monthDate: Date): boolean {
  const startDate = subscription.startedAt ? new Date(subscription.startedAt) : monthDate;
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const targetMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

  if (targetMonth < startMonth) {
    return false;
  }

  const monthDiff =
    (targetMonth.getFullYear() - startMonth.getFullYear()) * 12 +
    (targetMonth.getMonth() - startMonth.getMonth());

  if (subscription.period === "monthly") {
    return true;
  }
  if (subscription.period === "quarterly") {
    return monthDiff % 3 === 0;
  }
  return monthDiff % 12 === 0;
}

export function buildCategoryTimeseries(
  subscriptions: Subscription[],
  periodRange: "3m" | "6m" | "12m",
  fxRates: FxRates,
  displayCurrency: Currency
): TimeseriesPoint[] {
  const months = createMonthSlots(periodRange);
  return months.map((slot) => {
    const categoryTotals = new Map<SubscriptionCategory, number>();
    let totalRub = 0;

    for (const sub of subscriptions) {
      if (!isBilledInMonth(sub, slot)) {
        continue;
      }
      const chargeRub = toRub(sub.amount, sub.currency, fxRates);
      totalRub += chargeRub;
      categoryTotals.set(sub.category, (categoryTotals.get(sub.category) ?? 0) + chargeRub);
    }

    const point: TimeseriesPoint = {
      month: monthKey(slot),
      total: fromRub(totalRub, displayCurrency, fxRates),
    };
    for (const [category, valueRub] of categoryTotals.entries()) {
      point[category] = fromRub(valueRub, displayCurrency, fxRates);
    }
    return point;
  });
}
