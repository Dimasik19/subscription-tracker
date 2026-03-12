import type { Currency, FxRates, ServiceKey, SubscriptionCategory } from "./types";

export type ServiceCatalogEntry = {
  label: string;
  brandColor: string;
  category: SubscriptionCategory;
};

export const SERVICE_CATALOG: Record<ServiceKey, ServiceCatalogEntry> = {
  kinopoisk: { label: "Кинопоиск", brandColor: "#f97316", category: "Видео" },
  okko: { label: "Okko", brandColor: "#7c3aed", category: "Видео" },
  wink: { label: "Wink", brandColor: "#ec4899", category: "Видео" },
  ivi: { label: "Иви", brandColor: "#ef4444", category: "Видео" },
  kion: { label: "KION", brandColor: "#e11d48", category: "Видео" },
  premier: { label: "Premier", brandColor: "#0f172a", category: "Видео" },
  start: { label: "Start", brandColor: "#6366f1", category: "Видео" },
  vkvideo: { label: "VK Video", brandColor: "#2563eb", category: "Видео" },
  rutube: { label: "Rutube", brandColor: "#16a34a", category: "Видео" },
  youtube: { label: "YouTube", brandColor: "#dc2626", category: "Видео" },
  yandex: { label: "Яндекс", brandColor: "#ea580c", category: "Экосистема" },
  vk: { label: "VK", brandColor: "#2563eb", category: "Экосистема" },
  tbank: { label: "T-Bank", brandColor: "#facc15", category: "Экосистема" },
  mts: { label: "МТС", brandColor: "#ef4444", category: "Связь" },
  beeline: { label: "Билайн", brandColor: "#f59e0b", category: "Связь" },
  megafon: { label: "Мегафон", brandColor: "#22c55e", category: "Связь" },
  tele2: { label: "Теле-2", brandColor: "#0f172a", category: "Связь" },
  rostelecom: { label: "Ростелеком", brandColor: "#7c3aed", category: "Связь" },
  sber: { label: "Sber", brandColor: "#16a34a", category: "Экосистема" },
  chatgpt: { label: "ChatGPT", brandColor: "#10b981", category: "AI" },
  gemini: { label: "Gemini", brandColor: "#2563eb", category: "AI" },
  claude: { label: "Claude", brandColor: "#ea580c", category: "AI" },
  perplexity: { label: "Perplexity", brandColor: "#111827", category: "AI" },
  midjourney: { label: "Midjourney", brandColor: "#111827", category: "AI" },
  spotify: { label: "Spotify", brandColor: "#1db954", category: "Творчество" },
  applemusic: { label: "Apple Music", brandColor: "#fa243c", category: "Творчество" },
  litres: { label: "Литрес", brandColor: "#2563eb", category: "Творчество" },
  patefon: { label: "Патефон", brandColor: "#9333ea", category: "Творчество" },
  coursera: { label: "Coursera", brandColor: "#2563eb", category: "Образование" },
  umschool: { label: "Umschool", brandColor: "#f97316", category: "Образование" },
  skyeng: { label: "Skyeng", brandColor: "#0ea5e9", category: "Образование" },
  duolingo: { label: "Duolingo", brandColor: "#22c55e", category: "Образование" },
  babbel: { label: "Babbel", brandColor: "#ef4444", category: "Образование" },
  netflix: { label: "Netflix", brandColor: "#b91c1c", category: "Видео" },
  playstation: { label: "PlayStation", brandColor: "#2563eb", category: "Развлечения" },
  xbox: { label: "Xbox", brandColor: "#16a34a", category: "Развлечения" },
  steam: { label: "Steam", brandColor: "#334155", category: "Развлечения" },
  vpn: { label: "VPN", brandColor: "#0891b2", category: "Другое" },
  custom: { label: "Custom", brandColor: "#64748b", category: "Другое" },
};

export const SERVICE_KEYS = Object.keys(SERVICE_CATALOG) as ServiceKey[];

export const CURRENCIES: Currency[] = ["RUB", "USD", "EUR", "GBP", "TRY"];

export const CATEGORIES: SubscriptionCategory[] = [
  "Видео",
  "Экосистема",
  "Связь",
  "AI",
  "Творчество",
  "Образование",
  "Развлечения",
  "Другое",
];

export const DEFAULT_FX_RATES: FxRates = {
  RUB: 1,
  USD: 91,
  EUR: 99,
  GBP: 115,
  TRY: 2.8,
};

export const PERIOD_LABELS: Record<"monthly" | "quarterly" | "yearly", string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function getServiceLabel(serviceKey: ServiceKey, customName?: string): string {
  if (serviceKey === "custom") {
    return customName?.trim() || "Custom Service";
  }
  return SERVICE_CATALOG[serviceKey].label;
}

export function getServiceBrandColor(serviceKey: ServiceKey): string {
  return SERVICE_CATALOG[serviceKey].brandColor;
}
