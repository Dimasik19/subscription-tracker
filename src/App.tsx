import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Download, Plus, Trash2, X } from "lucide-react";
import "./App.css";
import {
  CATEGORIES,
  CURRENCIES,
  PERIOD_LABELS,
  SERVICE_CATALOG,
  SERVICE_KEYS,
  getServiceBrandColor,
} from "./catalog";
import type {
  BillingPeriod,
  Currency,
  DashboardState,
  ServiceKey,
  Subscription,
  SubscriptionCategory,
} from "./types";
import {
  buildCategoryTotals,
  formatMoney,
  normalizeToMonthlyRub,
  normalizeSubscription,
  round2,
} from "./utils/finance";
import { loadDashboardState, saveDashboardState } from "./utils/storage";

const CHART_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#eab308",
];

function formatTooltipValue(
  value: string | number | readonly (string | number)[] | undefined,
  currency: Currency
): string {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  if (!Number.isFinite(numeric)) {
    return formatMoney(0, currency);
  }
  return formatMoney(numeric, currency);
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const hasValidHex = /^[0-9a-fA-F]{6}$/.test(normalized);
  if (!hasValidHex) {
    return `rgba(100,116,139,${alpha})`;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function App() {
  const [dashboard, setDashboard] = useState<DashboardState>(() => loadDashboardState());
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<SubscriptionCategory>("Видео");
  const [customError, setCustomError] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<SubscriptionCategory>("Видео");

  useEffect(() => {
    saveDashboardState(dashboard);
  }, [dashboard]);

  function updateDashboard(updater: (current: DashboardState) => DashboardState) {
    setDashboard((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
  }

  const normalized = useMemo(
    () =>
      dashboard.subscriptions
        .filter((sub) => sub.isActive !== false)
        .map((sub) =>
        normalizeSubscription(sub, dashboard.fxRates, dashboard.displayCurrency)
      ),
    [dashboard.subscriptions, dashboard.fxRates, dashboard.displayCurrency]
  );

  const filteredSubscriptions = useMemo(() => {
    const byCategory = [...(
      dashboard.filters.category === "all"
        ? normalized
        : normalized.filter((item) => item.category === dashboard.filters.category)
    )];

    byCategory.sort((a, b) => {
      const categoryOrder = a.category.localeCompare(b.category, "ru");
      if (categoryOrder !== 0) {
        return categoryOrder;
      }
      return a.serviceLabel.localeCompare(b.serviceLabel, "ru");
    });

    return byCategory;
  }, [normalized, dashboard.filters.category]);

  const totalMonthly = useMemo(
    () => filteredSubscriptions.reduce((acc, item) => acc + item.perMonthDisplay, 0),
    [filteredSubscriptions]
  );
  const totalAnnual = totalMonthly * 12;

  const incomeSharePct =
    dashboard.monthlyIncome > 0 ? round2((totalMonthly / dashboard.monthlyIncome) * 100) : 0;

  const categoryTotals = useMemo(
    () => buildCategoryTotals(filteredSubscriptions, dashboard.fxRates, dashboard.displayCurrency),
    [filteredSubscriptions, dashboard.fxRates, dashboard.displayCurrency]
  );

  const topCategory = categoryTotals[0]?.category ?? "n/a";
  const providersByCategory = useMemo(() => {
    const grouped = new Map<SubscriptionCategory, ServiceKey[]>();
    for (const category of CATEGORIES) {
      const providers = SERVICE_KEYS.filter(
        (key) => SERVICE_CATALOG[key].category === category && key !== "custom"
      );
      grouped.set(category, providers);
    }
    return grouped;
  }, []);

  const subscriptionLookup = useMemo(() => {
    const map = new Map<string, Subscription>();
    for (const sub of dashboard.subscriptions) {
      const key = `${sub.category}:${sub.serviceKey}`;
      const prev = map.get(key);
      if (!prev || (prev.isActive === false && sub.isActive !== false)) {
        map.set(key, sub);
      }
    }
    return map;
  }, [dashboard.subscriptions]);

  const categoryTotalMap = useMemo(() => {
    const map = new Map<SubscriptionCategory, number>();
    for (const sub of normalized) {
      map.set(sub.category, (map.get(sub.category) ?? 0) + sub.perMonthDisplay);
    }
    return map;
  }, [normalized]);

  const categoryActiveCountMap = useMemo(() => {
    const map = new Map<SubscriptionCategory, number>();
    for (const category of CATEGORIES) {
      map.set(category, 0);
    }
    for (const sub of dashboard.subscriptions) {
      if (sub.isActive !== false) {
        map.set(sub.category, (map.get(sub.category) ?? 0) + 1);
      }
    }
    return map;
  }, [dashboard.subscriptions]);

  const resolvedActiveCategory = CATEGORIES.includes(activeCategoryTab)
    ? activeCategoryTab
    : CATEGORIES[0];

  const customByCategory = useMemo(() => {
    const map = new Map<SubscriptionCategory, Subscription[]>();
    for (const category of CATEGORIES) {
      map.set(category, []);
    }
    for (const sub of dashboard.subscriptions) {
      if (sub.serviceKey === "custom") {
        map.get(sub.category)?.push(sub);
      }
    }
    return map;
  }, [dashboard.subscriptions]);

  const providerGroups = useMemo(() => {
    const keys = providersByCategory.get(resolvedActiveCategory) ?? [];
    const active: Array<{ serviceKey: ServiceKey; subscription?: Subscription }> = [];
    const inactive: Array<{ serviceKey: ServiceKey; subscription?: Subscription }> = [];

    for (const serviceKey of keys) {
      const lookupKey = `${resolvedActiveCategory}:${serviceKey}`;
      const subscription = subscriptionLookup.get(lookupKey);
      const isActive = Boolean(subscription && subscription.isActive !== false);
      if (isActive) {
        active.push({ serviceKey, subscription });
      } else {
        inactive.push({ serviceKey, subscription });
      }
    }

    return { active, inactive };
  }, [providersByCategory, resolvedActiveCategory, subscriptionLookup]);

  function toggleProvider(category: SubscriptionCategory, serviceKey: ServiceKey, enabled: boolean) {
    updateDashboard((current) => {
      if (enabled) {
        const existing = current.subscriptions.find(
          (sub) => sub.category === category && sub.serviceKey === serviceKey
        );
        if (existing) {
          if (existing.isActive !== false) {
            return current;
          }
          return {
            ...current,
            subscriptions: current.subscriptions.map((sub) =>
              sub.id === existing.id ? { ...sub, isActive: true } : sub
            ),
          };
        }
        return {
          ...current,
          subscriptions: [
            ...current.subscriptions,
            {
              id: crypto.randomUUID(),
              serviceKey,
              category,
              isActive: true,
              amount: 0,
              currency: "RUB",
              period: "monthly",
              startedAt: new Date().toISOString(),
            },
          ],
        };
      }

      return {
        ...current,
        subscriptions: current.subscriptions.map((sub) =>
          sub.category === category && sub.serviceKey === serviceKey
            ? { ...sub, isActive: false }
            : sub
        ),
      };
    });
  }

  function updateProvider(
    category: SubscriptionCategory,
    serviceKey: ServiceKey,
    patch: { amount?: number; currency?: Currency; period?: BillingPeriod }
  ) {
    updateDashboard((current) => {
      let changed = false;
      const subscriptions = current.subscriptions.map((sub) => {
        if (!changed && sub.category === category && sub.serviceKey === serviceKey) {
          changed = true;
          return { ...sub, ...patch };
        }
        return sub;
      });
      return changed ? { ...current, subscriptions } : current;
    });
  }

  function updateCustomSubscription(
    id: string,
    patch: { amount?: number; currency?: Currency; period?: BillingPeriod }
  ) {
    updateDashboard((current) => ({
      ...current,
      subscriptions: current.subscriptions.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)),
    }));
  }

  function removeCustomSubscription(id: string) {
    updateDashboard((current) => ({
      ...current,
      subscriptions: current.subscriptions.filter((sub) => sub.id !== id),
    }));
  }

  function openCustomModal() {
    setCustomName("");
    setCustomError("");
    setCustomCategory(resolvedActiveCategory);
    setCustomModalOpen(true);
  }

  function createCustomSubscription() {
    const name = customName.trim();
    if (!name) {
      setCustomError("Введите название подписки");
      return;
    }

    updateDashboard((current) => ({
      ...current,
      subscriptions: [
        ...current.subscriptions,
        {
          id: crypto.randomUUID(),
          serviceKey: "custom",
          customName: name,
          category: customCategory,
          isActive: true,
          amount: 0,
          currency: "RUB",
          period: "monthly",
          startedAt: new Date().toISOString(),
        },
      ],
    }));
    setCustomModalOpen(false);
  }

  function exportActiveSubscriptionsPdf() {
    const activeSubscriptions = dashboard.subscriptions.filter((sub) => sub.isActive !== false);
    const rows = activeSubscriptions.map((sub) => {
      const monthlyRub = normalizeToMonthlyRub(sub, dashboard.fxRates);
      const monthlyDisplay = monthlyRub / (dashboard.fxRates[dashboard.displayCurrency] || 1);
      return {
        service: sub.serviceKey === "custom" ? sub.customName || "Custom" : SERVICE_CATALOG[sub.serviceKey].label,
        category: sub.category,
        amount: formatMoney(sub.amount, sub.currency),
        period: PERIOD_LABELS[sub.period],
        monthly: formatMoney(monthlyDisplay, dashboard.displayCurrency),
      };
    });

    const totalMonthlyRub = activeSubscriptions.reduce(
      (acc, sub) => acc + normalizeToMonthlyRub(sub, dashboard.fxRates),
      0
    );
    const displayRate = dashboard.fxRates[dashboard.displayCurrency] || 1;
    const totalMonthly = totalMonthlyRub / displayRate;
    const totalYearly = totalMonthly * 12;

    const tableRows = rows
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.service)}</td>
          <td>${escapeHtml(row.category)}</td>
          <td>${escapeHtml(row.amount)}</td>
          <td>${escapeHtml(row.period)}</td>
          <td>${escapeHtml(row.monthly)}</td>
        </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Active Subscriptions Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      .meta { color: #475569; margin-bottom: 16px; font-size: 12px; }
      .totals { margin: 12px 0 18px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; }
      .totals div { margin: 4px 0; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #dbe2ea; padding: 8px; text-align: left; }
      th { background: #eef4fb; }
      @media print { body { margin: 12mm; } }
    </style>
  </head>
  <body>
    <h1>Active Subscriptions Report</h1>
    <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString("ru-RU"))}</div>
    <div class="totals">
      <div><strong>Total per month:</strong> ${escapeHtml(formatMoney(totalMonthly, dashboard.displayCurrency))}</div>
      <div><strong>Total per year:</strong> ${escapeHtml(formatMoney(totalYearly, dashboard.displayCurrency))}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Period</th>
          <th>Monthly equivalent</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

    const printWindow = window.open("", "_blank", "width=980,height=760");
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <div className="dashboard-bg">
      <div className="dashboard-shell">
        <aside className="glass-panel sidebar">
          <div className="sidebar-title">SaaS Dashboard</div>
          <div className="sidebar-subtitle">Subscription Intelligence</div>
          <div className="side-group">
            <label className="field-label">Display Currency</label>
            <select
              className="glass-input"
              value={dashboard.displayCurrency}
              onChange={(event) =>
                updateDashboard((current) => ({
                  ...current,
                  displayCurrency: event.target.value as Currency,
                }))
              }
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div className="side-group">
            <label className="field-label">Monthly Income</label>
            <input
              className="glass-input"
              type="number"
              min={0}
              value={dashboard.monthlyIncome}
              onChange={(event) =>
                updateDashboard((current) => ({
                  ...current,
                  monthlyIncome: Number(event.target.value || 0),
                }))
              }
            />
          </div>

          <div className="side-group">
            <label className="field-label">Category Filter</label>
            <select
              className="glass-input"
              value={dashboard.filters.category}
              onChange={(event) =>
                updateDashboard((current) => ({
                  ...current,
                  filters: { ...current.filters, category: event.target.value as typeof current.filters.category },
                }))
              }
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="side-group">
            <div className="sidebar-kpi">
              <span className="sidebar-kpi-label">Total Monthly</span>
              <strong className="sidebar-kpi-value">
                {formatMoney(totalMonthly, dashboard.displayCurrency)}
              </strong>
            </div>
          </div>

          <div className="side-group">
            <h3 className="sidebar-chart-title">Share by Category</h3>
            <div className="chart-wrap sidebar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                  >
                    {categoryTotals.map((entry, idx) => (
                      <Cell
                        key={entry.category}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatTooltipValue(value, dashboard.displayCurrency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="service-legend sidebar-legend">
              {categoryTotals.map((item, idx) => (
                <div key={item.category} className="legend-item">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <span>{item.category}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="main-column">
          <header className="glass-panel topbar">
            <div>
              <h1>Advanced Subscription Tracker</h1>
              <p>Updated: {new Date(dashboard.updatedAt).toLocaleString("ru-RU")}</p>
            </div>
            <div className="topbar-actions">
              <button className="btn-secondary" onClick={exportActiveSubscriptionsPdf}>
                <Download size={16} />
                Export PDF
              </button>
            </div>
          </header>

          <section className="kpi-grid">
            <article className="glass-panel kpi-card">
              <span>Total Annual</span>
              <strong>{formatMoney(totalAnnual, dashboard.displayCurrency)}</strong>
            </article>
            <article className="glass-panel kpi-card">
              <span>Total Monthly</span>
              <strong>{formatMoney(totalMonthly, dashboard.displayCurrency)}</strong>
            </article>
            <article className="glass-panel kpi-card">
              <span>Income Share %</span>
              <strong>{round2(incomeSharePct)}%</strong>
            </article>
            <article className="glass-panel kpi-card">
              <span>Top Category</span>
              <strong>{topCategory}</strong>
            </article>
            <article className="glass-panel kpi-card">
              <span>Active Subscriptions</span>
              <strong>{filteredSubscriptions.length}</strong>
            </article>
          </section>

          <section className="glass-panel table-card">
            <div className="table-title">
              <h3>Subscriptions by Category</h3>
              <div className="table-title-actions">
                <span>{dashboard.subscriptions.filter((sub) => sub.isActive !== false).length} active</span>
                <button className="btn-primary" onClick={openCustomModal}>
                  <Plus size={16} />
                  Добавить свою подписку
                </button>
              </div>
            </div>
            <div className="category-tabs">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`category-tab ${resolvedActiveCategory === category ? "active" : ""}`}
                  onClick={() => setActiveCategoryTab(category)}
                >
                  <span className="category-tab-label">{category}</span>
                  <span className="category-tab-meta">
                    {(categoryActiveCountMap.get(category) ?? 0)} активных /{" "}
                    {formatMoney(categoryTotalMap.get(category) ?? 0, dashboard.displayCurrency)}
                  </span>
                </button>
              ))}
            </div>

            <div className="category-block">
              <div className="category-head">
                <h4>{resolvedActiveCategory}</h4>
                <div className="category-meta">
                  <span>
                    {categoryActiveCountMap.get(resolvedActiveCategory) ?? 0} активных
                  </span>
                  <span>
                    {formatMoney(categoryTotalMap.get(resolvedActiveCategory) ?? 0, dashboard.displayCurrency)} / month
                  </span>
                </div>
              </div>

              <div className="provider-grid">
                {providerGroups.active.map(({ serviceKey, subscription }) => {
                  const lookupKey = `${resolvedActiveCategory}:${serviceKey}`;
                  return (
                    <div key={lookupKey} className="provider-card is-active">
                      <div className="provider-head-row">
                        <label className="provider-toggle">
                          <input
                            className="toggle-input"
                            type="checkbox"
                            checked={true}
                            onChange={(event) =>
                              toggleProvider(resolvedActiveCategory, serviceKey, event.target.checked)
                            }
                          />
                          <span className="toggle-switch" aria-hidden="true">
                            <span className="toggle-thumb" />
                          </span>
                          <span
                            className="provider-chip"
                            style={{
                              borderColor: getServiceBrandColor(serviceKey),
                              color: getServiceBrandColor(serviceKey),
                              backgroundColor: hexToRgba(getServiceBrandColor(serviceKey), 0.08),
                            }}
                          >
                            {SERVICE_CATALOG[serviceKey].label}
                          </span>
                        </label>
                        <span className="provider-state active">Active</span>
                      </div>

                      <div className="provider-controls-inline">
                        <input
                          className="glass-input compact-input compact-amount"
                          type="number"
                          min={0}
                          value={subscription?.amount ?? ""}
                          placeholder="Amount"
                          onChange={(event) =>
                            updateProvider(resolvedActiveCategory, serviceKey, {
                              amount: Math.max(0, Number(event.target.value || 0)),
                            })
                          }
                        />
                        <select
                          className="glass-input compact-input compact-select"
                          value={subscription?.currency ?? "RUB"}
                          onChange={(event) =>
                            updateProvider(resolvedActiveCategory, serviceKey, {
                              currency: event.target.value as Currency,
                            })
                          }
                        >
                          {CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                        <select
                          className="glass-input compact-input compact-select"
                          value={subscription?.period ?? "monthly"}
                          onChange={(event) =>
                            updateProvider(resolvedActiveCategory, serviceKey, {
                              period: event.target.value as BillingPeriod,
                            })
                          }
                        >
                          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {(customByCategory.get(resolvedActiveCategory) ?? []).map((subscription) => (
                  <div key={subscription.id} className="provider-card is-active custom-provider-card">
                    <div className="custom-provider-head">
                      <div className="provider-toggle">
                        <span
                          className="provider-chip"
                          style={{
                            borderColor: getServiceBrandColor("custom"),
                            color: getServiceBrandColor("custom"),
                            backgroundColor: hexToRgba(getServiceBrandColor("custom"), 0.08),
                          }}
                        >
                          {subscription.customName || "Custom"}
                        </span>
                      </div>
                      <div className="custom-provider-actions">
                        <span className="provider-state active">Active</span>
                        <button
                          className="icon-btn danger"
                          title="Удалить подписку"
                          onClick={() => removeCustomSubscription(subscription.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="provider-controls-inline">
                      <input
                        className="glass-input compact-input compact-amount"
                        type="number"
                        min={0}
                        value={subscription.amount}
                        onChange={(event) =>
                          updateCustomSubscription(subscription.id, {
                            amount: Math.max(0, Number(event.target.value || 0)),
                          })
                        }
                      />
                      <select
                        className="glass-input compact-input compact-select"
                        value={subscription.currency}
                        onChange={(event) =>
                          updateCustomSubscription(subscription.id, {
                            currency: event.target.value as Currency,
                          })
                        }
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <select
                        className="glass-input compact-input compact-select"
                        value={subscription.period}
                        onChange={(event) =>
                          updateCustomSubscription(subscription.id, {
                            period: event.target.value as BillingPeriod,
                          })
                        }
                      >
                        {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {providerGroups.active.length === 0 &&
                (customByCategory.get(resolvedActiveCategory) ?? []).length === 0 &&
                providerGroups.inactive.length === 0 ? (
                  <div className="provider-empty">No predefined providers for this category.</div>
                ) : null}

                {providerGroups.inactive.length > 0 &&
                (providerGroups.active.length > 0 ||
                  (customByCategory.get(resolvedActiveCategory) ?? []).length > 0) ? (
                  <div className="provider-divider" />
                ) : null}

                {providerGroups.inactive.map(({ serviceKey, subscription }) => {
                  const lookupKey = `${resolvedActiveCategory}:${serviceKey}`;
                  return (
                    <div key={lookupKey} className="provider-card is-inactive">
                      <div className="provider-head-row">
                        <label className="provider-toggle">
                          <input
                            className="toggle-input"
                            type="checkbox"
                            checked={false}
                            onChange={(event) =>
                              toggleProvider(resolvedActiveCategory, serviceKey, event.target.checked)
                            }
                          />
                          <span className="toggle-switch" aria-hidden="true">
                            <span className="toggle-thumb" />
                          </span>
                          <span
                            className="provider-chip"
                            style={{
                              borderColor: getServiceBrandColor(serviceKey),
                              color: getServiceBrandColor(serviceKey),
                              backgroundColor: hexToRgba(getServiceBrandColor(serviceKey), 0.08),
                            }}
                          >
                            {SERVICE_CATALOG[serviceKey].label}
                          </span>
                        </label>
                        <span className="provider-state inactive">Inactive</span>
                      </div>

                      <div className="provider-controls-inline">
                        <input
                          className="glass-input compact-input compact-amount"
                          type="number"
                          min={0}
                          value={subscription?.amount ?? ""}
                          disabled={true}
                          placeholder="Amount"
                          onChange={(event) =>
                            updateProvider(resolvedActiveCategory, serviceKey, {
                              amount: Math.max(0, Number(event.target.value || 0)),
                            })
                          }
                        />
                        <select
                          className="glass-input compact-input compact-select"
                          value={subscription?.currency ?? "RUB"}
                          disabled={true}
                          onChange={(event) =>
                            updateProvider(resolvedActiveCategory, serviceKey, {
                              currency: event.target.value as Currency,
                            })
                          }
                        >
                          {CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                        <select
                          className="glass-input compact-input compact-select"
                          value={subscription?.period ?? "monthly"}
                          disabled={true}
                          onChange={(event) =>
                            updateProvider(resolvedActiveCategory, serviceKey, {
                              period: event.target.value as BillingPeriod,
                            })
                          }
                        >
                          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      </div>

      {customModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="glass-panel modal-panel">
            <div className="modal-header">
              <h3>Добавить свою подписку</h3>
              <button className="icon-btn" onClick={() => setCustomModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="form-grid">
              <label className="field-block full">
                <span>Название</span>
                <input
                  className="glass-input"
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="Например, Amnezia VPN"
                />
              </label>

              <label className="field-block full">
                <span>Категория</span>
                <select
                  className="glass-input"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value as SubscriptionCategory)}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {customError ? <div className="form-error">{customError}</div> : null}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setCustomModalOpen(false)}>
                Отмена
              </button>
              <button className="btn-primary" onClick={createCustomSubscription}>
                Создать
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
