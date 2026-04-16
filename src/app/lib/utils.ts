import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLocaleConfig, readCountryCookie, type SupportedCountryCode } from './localeData';
import type { SupportedRateCurrency } from './currencyRates';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, countryCode?: SupportedCountryCode): string {
  const locale = getLocaleConfig(countryCode ?? readCountryCookie());
  const fractionDigits = locale.currencyCode === 'NGN' ? 0 : 2;

  return new Intl.NumberFormat(locale.localeTag, {
    style: 'currency',
    currency: locale.currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function getCountryCodeForCurrency(
  currency: SupportedRateCurrency,
): SupportedCountryCode {
  switch (currency) {
    case 'USD':
      return 'US';
    case 'GHS':
      return 'GH';
    case 'KES':
      return 'KE';
    case 'ZAR':
      return 'ZA';
    default:
      return 'NG';
  }
}

export function formatCurrencyByCode(amount: number, currency: SupportedRateCurrency): string {
  return formatCurrency(amount, getCountryCodeForCurrency(currency));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
