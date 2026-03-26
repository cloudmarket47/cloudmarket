import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_TABLES = {
  analyticsEvents: 'analytics_events',
  appSettings: 'app_settings',
  customerTokens: 'customer_tokens',
  financeExpenses: 'finance_expenses',
  financeSales: 'finance_sales',
  orders: 'orders',
  productPages: 'product_pages',
  subscriberActivities: 'subscriber_activities',
  subscriberManagement: 'subscriber_management',
} as const;

const DEFAULT_BUCKETS = {
  assets: 'cloudmarket-assets',
} as const;

let supabaseClient: SupabaseClient | null | undefined;

function hasRealSupabaseConfig(url?: string, anonKey?: string) {
  const normalizedUrl = url?.trim();
  const normalizedAnonKey = anonKey?.trim();

  if (!normalizedUrl || !normalizedAnonKey) {
    return false;
  }

  const placeholderFragments = [
    'your-project-ref',
    'your-supabase-anon-key',
    'example.supabase.co',
  ];

  return !placeholderFragments.some(
    (fragment) =>
      normalizedUrl.toLowerCase().includes(fragment) ||
      normalizedAnonKey.toLowerCase().includes(fragment),
  );
}

export function isSupabaseConfigured() {
  return hasRealSupabaseConfig(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

export function isSupabaseRealtimeEnabled() {
  const rawValue = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED?.trim().toLowerCase();

  if (!rawValue) {
    return true;
  }

  return rawValue !== 'false' && rawValue !== '0' && rawValue !== 'off';
}

export function getSupabaseTableName(name: keyof typeof DEFAULT_TABLES) {
  const envName = `VITE_SUPABASE_TABLE_${name
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()}` as keyof ImportMetaEnv;
  const override = import.meta.env[envName];
  return typeof override === 'string' && override.trim()
    ? override.trim()
    : DEFAULT_TABLES[name];
}

export function getSupabaseBucketName(name: keyof typeof DEFAULT_BUCKETS) {
  const envName = `VITE_SUPABASE_BUCKET_${name
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()}` as keyof ImportMetaEnv;
  const override = import.meta.env[envName];
  return typeof override === 'string' && override.trim()
    ? override.trim()
    : DEFAULT_BUCKETS[name];
}

export function getSupabaseClient() {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!hasRealSupabaseConfig(url, anonKey)) {
    supabaseClient = null;
    return supabaseClient;
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

export function emitBrowserEvent(eventName: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}

export function formatSupabaseError(error: PostgrestError | Error | null | undefined, fallback: string) {
  if (!error) {
    return fallback;
  }

  if ('message' in error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
