-- CloudMarket Supabase schema for the active Vite storefront/admin app.
--
-- Important:
-- 1. These policies match the current client-side architecture, where the browser
--    writes directly with the Supabase anon key.
-- 2. That means admin tables are writable from the client. This is functional,
--    but it is not a hardened admin security model.
-- 3. For stricter production security, move admin writes behind Supabase Auth
--    or server-side Netlify Functions using the service role key.

begin;

create table if not exists public.product_pages (
  id text primary key,
  source_product_id text,
  duplicated_from_id text,
  page_name text not null,
  product_name text not null,
  slug text not null unique,
  category text not null default '',
  gender_target text not null default 'all' check (gender_target in ('all', 'men', 'women', 'unisex', 'kids')),
  target_audience text not null default '',
  currency text not null default 'NGN' check (currency in ('NGN', 'USD', 'GHS', 'KES', 'ZAR')),
  theme_mode text not null default 'light' check (theme_mode in ('light', 'dark')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  short_description text not null default '',
  base_price integer not null default 0 check (base_price >= 0),
  purchase_cost integer not null default 0 check (purchase_cost >= 0),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  order_number text primary key,
  locale_country_code text not null default 'NG' check (locale_country_code in ('NG', 'US', 'GH', 'KE', 'ZA')),
  product_id text not null default '',
  product_slug text not null default '',
  product_name text not null default '',
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_alt_phone text not null default '',
  customer_address text not null default '',
  city text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  package_title text not null default '',
  package_description text not null default '',
  package_label text not null default '',
  sets_included text not null default '',
  short_delivery_message text not null default '',
  customer_token text not null default '',
  base_amount integer not null default 0,
  discount_percentage integer not null default 0,
  discount_amount integer not null default 0,
  final_amount integer not null default 0,
  status text not null default 'new' check (status in ('new', 'confirmed', 'processing', 'cancelled', 'failed', 'delivered')),
  source text not null default 'submission' check (source in ('submission', 'seed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expense_amount integer,
  expense_note text not null default '',
  expense_recorded_at timestamptz
);

create table if not exists public.customer_tokens (
  email text primary key,
  token text not null unique,
  discount_percentage integer not null default 10 check (discount_percentage >= 0),
  remaining_uses integer not null default 0 check (remaining_uses >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  order_numbers text[] not null default '{}'::text[],
  full_name text not null default '',
  gender text not null default '',
  location text not null default '',
  source_product_slug text,
  source_product_name text,
  source_page_url text
);

create table if not exists public.subscriber_activities (
  id text primary key,
  token text not null default '',
  email text not null default '',
  full_name text not null default '',
  type text not null check (type in (
    'subscription_created',
    'token_lookup',
    'page_view',
    'product_view',
    'package_selected',
    'token_applied',
    'order_submitted',
    'token_redeemed'
  )),
  page_path text not null default '',
  product_id text not null default '',
  product_slug text not null default '',
  product_name text not null default '',
  order_number text not null default '',
  package_title text not null default '',
  amount integer,
  created_at timestamptz not null default timezone('utc', now()),
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.subscriber_management (
  token text primary key,
  status text not null default 'active' check (status in ('active', 'vip', 'paused', 'blocked')),
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_events (
  id text primary key,
  type text not null check (type in (
    'session_start',
    'page_view',
    'product_view',
    'button_click',
    'search_query',
    'checkout_open',
    'package_select',
    'form_submit',
    'share_action'
  )),
  created_at timestamptz not null default timezone('utc', now()),
  visitor_id text not null,
  session_id text not null,
  country_code text not null default 'NG' check (country_code in ('NG', 'US', 'GH', 'KE', 'ZA')),
  page_path text not null default '',
  page_type text not null default 'other' check (page_type in ('storefront', 'marketplace', 'product', 'thank-you', 'other')),
  source_type text not null default 'direct' check (source_type in ('direct', 'social', 'search', 'referral', 'campaign', 'internal')),
  source_platform text not null default '',
  referrer_host text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  product_id text not null default '',
  product_slug text not null default '',
  product_name text not null default '',
  button_id text not null default '',
  button_label text not null default '',
  search_query text not null default '',
  results_count integer,
  order_number text not null default '',
  amount integer,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.finance_expenses (
  id text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  source text not null check (source in ('manual', 'order')),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.finance_sales (
  id text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_product_pages_status on public.product_pages (status);
create index if not exists idx_product_pages_updated_at on public.product_pages (updated_at desc);
create index if not exists idx_product_pages_slug on public.product_pages (slug);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_updated_at on public.orders (updated_at desc);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_product_slug on public.orders (product_slug);
create index if not exists idx_orders_customer_phone on public.orders (customer_phone);

create index if not exists idx_customer_tokens_token on public.customer_tokens (token);
create index if not exists idx_customer_tokens_created_at on public.customer_tokens (created_at desc);

create index if not exists idx_subscriber_activities_created_at on public.subscriber_activities (created_at desc);
create index if not exists idx_subscriber_activities_token on public.subscriber_activities (token);
create index if not exists idx_subscriber_activities_email on public.subscriber_activities (email);
create index if not exists idx_subscriber_activities_order_number on public.subscriber_activities (order_number);

create index if not exists idx_subscriber_management_updated_at on public.subscriber_management (updated_at desc);

create index if not exists idx_analytics_events_created_at on public.analytics_events (created_at desc);
create index if not exists idx_analytics_events_type on public.analytics_events (type);
create index if not exists idx_analytics_events_session_id on public.analytics_events (session_id);
create index if not exists idx_analytics_events_visitor_id on public.analytics_events (visitor_id);
create index if not exists idx_analytics_events_product_slug on public.analytics_events (product_slug);
create index if not exists idx_analytics_events_page_path on public.analytics_events (page_path);

create index if not exists idx_finance_expenses_created_at on public.finance_expenses (created_at desc);
create index if not exists idx_finance_expenses_source on public.finance_expenses (source);

create index if not exists idx_finance_sales_created_at on public.finance_sales (created_at desc);

create index if not exists idx_app_settings_updated_at on public.app_settings (updated_at desc);

create or replace function public.cloudmarket_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_product_pages_updated_at on public.product_pages;
create trigger trg_product_pages_updated_at
before update on public.product_pages
for each row
execute function public.cloudmarket_set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.cloudmarket_set_updated_at();

drop trigger if exists trg_subscriber_management_updated_at on public.subscriber_management;
create trigger trg_subscriber_management_updated_at
before update on public.subscriber_management
for each row
execute function public.cloudmarket_set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.cloudmarket_set_updated_at();

alter table public.product_pages enable row level security;
alter table public.orders enable row level security;
alter table public.customer_tokens enable row level security;
alter table public.subscriber_activities enable row level security;
alter table public.subscriber_management enable row level security;
alter table public.analytics_events enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_sales enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "product_pages_select_all" on public.product_pages;
create policy "product_pages_select_all"
on public.product_pages
for select
to anon, authenticated
using (true);

drop policy if exists "product_pages_insert_all" on public.product_pages;
create policy "product_pages_insert_all"
on public.product_pages
for insert
to anon, authenticated
with check (true);

drop policy if exists "product_pages_update_all" on public.product_pages;
create policy "product_pages_update_all"
on public.product_pages
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "product_pages_delete_all" on public.product_pages;
create policy "product_pages_delete_all"
on public.product_pages
for delete
to anon, authenticated
using (true);

drop policy if exists "orders_select_all" on public.orders;
create policy "orders_select_all"
on public.orders
for select
to anon, authenticated
using (true);

drop policy if exists "orders_insert_all" on public.orders;
create policy "orders_insert_all"
on public.orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "orders_update_all" on public.orders;
create policy "orders_update_all"
on public.orders
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "orders_delete_all" on public.orders;
create policy "orders_delete_all"
on public.orders
for delete
to anon, authenticated
using (true);

drop policy if exists "customer_tokens_select_all" on public.customer_tokens;
create policy "customer_tokens_select_all"
on public.customer_tokens
for select
to anon, authenticated
using (true);

drop policy if exists "customer_tokens_insert_all" on public.customer_tokens;
create policy "customer_tokens_insert_all"
on public.customer_tokens
for insert
to anon, authenticated
with check (true);

drop policy if exists "customer_tokens_update_all" on public.customer_tokens;
create policy "customer_tokens_update_all"
on public.customer_tokens
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subscriber_activities_select_all" on public.subscriber_activities;
create policy "subscriber_activities_select_all"
on public.subscriber_activities
for select
to anon, authenticated
using (true);

drop policy if exists "subscriber_activities_insert_all" on public.subscriber_activities;
create policy "subscriber_activities_insert_all"
on public.subscriber_activities
for insert
to anon, authenticated
with check (true);

drop policy if exists "subscriber_activities_update_all" on public.subscriber_activities;
create policy "subscriber_activities_update_all"
on public.subscriber_activities
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subscriber_activities_delete_all" on public.subscriber_activities;
create policy "subscriber_activities_delete_all"
on public.subscriber_activities
for delete
to anon, authenticated
using (true);

drop policy if exists "subscriber_management_select_all" on public.subscriber_management;
create policy "subscriber_management_select_all"
on public.subscriber_management
for select
to anon, authenticated
using (true);

drop policy if exists "subscriber_management_insert_all" on public.subscriber_management;
create policy "subscriber_management_insert_all"
on public.subscriber_management
for insert
to anon, authenticated
with check (true);

drop policy if exists "subscriber_management_update_all" on public.subscriber_management;
create policy "subscriber_management_update_all"
on public.subscriber_management
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subscriber_management_delete_all" on public.subscriber_management;
create policy "subscriber_management_delete_all"
on public.subscriber_management
for delete
to anon, authenticated
using (true);

drop policy if exists "analytics_events_select_all" on public.analytics_events;
create policy "analytics_events_select_all"
on public.analytics_events
for select
to anon, authenticated
using (true);

drop policy if exists "analytics_events_insert_all" on public.analytics_events;
create policy "analytics_events_insert_all"
on public.analytics_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "analytics_events_update_all" on public.analytics_events;
create policy "analytics_events_update_all"
on public.analytics_events
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "analytics_events_delete_all" on public.analytics_events;
create policy "analytics_events_delete_all"
on public.analytics_events
for delete
to anon, authenticated
using (true);

drop policy if exists "finance_expenses_select_all" on public.finance_expenses;
create policy "finance_expenses_select_all"
on public.finance_expenses
for select
to anon, authenticated
using (true);

drop policy if exists "finance_expenses_insert_all" on public.finance_expenses;
create policy "finance_expenses_insert_all"
on public.finance_expenses
for insert
to anon, authenticated
with check (true);

drop policy if exists "finance_expenses_update_all" on public.finance_expenses;
create policy "finance_expenses_update_all"
on public.finance_expenses
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "finance_expenses_delete_all" on public.finance_expenses;
create policy "finance_expenses_delete_all"
on public.finance_expenses
for delete
to anon, authenticated
using (true);

drop policy if exists "finance_sales_select_all" on public.finance_sales;
create policy "finance_sales_select_all"
on public.finance_sales
for select
to anon, authenticated
using (true);

drop policy if exists "finance_sales_insert_all" on public.finance_sales;
create policy "finance_sales_insert_all"
on public.finance_sales
for insert
to anon, authenticated
with check (true);

drop policy if exists "finance_sales_update_all" on public.finance_sales;
create policy "finance_sales_update_all"
on public.finance_sales
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "finance_sales_delete_all" on public.finance_sales;
create policy "finance_sales_delete_all"
on public.finance_sales
for delete
to anon, authenticated
using (true);

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "app_settings_insert_all" on public.app_settings;
create policy "app_settings_insert_all"
on public.app_settings
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_settings_update_all" on public.app_settings;
create policy "app_settings_update_all"
on public.app_settings
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "app_settings_delete_all" on public.app_settings;
create policy "app_settings_delete_all"
on public.app_settings
for delete
to anon, authenticated
using (true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'cloudmarket-assets',
  'cloudmarket-assets',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cloudmarket_assets_read" on storage.objects;
create policy "cloudmarket_assets_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'cloudmarket-assets');

drop policy if exists "cloudmarket_assets_insert" on storage.objects;
create policy "cloudmarket_assets_insert"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'cloudmarket-assets');

drop policy if exists "cloudmarket_assets_update" on storage.objects;
create policy "cloudmarket_assets_update"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'cloudmarket-assets')
with check (bucket_id = 'cloudmarket-assets');

drop policy if exists "cloudmarket_assets_delete" on storage.objects;
create policy "cloudmarket_assets_delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'cloudmarket-assets');

alter table public.product_pages replica identity full;
alter table public.orders replica identity full;
alter table public.customer_tokens replica identity full;
alter table public.subscriber_activities replica identity full;
alter table public.subscriber_management replica identity full;
alter table public.analytics_events replica identity full;
alter table public.finance_expenses replica identity full;
alter table public.finance_sales replica identity full;
alter table public.app_settings replica identity full;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'product_pages',
    'orders',
    'customer_tokens',
    'subscriber_activities',
    'subscriber_management',
    'analytics_events',
    'finance_expenses',
    'finance_sales',
    'app_settings'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;

commit;
