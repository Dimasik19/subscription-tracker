export type ServiceKey =
  | "kinopoisk"
  | "okko"
  | "wink"
  | "ivi"
  | "kion"
  | "premier"
  | "start"
  | "vkvideo"
  | "rutube"
  | "youtube"
  | "yandex"
  | "vk"
  | "tbank"
  | "mts"
  | "beeline"
  | "megafon"
  | "tele2"
  | "rostelecom"
  | "sber"
  | "chatgpt"
  | "gemini"
  | "claude"
  | "perplexity"
  | "midjourney"
  | "spotify"
  | "applemusic"
  | "litres"
  | "patefon"
  | "coursera"
  | "umschool"
  | "skyeng"
  | "duolingo"
  | "babbel"
  | "netflix"
  | "playstation"
  | "xbox"
  | "steam"
  | "vpn"
  | "custom";

export type BillingPeriod = "monthly" | "quarterly" | "yearly";

export type Currency = "RUB" | "USD" | "EUR" | "GBP" | "TRY";

export type SubscriptionCategory =
  | "Видео"
  | "Экосистема"
  | "Связь"
  | "AI"
  | "Творчество"
  | "Образование"
  | "Развлечения"
  | "Другое";

export type FxRates = Record<Currency, number>;

export type Subscription = {
  id: string;
  serviceKey: ServiceKey;
  customName?: string;
  category: SubscriptionCategory;
  isActive?: boolean;
  amount: number;
  currency: Currency;
  period: BillingPeriod;
  startedAt?: string;
  note?: string;
};

export type DashboardFilters = {
  category: SubscriptionCategory | "all";
  periodRange: "3m" | "6m" | "12m";
  sortBy: "amount" | "service" | "category";
  sortDir: "asc" | "desc";
};

export type DashboardState = {
  subscriptions: Subscription[];
  monthlyIncome: number;
  displayCurrency: Currency;
  fxRates: FxRates;
  filters: DashboardFilters;
  updatedAt: string;
};
