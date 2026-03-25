import type { CustomerTokenRecord } from '../types';
import {
  ensureAdminOrdersLoaded,
  readAdminOrders,
  type AdminManagedOrder,
} from './adminOrders';
import { ensureCustomerTokensLoaded, listCustomerDiscountTokens } from './customerTokens';
import {
  readSubscriberActivityRecords,
  readSubscriberManagementRecords,
  type SubscriberActivityRecord,
  type SubscriberLifecycleStatus,
} from './subscriberTelemetry';

export type SubscriberSegment = 'new' | 'returning' | 'token-user' | 'high-value';

export interface AdminSubscriberProfile {
  record: CustomerTokenRecord;
  status: SubscriberLifecycleStatus;
  segment: SubscriberSegment;
  totalOrders: number;
  discountedOrders: number;
  totalSpent: number;
  totalDiscountSaved: number;
  activityCount: number;
  lastActiveAt: string;
  lastOrderAt: string;
  lastVisitedPath: string;
  lastProductViewed: string;
  sourceProductName: string;
  sourceProductSlug: string;
  recentActivity: SubscriberActivityRecord[];
  matchedOrders: AdminManagedOrder[];
  usedProducts: string[];
  isReturningCustomer: boolean;
  notes: string;
}

export interface AdminSubscriberSnapshot {
  subscribers: AdminSubscriberProfile[];
  todayActivities: SubscriberActivityRecord[];
  metrics: {
    totalSubscribers: number;
    activeToday: number;
    returningCustomers: number;
    tokenUsers: number;
    totalEmailList: number;
    newToday: number;
    subscriberRevenue: number;
  };
}

function normalizeToken(token?: string | null) {
  return token?.trim().toUpperCase() ?? '';
}

function isSameLocalDay(dateValue: string, target: Date) {
  const sourceDate = new Date(dateValue);

  return (
    sourceDate.getFullYear() === target.getFullYear() &&
    sourceDate.getMonth() === target.getMonth() &&
    sourceDate.getDate() === target.getDate()
  );
}

function deriveStatus({
  manualStatus,
  totalOrders,
  totalSpent,
}: {
  manualStatus?: SubscriberLifecycleStatus;
  totalOrders: number;
  totalSpent: number;
}) {
  if (manualStatus) {
    return manualStatus;
  }

  if (totalOrders >= 3 || totalSpent >= 150000) {
    return 'vip' satisfies SubscriberLifecycleStatus;
  }

  return 'active' satisfies SubscriberLifecycleStatus;
}

function deriveSegment({
  totalOrders,
  discountedOrders,
  totalSpent,
}: {
  totalOrders: number;
  discountedOrders: number;
  totalSpent: number;
}) {
  if (totalOrders >= 3 || totalSpent >= 150000) {
    return 'high-value' satisfies SubscriberSegment;
  }

  if (totalOrders > 1) {
    return 'returning' satisfies SubscriberSegment;
  }

  if (discountedOrders > 0) {
    return 'token-user' satisfies SubscriberSegment;
  }

  return 'new' satisfies SubscriberSegment;
}

function getLastActivityDate({
  createdAt,
  activity,
  lastOrderAt,
}: {
  createdAt: string;
  activity?: SubscriberActivityRecord;
  lastOrderAt?: string;
}) {
  const timestamps = [createdAt, activity?.createdAt, lastOrderAt].filter(
    (value): value is string => Boolean(value),
  );

  return timestamps.sort(
    (left, right) => new Date(right).getTime() - new Date(left).getTime(),
  )[0] ?? createdAt;
}

function buildUsedProducts(orders: AdminManagedOrder[], activities: SubscriberActivityRecord[]) {
  const collection = new Set<string>();

  orders.forEach((order) => {
    if (order.productName.trim()) {
      collection.add(order.productName.trim());
    }
  });

  activities.forEach((activity) => {
    if (activity.productName.trim()) {
      collection.add(activity.productName.trim());
    }
  });

  return Array.from(collection);
}

