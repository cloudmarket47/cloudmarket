import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  formatPriceForCountry,
  getActiveRatesSnapshot,
  loadRatesSnapshot,
  setActiveRatesSnapshot,
} from '../lib/currencyRates';
import {
  DEFAULT_COUNTRY_CODE,
  getLocaleConfig,
  readCountryCookie,
  type SupportedCountryCode,
  writeCountryCookie,
} from '../lib/localeData';

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
  ratesUpdatedAt: string;
  isRatesReady: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(() => readCountryCookie());
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(() => getActiveRatesSnapshot().updatedAt);
  const [isRatesReady, setIsRatesReady] = useState(false);

  useEffect(() => {
    setCountryCode(readCountryCookie());
  }, []);

  useEffect(() => {
    writeCountryCookie(countryCode);
  }, [countryCode]);

  useEffect(() => {
    let isActive = true;

    void loadRatesSnapshot(true)
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        setActiveRatesSnapshot(snapshot);
        setRatesUpdatedAt(snapshot.updatedAt);
        setIsRatesReady(true);
      })
      .catch(() => {
        if (isActive) {
          setIsRatesReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const localeConfig = useMemo(() => getLocaleConfig(countryCode), [countryCode]);

  const contextValue = useMemo<LocaleContextValue>(() => {
    return {
      ...localeConfig,
      setCountryCode,
      formatPrice: (amount: number) => formatPriceForCountry(amount, localeConfig.countryCode),
      ratesUpdatedAt,
      isRatesReady,
    };
  }, [isRatesReady, localeConfig, ratesUpdatedAt]);

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
    formatPrice: (amount: number) => formatPriceForCountry(amount, fallback.countryCode),
    ratesUpdatedAt: getActiveRatesSnapshot().updatedAt,
    isRatesReady: false,
  };
}
