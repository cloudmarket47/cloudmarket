import { readAdminSubscribersSnapshot } from './adminSubscribers';
import { FINANCE_DATA_CHANGE_EVENT, readFinanceSnapshot } from './adminFinance';
import {
  ADMIN_ORDERS_DATA_CHANGE_EVENT,
  ensureAdminOrdersLoaded,
  readAdminOrders,
} from './adminOrders';
import {
  ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT,
  ensureAdminProductDraftsLoaded,
  readAdminProductDrafts,
} from './adminProductDrafts';
import { SUBSCRIBER_DATA_CHANGE_EVENT } from './subscriberTelemetry';
import { getAnalyticsDataEventName } from './adminAnalytics';
import { readAppSetting, writeAppSetting } from './supabaseSettings';
import { emitBrowserEvent } from './supabase';

export type AdminNotificationTone =
  | 'blue'
  | 'orange'
  | 'emerald'
  | 'rose'
  | 'violet'
  | 'slate';

export type AdminNotificationKind =
  | 'order'
  | 'subscriber'
  | 'finance'
  | 'product'
  | 'activity';

export interface AdminNotificationItem {
  id: string;
  kind: AdminNotificationKind;
  tone: AdminNotificationTone;
  title: string;
  message: string;
  createdAt: string;
  href: string;
  ctaLabel: string;
  unread: boolean;
}

export interface AdminNotificationSnapshot {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  totalCount: number;
}

const ADMIN_NOTIFICATION_READS_KEY = 'admin_notification_reads';
export const ADMIN_NOTIFICATIONS_CHANGE_EVENT = 'cloudmarket-admin-notifications-change';

function emitNotificationsChange() {
  emitBrowserEvent(ADMIN_NOTIFICATIONS_CHANGE_EVENT);
}

function isSameLocalDay(dateValue: string, target: Date) {
  const sourceDate = new Date(dateValue);

  return (
    sourceDate.getFullYear() === target.getFullYear() &&
    sourceDate.getMonth() === target.getMonth() &&
    sourceDate.getDate() === target.getDate()
  );
}

