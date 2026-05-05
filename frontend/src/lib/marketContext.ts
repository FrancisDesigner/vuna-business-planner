export interface PlannerMarketContext {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  flag: string;
}

const STORAGE_KEY = 'vuna_mentor_market_context';
const PREFERRED_CURRENCY_KEY = 'vuna_mentor_currency_code';
export const DEFAULT_PLANNER_CURRENCY_CODE = 'LOCAL';

export interface PlannerCurrencyOption {
  code: string;
  label: string;
}

export const PLANNER_CURRENCY_OPTIONS: PlannerCurrencyOption[] = [
  { code: DEFAULT_PLANNER_CURRENCY_CODE, label: 'Local currency' },
  { code: 'USD', label: 'US dollar' },
  { code: 'UGX', label: 'Ugandan shilling' },
  { code: 'KES', label: 'Kenyan shilling' },
  { code: 'TZS', label: 'Tanzanian shilling' },
  { code: 'RWF', label: 'Rwandan franc' },
  { code: 'BIF', label: 'Burundian franc' },
  { code: 'CDF', label: 'Congolese franc' },
  { code: 'SSP', label: 'South Sudanese pound' },
  { code: 'NGN', label: 'Nigerian naira' },
  { code: 'ZAR', label: 'South African rand' },
  { code: 'GHS', label: 'Ghanaian cedi' },
  { code: 'ZMW', label: 'Zambian kwacha' },
  { code: 'INR', label: 'Indian rupee' },
  { code: 'GBP', label: 'British pound' },
  { code: 'EUR', label: 'Euro' },
  { code: 'CAD', label: 'Canadian dollar' },
  { code: 'AUD', label: 'Australian dollar' },
];

const INVESTMENT_GUIDANCE_LIMITS: Record<string, number> = {
  [DEFAULT_PLANNER_CURRENCY_CODE]: 100_000,
  USD: 30_000,
  UGX: 100_000_000,
  KES: 4_000_000,
  TZS: 75_000_000,
  RWF: 40_000_000,
  BIF: 100_000_000,
  CDF: 85_000_000,
  SSP: 35_000_000,
  NGN: 45_000_000,
  ZAR: 550_000,
  GHS: 350_000,
  ZMW: 750_000,
  INR: 2_500_000,
  GBP: 25_000,
  EUR: 30_000,
  CAD: 40_000,
  AUD: 45_000,
};

const MARKET_DEFAULTS: Record<string, Omit<PlannerMarketContext, 'countryCode'>> = {
  UG: { countryName: 'Uganda', currencyCode: 'UGX', flag: '🇺🇬' },
  KE: { countryName: 'Kenya', currencyCode: 'KES', flag: '🇰🇪' },
  TZ: { countryName: 'Tanzania', currencyCode: 'TZS', flag: '🇹🇿' },
  RW: { countryName: 'Rwanda', currencyCode: 'RWF', flag: '🇷🇼' },
  BI: { countryName: 'Burundi', currencyCode: 'BIF', flag: '🇧🇮' },
  CD: { countryName: 'DR Congo', currencyCode: 'CDF', flag: '🇨🇩' },
  SS: { countryName: 'South Sudan', currencyCode: 'SSP', flag: '🇸🇸' },
  NG: { countryName: 'Nigeria', currencyCode: 'NGN', flag: '🇳🇬' },
  ZA: { countryName: 'South Africa', currencyCode: 'ZAR', flag: '🇿🇦' },
  GH: { countryName: 'Ghana', currencyCode: 'GHS', flag: '🇬🇭' },
  ZM: { countryName: 'Zambia', currencyCode: 'ZMW', flag: '🇿🇲' },
  IN: { countryName: 'India', currencyCode: 'INR', flag: '🇮🇳' },
  US: { countryName: 'United States', currencyCode: 'USD', flag: '🇺🇸' },
  CA: { countryName: 'Canada', currencyCode: 'CAD', flag: '🇨🇦' },
  AU: { countryName: 'Australia', currencyCode: 'AUD', flag: '🇦🇺' },
  GB: { countryName: 'United Kingdom', currencyCode: 'GBP', flag: '🇬🇧' },
  DE: { countryName: 'Germany', currencyCode: 'EUR', flag: '🇩🇪' },
  FR: { countryName: 'France', currencyCode: 'EUR', flag: '🇫🇷' },
  IT: { countryName: 'Italy', currencyCode: 'EUR', flag: '🇮🇹' },
  ES: { countryName: 'Spain', currencyCode: 'EUR', flag: '🇪🇸' },
  NL: { countryName: 'Netherlands', currencyCode: 'EUR', flag: '🇳🇱' },
  BE: { countryName: 'Belgium', currencyCode: 'EUR', flag: '🇧🇪' },
  PT: { countryName: 'Portugal', currencyCode: 'EUR', flag: '🇵🇹' },
  IE: { countryName: 'Ireland', currencyCode: 'EUR', flag: '🇮🇪' },
};

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Africa/Kampala': 'UG',
  'Africa/Nairobi': 'KE',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kigali': 'RW',
  'Africa/Bujumbura': 'BI',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Accra': 'GH',
  'Africa/Lusaka': 'ZM',
  'Africa/Juba': 'SS',
  'Asia/Kolkata': 'IN',
  'Europe/London': 'GB',
};

