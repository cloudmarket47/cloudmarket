import { useEffect, useState } from 'react';
import {
  FINANCE_DATA_CHANGE_EVENT,
  ensureFinanceSettingsLoaded,
  readFinanceSettings,
} from './adminFinance';
import type { AdminCurrency } from './adminProductDrafts';

export interface AppBrandingSettings {
  companyName: string;
  companyShortName: string;
  logoUrl: string;
  currency: AdminCurrency;
  homepageHighlightImages: string[];
  homepageCategoryImages: Record<string, string>;
}

export function deriveCompanyShortName(companyName: string) {
  const parts = companyName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'CM';
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);
}

export function readBrandingSettings(): AppBrandingSettings {
  const financeSettings = readFinanceSettings();
  const companyName = financeSettings.companyName.trim() || 'CloudMarket';

  return {
    companyName,
    companyShortName:
      financeSettings.companyShortName.trim() || deriveCompanyShortName(companyName),
    logoUrl: financeSettings.logoUrl,
    currency: financeSettings.currency,
    homepageHighlightImages: financeSettings.homepageHighlightImages,
    homepageCategoryImages: financeSettings.homepageCategoryImages,
  };
}

export function useBrandingSettings() {
  const [branding, setBranding] = useState<AppBrandingSettings>(() => readBrandingSettings());

  useEffect(() => {
    const syncBranding = async () => {
      await ensureFinanceSettingsLoaded().catch(() => undefined);
      setBranding(readBrandingSettings());
    };

    void syncBranding();
    window.addEventListener(FINANCE_DATA_CHANGE_EVENT, syncBranding as EventListener);

    return () => {
      window.removeEventListener(FINANCE_DATA_CHANGE_EVENT, syncBranding as EventListener);
    };
  }, []);

  return branding;
}
