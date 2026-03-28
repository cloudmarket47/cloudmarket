import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLocaleConfig, readCountryCookie, type SupportedCountryCode } from './localeData';

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

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
