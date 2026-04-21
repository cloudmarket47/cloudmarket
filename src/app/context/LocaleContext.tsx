import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  formatPriceForCountry,
  getActiveRatesSnapshot,
  loadRatesSnapshot,
  setActiveRatesSnapshot,
  type SupportedRateCurrency,
} from '../lib/currencyRates';
import {
  DEFAULT_COUNTRY_CODE,
  getLocaleConfig,
  resolvePreferredCountryCode,
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
  formatPrice: (amount: number, sourceCurrency?: SupportedRateCurrency) => string;
  ratesUpdatedAt: string;
  isRatesReady: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(DEFAULT_COUNTRY_CODE);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(() => getActiveRatesSnapshot().updatedAt);
  const [isRatesReady, setIsRatesReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    void resolvePreferredCountryCode()
      .then((resolvedCountryCode) => {
        if (isActive) {
          setCountryCode(resolvedCountryCode);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
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
      formatPrice: (amount: number, sourceCurrency?: SupportedRateCurrency) =>
        formatPriceForCountry(amount, localeConfig.countryCode, undefined, sourceCurrency),
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
    formatPrice: (amount: number, sourceCurrency?: SupportedRateCurrency) =>
      formatPriceForCountry(amount, fallback.countryCode, undefined, sourceCurrency),
    ratesUpdatedAt: getActiveRatesSnapshot().updatedAt,
    isRatesReady: false,
  };
}
