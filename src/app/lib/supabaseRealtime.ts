import type { RealtimeChannel } from '@supabase/supabase-js';
import { ADMIN_NOTIFICATIONS_CHANGE_EVENT } from './adminNotifications';
import { refreshFinanceData } from './adminFinance';
import { ensureAdminOrdersLoaded } from './adminOrders';
import { ensureAdminPreferencesLoaded } from './adminPreferences';
import { ensureCustomerTokensLoaded } from './customerTokens';
import { ensurePlacedOrdersLoaded } from './orders';
import { readAnalyticsEvents } from './analyticsTelemetry';
import {
  getSupabaseClient,
  getSupabaseTableName,
  isSupabaseConfigured,
  isSupabaseRealtimeEnabled,
  emitBrowserEvent,
} from './supabase';
import { refreshStorefrontProducts } from './storefrontProducts';
import {
  readSubscriberActivityRecords,
  readSubscriberManagementRecords,
} from './subscriberTelemetry';

let realtimeChannel: RealtimeChannel | null = null;

function scheduleRefresh(
  collection: Map<string, number>,
  key: string,
  callback: () => Promise<unknown> | unknown,
) {
  if (typeof window === 'undefined' || collection.has(key)) {
    return;
  }

  const timeoutId = window.setTimeout(() => {
    collection.delete(key);
    void Promise.resolve(callback()).catch(() => undefined);
  }, 150);

  collection.set(key, timeoutId);
}

export function startSupabaseRealtimeSync() {
  if (typeof window === 'undefined' || !isSupabaseConfigured() || !isSupabaseRealtimeEnabled()) {
    return () => undefined;
  }

  if (realtimeChannel) {
    return () => {
      if (!realtimeChannel) {
        return;
      }

      void realtimeChannel.unsubscribe();
      realtimeChannel = null;
    };
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => undefined;
  }

  const pendingRefreshes = new Map<string, number>();
  const schedule = (key: string, callback: () => Promise<unknown> | unknown) =>
    scheduleRefresh(pendingRefreshes, key, callback);

  realtimeChannel = supabase
    .channel('cloudmarket-realtime-sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('productPages'),
      },
      () => {
        schedule('product_pages', () => refreshStorefrontProducts());
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('orders'),
      },
      () => {
        schedule('orders', async () => {
          await Promise.all([
            ensurePlacedOrdersLoaded(true),
            ensureAdminOrdersLoaded(true),
          ]);
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('customerTokens'),
      },
      () => {
        schedule('customer_tokens', () => ensureCustomerTokensLoaded(true));
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('subscriberActivities'),
      },
      () => {
        schedule('subscriber_activities', () => readSubscriberActivityRecords(true));
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('subscriberManagement'),
      },
      () => {
        schedule('subscriber_management', () => readSubscriberManagementRecords(true));
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('analyticsEvents'),
      },
      () => {
        schedule('analytics_events', () => readAnalyticsEvents(true));
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('financeExpenses'),
      },
      () => {
        schedule('finance_expenses', () => refreshFinanceData());
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('financeSales'),
      },
      () => {
        schedule('finance_sales', () => refreshFinanceData());
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: getSupabaseTableName('appSettings'),
      },
      () => {
        schedule('app_settings', async () => {
          await Promise.all([
            refreshFinanceData(),
            ensureAdminPreferencesLoaded(true),
          ]);
          emitBrowserEvent(ADMIN_NOTIFICATIONS_CHANGE_EVENT);
        });
      },
    )
    .subscribe();

  return () => {
    pendingRefreshes.forEach((timeoutId) => window.clearTimeout(timeoutId));
    pendingRefreshes.clear();

    if (!realtimeChannel) {
      return;
    }

    void realtimeChannel.unsubscribe();
    realtimeChannel = null;
  };
}
