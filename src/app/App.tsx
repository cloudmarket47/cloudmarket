import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { LocaleProvider } from './context/LocaleContext';
import { startSupabaseRealtimeSync } from './lib/supabaseRealtime';
import { router } from './routes';

export default function App() {
  useEffect(() => {
    return startSupabaseRealtimeSync();
  }, []);

  return (
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>
  );
}
