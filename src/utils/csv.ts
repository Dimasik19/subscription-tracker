import { CATEGORIES, getServiceLabel } from "../catalog";
import type { DashboardState } from "../types";
import { buildCategoryTotals, normalizeToMonthlyRub, round2, fromRub } from "./finance";

const CSV_BOM = "\uFEFF";

function escapeCsvCell(value: string | number): string {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return `${CSV_BOM}${[headerLine, ...rowLines].join("\n")}`;
}

export function exportSubscriptionsCsv(state: DashboardState): string {
  const rows = state.subscriptions.map((subscription) => {
    const monthlyRub = normalizeToMonthlyRub(subscription, state.fxRates);
    const monthlyEquivalent = round2(fromRub(monthlyRub, state.displayCurrency, state.fxRates));

    return [
      subscription.id,
      getServiceLabel(subscription.serviceKey, subscription.customName),
      subscription.category,
      round2(subscription.amount),
      subscription.currency,
      subscription.period,
      monthlyEquivalent,
      subscription.note ?? "",
      state.updatedAt,
    ];
  });

  return toCsv(
    [
      "id",
      "service",
      "category",
      "amount",
      "currency",
      "period",
      "monthlyEquivalent",
      "note",
      "updatedAt",
    ],
    rows
  );
}

export function exportSummaryCsv(state: DashboardState): string {
  const totalMonthlyRub = state.subscriptions.reduce(
    (acc, subscription) => acc + normalizeToMonthlyRub(subscription, state.fxRates),
    0
  );
  const totalMonthly = round2(fromRub(totalMonthlyRub, state.displayCurrency, state.fxRates));
  const incomeSharePct =
    state.monthlyIncome > 0 ? round2((totalMonthly / state.monthlyIncome) * 100) : 0;

  const categoryTotals = buildCategoryTotals(
    state.subscriptions,
    state.fxRates,
    state.displayCurrency
  );
  const categoryMap = new Map(categoryTotals.map((entry) => [entry.category, entry.value]));

  const rows: Array<Array<string | number>> = [
    ["totalMonthly", totalMonthly],
    ["monthlyIncome", round2(state.monthlyIncome)],
    ["incomeSharePct", incomeSharePct],
  ];

  for (const category of CATEGORIES) {
    rows.push([`category:${category}`, round2(categoryMap.get(category) ?? 0)]);
  }

  return toCsv(["metric", "value"], rows);
}

export function downloadCsv(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
