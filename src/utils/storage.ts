import { CATEGORIES, DEFAULT_FX_RATES, SERVICE_CATALOG } from "../catalog";
import type { DashboardState, Subscription } from "../types";

const STORAGE_KEY = "subscription_dashboard_v2";

const NOW = () => new Date().toISOString();

export function createDefaultState(): DashboardState {
  const subscriptions: Subscription[] = [
    {
      id: crypto.randomUUID(),
      serviceKey: "kinopoisk",
      category: "Видео",
      amount: 399,
      currency: "RUB",
      period: "monthly",
      startedAt: NOW(),
    },
    {
      id: crypto.randomUUID(),
      serviceKey: "chatgpt",
      category: "AI",
      amount: 20,
      currency: "USD",
      period: "monthly",
      startedAt: NOW(),
    },
    {
      id: crypto.randomUUID(),
      serviceKey: "yandex",
      category: "Экосистема",
      amount: 299,
      currency: "RUB",
      period: "monthly",
      startedAt: NOW(),
    },
  ];

  return {
    subscriptions,
    monthlyIncome: 180000,
    displayCurrency: "RUB",
    fxRates: DEFAULT_FX_RATES,
    filters: {
      category: "all",
      periodRange: "6m",
      sortBy: "amount",
      sortDir: "desc",
    },
    updatedAt: NOW(),
  };
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeCategory(
  serviceKey: string,
  category: string
): Subscription["category"] {
  if (serviceKey !== "custom" && serviceKey in SERVICE_CATALOG) {
    return SERVICE_CATALOG[serviceKey as keyof typeof SERVICE_CATALOG].category;
  }
  if (category === "Соцсети") {
    return "Экосистема";
  }
  if (CATEGORIES.includes(category as Subscription["category"])) {
    return category as Subscription["category"];
  }
  return "Другое";
}

function sanitizeState(raw: unknown): DashboardState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const maybe = raw as Partial<DashboardState>;
  if (!Array.isArray(maybe.subscriptions)) {
    return null;
  }

  const safeSubscriptions: Subscription[] = maybe.subscriptions
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Subscription)
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.serviceKey === "string" &&
        typeof item.category === "string" &&
        typeof item.amount === "number" &&
        Number.isFinite(item.amount) &&
        typeof item.currency === "string" &&
        typeof item.period === "string"
    )
    .map((item) => ({
      ...item,
      category: normalizeCategory(item.serviceKey, item.category),
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
      customName: item.customName?.trim() || undefined,
      note: item.note?.trim() || undefined,
      startedAt: isValidDateString(item.startedAt) ? item.startedAt : undefined,
    }));

  if (safeSubscriptions.length !== maybe.subscriptions.length) {
    return null;
  }

  const monthlyIncome =
    typeof maybe.monthlyIncome === "number" && Number.isFinite(maybe.monthlyIncome)
      ? maybe.monthlyIncome
      : 0;
  const displayCurrency =
    maybe.displayCurrency && typeof maybe.displayCurrency === "string"
      ? maybe.displayCurrency
      : "RUB";
  const fxRates = { ...DEFAULT_FX_RATES, ...(maybe.fxRates ?? {}) };
  const safeFilterCategory =
    maybe.filters?.category === "all" ||
    CATEGORIES.includes(maybe.filters?.category as Subscription["category"])
      ? (maybe.filters?.category ?? "all")
      : "all";
  const filters = {
    category: safeFilterCategory,
    periodRange: maybe.filters?.periodRange ?? "6m",
    sortBy: maybe.filters?.sortBy ?? "amount",
    sortDir: maybe.filters?.sortDir ?? "desc",
  };
  const updatedAt = isValidDateString(maybe.updatedAt) ? maybe.updatedAt : NOW();

  return {
    subscriptions: safeSubscriptions,
    monthlyIncome,
    displayCurrency,
    fxRates,
    filters,
    updatedAt,
  } as DashboardState;
}

export function loadDashboardState(): DashboardState {
  const fallback = createDefaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return sanitizeState(parsed) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveDashboardState(state: DashboardState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
