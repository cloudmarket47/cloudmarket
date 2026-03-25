import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLocaleConfig, readCountryCookie, type SupportedCountryCode } from './localeData';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, countryCode?: SupportedCountryCode): string {
  const locale = getLocaleConfig(countryCode ?? readCountryCookie());
  const absoluteAmount = Math.abs(amount);
  const formattedNumber = new Intl.NumberFormat(locale.localeTag, {
    maximumFractionDigits: 0,
  }).format(absoluteAmount);

  return `${amount < 0 ? '-' : ''}${locale.currencySymbol}${formattedNumber}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