function notificationId(prefix: string, value: string) {
  return `${prefix}-${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

async function readReadIds() {
  return readAppSetting<string[]>(ADMIN_NOTIFICATION_READS_KEY, []);
}

async function writeReadIds(ids: string[]) {
  await writeAppSetting(ADMIN_NOTIFICATION_READS_KEY, ids);
  emitNotificationsChange();
}

export async function markNotificationRead(id: string) {
  const readIds = new Set(await readReadIds());
  readIds.add(id);
  await writeReadIds(Array.from(readIds));
}

export async function markAllNotificationsRead(ids: string[]) {
  const readIds = new Set(await readReadIds());
  ids.forEach((id) => readIds.add(id));
  await writeReadIds(Array.from(readIds));
}

export async function clearAdminNotificationReads() {
  await writeReadIds([]);
}

export function getAdminNotificationEventNames() {
  return [
    ADMIN_ORDERS_DATA_CHANGE_EVENT,
    ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT,
    FINANCE_DATA_CHANGE_EVENT,
    SUBSCRIBER_DATA_CHANGE_EVENT,
    ADMIN_NOTIFICATIONS_CHANGE_EVENT,
    getAnalyticsDataEventName(),
  ];
}

export async function readAdminNotificationsSnapshot(): Promise<AdminNotificationSnapshot> {
  const today = new Date();
  await Promise.all([ensureAdminOrdersLoaded(), ensureAdminProductDraftsLoaded()]);
  const [subscriberSnapshot, financeSnapshot, readIdsArray] = await Promise.all([
    readAdminSubscribersSnapshot(),
    readFinanceSnapshot(),
    readReadIds(),
  ]);
  const orders = readAdminOrders();
  const drafts = readAdminProductDrafts();
  const readIds = new Set(readIdsArray);

  const notifications: Omit<AdminNotificationItem, 'unread'>[] = [
    ...orders
      .filter((order) => order.status === 'new')
      .slice(0, 8)
      .map((order) => ({
        id: notificationId('order-new', order.orderNumber),
        kind: 'order' as const,
        tone: 'blue' as const,
        title: `New order ${order.orderNumber}`,
        message: `${order.customerName} ordered ${order.packageTitle} for ${order.productName}.`,
        createdAt: order.createdAt,
        href: '/admin/orders',
        ctaLabel: 'Open order',
      })),
    ...orders
      .filter(
        (order) =>
          order.status !== 'new' &&
          (typeof order.expenseAmount !== 'number' || order.expenseAmount < 0),
      )
      .slice(0, 6)
      .map((order) => ({
        id: notificationId('order-expense', order.orderNumber),
        kind: 'order' as const,
        tone: 'orange' as const,
        title: `Expense needed for ${order.orderNumber}`,
        message: `${order.productName} is marked ${order.status} but still has no recorded order expense.`,
        createdAt: order.updatedAt || order.createdAt,
        href: '/admin/orders',
        ctaLabel: 'Record expense',
      })),
    ...subscriberSnapshot.subscribers
      .filter((subscriber) => isSameLocalDay(subscriber.record.createdAt, today))
      .slice(0, 6)
      .map((subscriber) => ({
        id: notificationId('subscriber-new', subscriber.record.token),
        kind: 'subscriber' as const,
        tone: 'emerald' as const,
        title: `New subscriber ${subscriber.record.fullName || subscriber.record.email}`,
        message: `${subscriber.record.email} joined the list from ${subscriber.sourceProductName || 'the storefront'}.`,
        createdAt: subscriber.record.createdAt,
        href: '/admin/subscribers',
        ctaLabel: 'View subscriber',
      })),
    ...subscriberSnapshot.todayActivities
      .filter(
        (activity) =>
          activity.type === 'token_redeemed' ||
          activity.type === 'token_lookup' ||
          activity.type === 'order_submitted',
      )
      .slice(0, 8)
      .map((activity) => ({
        id: notificationId('subscriber-activity', activity.id),
        kind: 'activity' as const,
        tone: activity.type === 'order_submitted' ? ('blue' as const) : ('violet' as const),
        title:
          activity.type === 'order_submitted'
            ? 'Subscriber order submitted'
            : activity.type === 'token_redeemed'
              ? 'Discount token redeemed'
              : 'Subscriber recovered a token',
        message:
          activity.type === 'order_submitted'
            ? `${activity.fullName || activity.email} submitted an order for ${activity.productName || 'a product'}.`
            : activity.type === 'token_redeemed'
              ? `${activity.fullName || activity.email} used a subscriber discount on ${activity.productName || 'a product'}.`
              : `${activity.fullName || activity.email} checked their subscriber token again.`,
        createdAt: activity.createdAt,
        href: '/admin/subscribers',
        ctaLabel: 'Open subscribers',
      })),
    ...financeSnapshot.alerts.map((alert) => ({
      id: notificationId('finance-alert', alert),
      kind: 'finance' as const,
      tone: 'rose' as const,
      title: 'Finance alert',
      message: alert,
      createdAt: financeSnapshot.orders[0]?.updatedAt || new Date().toISOString(),
      href: '/admin/finance',
      ctaLabel: 'Open finance',
    })),
    ...(drafts.filter((draft) => draft.status === 'draft').length > 0
      ? [
          {
            id: notificationId(
              'product-drafts',
              String(drafts.filter((draft) => draft.status === 'draft').length),
            ),
            kind: 'product' as const,
            tone: 'slate' as const,
            title: 'Draft product pages waiting',
            message: `${drafts.filter((draft) => draft.status === 'draft').length} draft page(s) are still private and not yet on the homepage.`,
            createdAt:
              drafts
                .filter((draft) => draft.status === 'draft')
                .sort(
                  (left, right) =>
                    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
                )[0]?.updatedAt || new Date().toISOString(),
            href: '/admin/products',
            ctaLabel: 'Manage drafts',
          },
        ]
      : []),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 30);

  const finalizedNotifications = notifications.map((item) => ({
    ...item,
    unread: !readIds.has(item.id),
  }));

  return {
    notifications: finalizedNotifications,
    unreadCount: finalizedNotifications.filter((item) => item.unread).length,
    totalCount: finalizedNotifications.length,
  };
}
