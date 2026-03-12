import { getServiceLabel } from "../catalog";
import type {
  BillingPeriod,
  Currency,
  FxRates,
  ServiceKey,
  Subscription,
  SubscriptionCategory,
} from "../types";

export type NormalizedSubscription = Subscription & {
  serviceLabel: string;
  perMonthRub: number;
  perMonthDisplay: number;
};

export function periodDivisor(period: BillingPeriod): number {
  if (period === "monthly") {
    return 1;
  }
  if (period === "quarterly") {
    return 3;
  }
  return 12;
}

export function toRub(amount: number, currency: Currency, fxRates: FxRates): number {
  const rate = fxRates[currency] ?? 1;
  return amount * rate;
}

export function fromRub(amountRub: number, currency: Currency, fxRates: FxRates): number {
  const rate = fxRates[currency] ?? 1;
  return rate > 0 ? amountRub / rate : 0;
}

export function normalizeToMonthlyRub(subscription: Subscription, fxRates: FxRates): number {
  const rubAmount = toRub(subscription.amount, subscription.currency, fxRates);
  return rubAmount / periodDivisor(subscription.period);
}

export function normalizeSubscription(
  subscription: Subscription,
  fxRates: FxRates,
  displayCurrency: Currency
): NormalizedSubscription {
  const perMonthRub = normalizeToMonthlyRub(subscription, fxRates);
  return {
    ...subscription,
    serviceLabel: getServiceLabel(subscription.serviceKey, subscription.customName),
    perMonthRub,
    perMonthDisplay: fromRub(perMonthRub, displayCurrency, fxRates),
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "RUB" ? 0 : 2,
  }).format(value);
}

export function buildCategoryTotals(
  subscriptions: Subscription[],
  fxRates: FxRates,
  displayCurrency: Currency
): Array<{ category: SubscriptionCategory; value: number }> {
  const sums = new Map<SubscriptionCategory, number>();
  for (const sub of subscriptions) {
    const monthlyRub = normalizeToMonthlyRub(sub, fxRates);
    sums.set(sub.category, (sums.get(sub.category) ?? 0) + monthlyRub);
  }

  return Array.from(sums.entries())
    .map(([category, amountRub]) => ({
      category,
      value: round2(fromRub(amountRub, displayCurrency, fxRates)),
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildServiceTotals(
  subscriptions: Subscription[],
  fxRates: FxRates,
  displayCurrency: Currency
): Array<{ serviceKey: ServiceKey; label: string; value: number; customName?: string }> {
  const sums = new Map<string, { serviceKey: ServiceKey; label: string; valueRub: number; customName?: string }>();
  for (const sub of subscriptions) {
    const key = `${sub.serviceKey}:${sub.customName ?? ""}`;
    const monthlyRub = normalizeToMonthlyRub(sub, fxRates);
    const label = getServiceLabel(sub.serviceKey, sub.customName);
    const prev = sums.get(key);
    if (prev) {
      prev.valueRub += monthlyRub;
    } else {
      sums.set(key, {
        serviceKey: sub.serviceKey,
        label,
        valueRub: monthlyRub,
        customName: sub.customName,
      });
    }
  }

  return Array.from(sums.values())
    .map((item) => ({
      serviceKey: item.serviceKey,
      label: item.label,
      value: round2(fromRub(item.valueRub, displayCurrency, fxRates)),
      customName: item.customName,
    }))
    .sort((a, b) => b.value - a.value);
}
