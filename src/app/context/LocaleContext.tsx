import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_COUNTRY_CODE,
  getLocaleConfig,
  readCountryCookie,
  type SupportedCountryCode,
  writeCountryCookie,
} from '../lib/localeData';
import { formatCurrency } from '../lib/utils';

interface LocaleContextValue {
  countryCode: SupportedCountryCode;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  phonePrefix: string;
  phoneExample: string;
  regionLabel: string;
  regions: string[];
  setCountryCode: (countryCode: SupportedCountryCode) => void;
  formatPrice: (amount: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(() => readCountryCookie());

  useEffect(() => {
    setCountryCode(readCountryCookie());
  }, []);

  useEffect(() => {
    writeCountryCookie(countryCode);
  }, [countryCode]);

  const localeConfig = useMemo(() => getLocaleConfig(countryCode), [countryCode]);

  const contextValue = useMemo<LocaleContextValue>(() => {
    return {
      ...localeConfig,
      setCountryCode,
      formatPrice: (amount: number) => formatCurrency(amount, localeConfig.countryCode),
    };
  }, [localeConfig]);

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (context) {
    return context;
  }

  const fallback = getLocaleConfig(DEFAULT_COUNTRY_CODE);

  return {
    ...fallback,
    setCountryCode: () => undefined,
    formatPrice: (amount: number) => formatCurrency(amount, fallback.countryCode),
  };
}