export async function readAdminSubscribersSnapshot(): Promise<AdminSubscriberSnapshot> {
  await Promise.all([ensureCustomerTokensLoaded(), ensureAdminOrdersLoaded()]);
  const [tokenRecords, activityRecords, managementRecords] = await Promise.all([
    listCustomerDiscountTokens(),
    readSubscriberActivityRecords(),
    readSubscriberManagementRecords(),
  ]);
  const orders = readAdminOrders();
  const managementMap = new Map(managementRecords.map((record) => [record.token, record]));
  const today = new Date();

  const subscribers = tokenRecords
    .map((record) => {
      const normalizedToken = normalizeToken(record.token);
      const matchedOrders = orders
        .filter((order) => {
          const normalizedCustomerToken = normalizeToken(order.customerToken);
          return (
            normalizedCustomerToken === normalizedToken ||
            record.orderNumbers.includes(order.orderNumber)
          );
        })
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      const recentActivity = activityRecords
        .filter((activity) => normalizeToken(activity.token) === normalizedToken)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      const discountedOrders = matchedOrders.filter(
        (order) => normalizeToken(order.customerToken) === normalizedToken,
      );
      const totalSpent = matchedOrders.reduce((sum, order) => sum + order.finalAmount, 0);
      const totalDiscountSaved = matchedOrders.reduce((sum, order) => sum + order.discountAmount, 0);
      const lastProductActivity =
        recentActivity.find((activity) => activity.type === 'product_view' && activity.productName) ??
        recentActivity.find((activity) => activity.productName);
      const sourceActivity = recentActivity.find((activity) => activity.type === 'subscription_created');
      const managementRecord = managementMap.get(normalizedToken);
      const lastOrderAt = matchedOrders[0]?.createdAt ?? '';
      const status = deriveStatus({
        manualStatus: managementRecord?.status,
        totalOrders: matchedOrders.length,
        totalSpent,
      });

      return {
        record,
        status,
        segment: deriveSegment({
          totalOrders: matchedOrders.length,
          discountedOrders: discountedOrders.length,
          totalSpent,
        }),
        totalOrders: matchedOrders.length,
        discountedOrders: discountedOrders.length,
        totalSpent,
        totalDiscountSaved,
        activityCount: recentActivity.length,
        lastActiveAt: getLastActivityDate({
          createdAt: record.createdAt,
          activity: recentActivity[0],
          lastOrderAt,
        }),
        lastOrderAt,
        lastVisitedPath:
          recentActivity.find((activity) => activity.type === 'page_view')?.pagePath ?? '',
        lastProductViewed: lastProductActivity?.productName ?? matchedOrders[0]?.productName ?? '',
        sourceProductName:
          record.sourceProductName ?? sourceActivity?.productName ?? matchedOrders.at(-1)?.productName ?? '',
        sourceProductSlug:
          record.sourceProductSlug ?? sourceActivity?.productSlug ?? matchedOrders.at(-1)?.productSlug ?? '',
        recentActivity,
        matchedOrders,
        usedProducts: buildUsedProducts(matchedOrders, recentActivity),
        isReturningCustomer: matchedOrders.length > 1,
        notes: managementRecord?.notes ?? '',
      } satisfies AdminSubscriberProfile;
    })
    .sort((left, right) => new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime());

  const metrics = {
    totalSubscribers: subscribers.length,
    activeToday: subscribers.filter((subscriber) => isSameLocalDay(subscriber.lastActiveAt, today)).length,
    returningCustomers: subscribers.filter((subscriber) => subscriber.isReturningCustomer).length,
    tokenUsers: subscribers.filter((subscriber) => subscriber.discountedOrders > 0).length,
    totalEmailList: new Set(subscribers.map((subscriber) => subscriber.record.email)).size,
    newToday: subscribers.filter((subscriber) => isSameLocalDay(subscriber.record.createdAt, today)).length,
    subscriberRevenue: subscribers.reduce((sum, subscriber) => sum + subscriber.totalSpent, 0),
  };

  return {
    subscribers,
    todayActivities: activityRecords.filter((activity) => isSameLocalDay(activity.createdAt, today)),
    metrics,
  };
}

export function buildSubscribersCsv(subscribers: AdminSubscriberProfile[]) {
  const header = [
    'Full Name',
    'Email',
    'Token',
    'Status',
    'Segment',
    'Location',
    'Source Product',
    'Remaining Uses',
    'Total Orders',
    'Discounted Orders',
    'Total Spent',
    'Last Active',
  ];

  const rows = subscribers.map((subscriber) => [
    subscriber.record.fullName,
    subscriber.record.email,
    subscriber.record.token,
    subscriber.status,
    subscriber.segment,
    subscriber.record.location,
    subscriber.sourceProductName,
    String(subscriber.record.remainingUses),
    String(subscriber.totalOrders),
    String(subscriber.discountedOrders),
    String(subscriber.totalSpent),
    subscriber.lastActiveAt,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
}
