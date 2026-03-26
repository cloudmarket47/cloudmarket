/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_REALTIME_ENABLED?: string;
  readonly VITE_SUPABASE_TABLE_ANALYTICS_EVENTS?: string;
  readonly VITE_SUPABASE_TABLE_APP_SETTINGS?: string;
  readonly VITE_SUPABASE_TABLE_CUSTOMER_TOKENS?: string;
  readonly VITE_SUPABASE_TABLE_FINANCE_EXPENSES?: string;
  readonly VITE_SUPABASE_TABLE_FINANCE_SALES?: string;
  readonly VITE_SUPABASE_TABLE_ORDERS?: string;
  readonly VITE_SUPABASE_TABLE_PRODUCT_PAGES?: string;
  readonly VITE_SUPABASE_TABLE_SUBSCRIBER_ACTIVITIES?: string;
  readonly VITE_SUPABASE_TABLE_SUBSCRIBER_MANAGEMENT?: string;
  readonly VITE_SUPABASE_BUCKET_ASSETS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
