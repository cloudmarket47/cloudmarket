import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
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
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>
  );
}
