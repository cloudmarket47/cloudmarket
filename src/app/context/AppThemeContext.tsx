import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  ensureFinanceSettingsLoaded,
  FINANCE_DATA_CHANGE_EVENT,
  readFinanceSettings,
  type AppThemeMode,
} from '../lib/adminFinance';

const USER_THEME_OVERRIDE_STORAGE_KEY = 'cloudmarket-user-theme-override';

interface AppThemeContextValue {
  adminThemeMode: AppThemeMode;
  themeMode: AppThemeMode;
  isDarkMode: boolean;
  hasUserOverride: boolean;
  setThemeMode: (mode: AppThemeMode) => void;
  toggleThemeMode: () => void;
  clearThemeOverride: () => void;
}

export const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function readStoredThemeOverride(): AppThemeMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedValue = window.localStorage.getItem(USER_THEME_OVERRIDE_STORAGE_KEY);
  return storedValue === 'light' || storedValue === 'dark' ? storedValue : null;
}

function persistThemeOverride(mode: AppThemeMode | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (mode) {
    window.localStorage.setItem(USER_THEME_OVERRIDE_STORAGE_KEY, mode);
    return;
  }

  window.localStorage.removeItem(USER_THEME_OVERRIDE_STORAGE_KEY);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [adminThemeMode, setAdminThemeMode] = useState<AppThemeMode>(() =>
    readFinanceSettings().appThemeMode === 'light' ? 'light' : 'dark',
  );
  const [userThemeOverride, setUserThemeOverride] = useState<AppThemeMode | null>(() =>
    readStoredThemeOverride(),
  );

  useEffect(() => {
    const syncThemeSettings = async () => {
      const financeSettings = await ensureFinanceSettingsLoaded().catch(() => readFinanceSettings());
      setAdminThemeMode(financeSettings.appThemeMode === 'light' ? 'light' : 'dark');
    };

    void syncThemeSettings();
    window.addEventListener(FINANCE_DATA_CHANGE_EVENT, syncThemeSettings as EventListener);

    return () => {
      window.removeEventListener(FINANCE_DATA_CHANGE_EVENT, syncThemeSettings as EventListener);
    };
  }, []);

  const themeMode = userThemeOverride ?? adminThemeMode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    document.body.classList.toggle('app-theme-dark', themeMode === 'dark');
    document.body.dataset.themeMode = themeMode;
  }, [themeMode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      adminThemeMode,
      themeMode,
      isDarkMode: themeMode === 'dark',
      hasUserOverride: userThemeOverride !== null,
      setThemeMode: (mode) => {
        persistThemeOverride(mode);
        setUserThemeOverride(mode);
      },
      toggleThemeMode: () => {
        const nextThemeMode = themeMode === 'dark' ? 'light' : 'dark';
        persistThemeOverride(nextThemeMode);
        setUserThemeOverride(nextThemeMode);
      },
      clearThemeOverride: () => {
        persistThemeOverride(null);
        setUserThemeOverride(null);
      },
    }),
    [adminThemeMode, themeMode, userThemeOverride],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }

  return context;
}
