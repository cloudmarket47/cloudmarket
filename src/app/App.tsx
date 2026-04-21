import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppThemeProvider } from './context/AppThemeContext';
import { LocaleProvider } from './context/LocaleContext';
import { loadRatesSnapshot } from './lib/currencyRates';
import { startSupabaseRealtimeSync } from './lib/supabaseRealtime';
import { router } from './routes';

export default function App() {
  useEffect(() => {
    return startSupabaseRealtimeSync();
  }, []);

  useEffect(() => {
    void loadRatesSnapshot(true);
  }, []);

  return (
    <AppThemeProvider>
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </AppThemeProvider>
  );
}
