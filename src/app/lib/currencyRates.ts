import { GENERATED_RATES_SNAPSHOT } from './generatedRatesSnapshot';
import { getLocaleConfig, type SupportedCountryCode } from './localeData';

export type SupportedRateCurrency = 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR';

export interface RatesSnapshot {
  base: 'NGN';
  source: string;
  updatedAt: string;
  fetchedAt: string;
  sourceDate?: string;
  safetyBufferMultiplier: number;
  rates: Record<SupportedRateCurrency, number>;
}

const RATES_FILE_PATH = '/rates.json';
const SAFETY_BUFFER_MULTIPLIER = 1.05;

const DEFAULT_RATES_SNAPSHOT: RatesSnapshot = GENERATED_RATES_SNAPSHOT;

let activeRatesSnapshot: RatesSnapshot = DEFAULT_RATES_SNAPSHOT;
let activeRatesRequest: Promise<RatesSnapshot> | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeRate(value: unknown) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function normalizeRatesSnapshot(value: unknown): RatesSnapshot {
  if (!value || typeof value !== 'object') {
    return DEFAULT_RATES_SNAPSHOT;
  }

  const snapshot = value as Partial<RatesSnapshot>;
  const rates = snapshot.rates && typeof snapshot.rates === 'object' ? snapshot.rates : {};

  return {
    base: 'NGN',
    source: typeof snapshot.source === 'string' ? snapshot.source : DEFAULT_RATES_SNAPSHOT.source,
    updatedAt:
      typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : DEFAULT_RATES_SNAPSHOT.updatedAt,
    fetchedAt:
      typeof snapshot.fetchedAt === 'string' ? snapshot.fetchedAt : DEFAULT_RATES_SNAPSHOT.fetchedAt,
    sourceDate:
      typeof snapshot.sourceDate === 'string'
        ? snapshot.sourceDate
        : DEFAULT_RATES_SNAPSHOT.sourceDate,
    safetyBufferMultiplier:
      typeof snapshot.safetyBufferMultiplier === 'number' && snapshot.safetyBufferMultiplier > 0
        ? snapshot.safetyBufferMultiplier
        : DEFAULT_RATES_SNAPSHOT.safetyBufferMultiplier,
    rates: {
      NGN: 1,
      USD: normalizeRate((rates as Record<string, unknown>).USD),
      GHS: normalizeRate((rates as Record<string, unknown>).GHS),
      KES: normalizeRate((rates as Record<string, unknown>).KES),
      ZAR: normalizeRate((rates as Record<string, unknown>).ZAR),
    },
  };
}

export function getCurrencyForCountry(countryCode?: SupportedCountryCode): SupportedRateCurrency {
  return getLocaleConfig(countryCode).currencyCode;
}

export function getActiveRatesSnapshot() {
  return activeRatesSnapshot;
}

export function setActiveRatesSnapshot(snapshot: RatesSnapshot) {
  activeRatesSnapshot = normalizeRatesSnapshot(snapshot);
  return activeRatesSnapshot;
}

export async function loadRatesSnapshot(force = false) {
  if (!isBrowser()) {
    return activeRatesSnapshot;
  }

  if (activeRatesRequest && !force) {
    return activeRatesRequest;
  }

  activeRatesRequest = (async () => {
    const response = await fetch(RATES_FILE_PATH, {
      cache: force ? 'no-store' : 'default',
    });

    if (!response.ok) {
      throw new Error(`Unable to load currency rates. Status ${response.status}.`);
    }

    const snapshot = normalizeRatesSnapshot(await response.json());
    activeRatesSnapshot = snapshot;
    return snapshot;
  })();

  try {
    return await activeRatesRequest;
  } catch {
    return activeRatesSnapshot;
  } finally {
    activeRatesRequest = null;
  }
}

export function convertNairaAmount(
  nairaAmount: number,
  targetCurrency: SupportedRateCurrency,
  snapshot: RatesSnapshot = activeRatesSnapshot,
) {
  if (targetCurrency === 'NGN') {
    return Number(nairaAmount.toFixed(2));
  }

  const convertedAmount =
    nairaAmount * snapshot.rates[targetCurrency] * snapshot.safetyBufferMultiplier;

  return Number(convertedAmount.toFixed(2));
}

export function formatConvertedAmount(
  amount: number,
  targetCurrency: SupportedRateCurrency,
  countryCode?: SupportedCountryCode,
) {
  const locale = getLocaleConfig(countryCode);
  const fractionDigits = targetCurrency === 'NGN' ? 0 : 2;

  return new Intl.NumberFormat(locale.localeTag, {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatPriceForCountry(
  nairaAmount: number,
  countryCode?: SupportedCountryCode,
  snapshot: RatesSnapshot = activeRatesSnapshot,
) {
  const locale = getLocaleConfig(countryCode);
  const convertedAmount = convertNairaAmount(nairaAmount, locale.currencyCode, snapshot);

  return formatConvertedAmount(convertedAmount, locale.currencyCode, locale.countryCode);
}

export async function getConvertedPrice(
  nairaAmount: number,
  targetCurrency: SupportedRateCurrency,
) {
  const snapshot = await loadRatesSnapshot();
  const fallbackCountryCode =
    targetCurrency === 'USD'
      ? 'US'
      : targetCurrency === 'GHS'
        ? 'GH'
        : targetCurrency === 'KES'
          ? 'KE'
          : targetCurrency === 'ZAR'
            ? 'ZA'
            : 'NG';

  const convertedAmount = convertNairaAmount(nairaAmount, targetCurrency, snapshot);

  return formatConvertedAmount(convertedAmount, targetCurrency, fallbackCountryCode);
}