function localeCountryCode(input: string): string | null {
  const match = input.toUpperCase().match(/[-_](UG|KE|TZ|RW|BI|CD|SS|NG|ZA|GH|ZM|IN|US|CA|AU|GB|DE|FR|IT|ES|NL|BE|PT|IE)\b/);
  return match?.[1] || null;
}

export function resolvePlannerMarketContext(countryCode: string | null | undefined): PlannerMarketContext | null {
  const normalized = (countryCode || '').trim().toUpperCase();
  const defaults = MARKET_DEFAULTS[normalized];
  if (!defaults) return null;

  return {
    countryCode: normalized,
    ...defaults,
  };
}

export function detectPlannerMarketContext(): PlannerMarketContext | null {
  if (typeof window === 'undefined') return null;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone) {
    const resolved = resolvePlannerMarketContext(TIMEZONE_TO_COUNTRY[timezone]);
    if (resolved) return resolved;
  }

  const locales = [...(navigator.languages || []), navigator.language].filter(Boolean);
  for (const locale of locales) {
    const resolved = resolvePlannerMarketContext(localeCountryCode(locale));
    if (resolved) return resolved;
  }

  return null;
}

export function readStoredPlannerMarketContext(): PlannerMarketContext | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<PlannerMarketContext>;
    return resolvePlannerMarketContext(parsed.countryCode);
  } catch {
    return null;
  }
}

export function storePlannerMarketContext(context: PlannerMarketContext): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function applyPlannerCurrencyPreference(context: PlannerMarketContext, options?: { force?: boolean }): void {
  if (typeof window === 'undefined') return;
  if (options?.force || !localStorage.getItem(PREFERRED_CURRENCY_KEY)) {
    localStorage.setItem(PREFERRED_CURRENCY_KEY, context.currencyCode);
  }
}

export function normalizePlannerCurrencyCode(currencyCode: string | null | undefined): string {
  const normalized = (currencyCode || '').trim().toUpperCase();
  return PLANNER_CURRENCY_OPTIONS.some((option) => option.code === normalized)
    ? normalized
    : DEFAULT_PLANNER_CURRENCY_CODE;
}

export function storePlannerCurrencyPreference(currencyCode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_CURRENCY_KEY, normalizePlannerCurrencyCode(currencyCode));
}

export function getPreferredPlannerCurrencyCode(): string {
  if (typeof window === 'undefined') return DEFAULT_PLANNER_CURRENCY_CODE;

  const storedPreference = normalizePlannerCurrencyCode(localStorage.getItem(PREFERRED_CURRENCY_KEY));
  if (storedPreference !== DEFAULT_PLANNER_CURRENCY_CODE) {
    return storedPreference;
  }

  if (localStorage.getItem(PREFERRED_CURRENCY_KEY)) {
    return storedPreference;
  }

  const detected = detectPlannerMarketContext();
  if (detected) {
    return detected.currencyCode;
  }

  return normalizePlannerCurrencyCode(readStoredPlannerMarketContext()?.currencyCode);
}

export function isNeutralPlannerCurrencyCode(currencyCode: string): boolean {
  return !currencyCode || currencyCode === DEFAULT_PLANNER_CURRENCY_CODE;
}

export function formatPlannerCurrency(value: number, currencyCode: string): string {
  const formattedValue = Math.round(value).toLocaleString();
  return isNeutralPlannerCurrencyCode(currencyCode) ? formattedValue : `${formattedValue} ${currencyCode}`;
}

export function formatPlannerCompactCurrency(value: number, currencyCode: string): string {
  const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
  return isNeutralPlannerCurrencyCode(currencyCode) ? compact : `${currencyCode} ${compact}`;
}

export function getInvestmentGuidanceLimit(currencyCode: string): number {
  const normalized = normalizePlannerCurrencyCode(currencyCode);
  return INVESTMENT_GUIDANCE_LIMITS[normalized] ?? INVESTMENT_GUIDANCE_LIMITS[DEFAULT_PLANNER_CURRENCY_CODE];
}
