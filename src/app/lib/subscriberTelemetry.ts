import type { CustomerTokenRecord } from '../types';
import { readJsonCookie, removeCookie, writeJsonCookie } from './cookies';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';

const ACTIVE_SUBSCRIBER_COOKIE = 'cloudmarket_active_subscriber';
const DUPLICATE_ACTIVITY_WINDOW_MS = 8000;

export const SUBSCRIBER_DATA_CHANGE_EVENT = 'cloudmarket-subscriber-data-change';

export type SubscriberLifecycleStatus = 'active' | 'vip' | 'paused' | 'blocked';
export type SubscriberActivityType =
  | 'subscription_created'
  | 'token_lookup'
  | 'page_view'
  | 'product_view'
  | 'package_selected'
  | 'token_applied'
  | 'order_submitted'
  | 'token_redeemed';

export interface SubscriberActivityRecord {
  id: string;
  token: string;
  email: string;
  fullName: string;
  type: SubscriberActivityType;
  pagePath: string;
  productId: string;
  productSlug: string;
  productName: string;
  orderNumber: string;
  packageTitle: string;
  amount: number | null;
  createdAt: string;
  meta: Record<string, string | number | boolean | null>;
}

export interface SubscriberManagementRecord {
  token: string;
  status: SubscriberLifecycleStatus;
  notes: string;
  updatedAt: string;
}

interface SubscriberActivityRow {
  id: string;
  token: string;
  email: string;
  full_name: string;
  type: SubscriberActivityType;
  page_path: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  order_number: string;
  package_title: string;
  amount: number | null;
  created_at: string;
  meta: Record<string, string | number | boolean | null>;
}

interface SubscriberManagementRow {
  token: string;
  status: SubscriberLifecycleStatus;
  notes: string;
  updated_at: string;
}

interface ActiveSubscriberSession {
  token: string;
  email: string;
  fullName: string;
}

interface TrackSubscriberActivityInput {
  type: SubscriberActivityType;
  token?: string;
  email?: string;
  fullName?: string;
  pagePath?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  orderNumber?: string;
  packageTitle?: string;
  amount?: number | null;
  meta?: Record<string, string | number | boolean | null>;
}

let subscriberActivitiesCache: SubscriberActivityRecord[] = [];
let subscriberActivitiesLoaded = false;
let subscriberActivitiesRequest: Promise<SubscriberActivityRecord[]> | null = null;
let subscriberManagementCache: SubscriberManagementRecord[] = [];
let subscriberManagementLoaded = false;
let subscriberManagementRequest: Promise<SubscriberManagementRecord[]> | null = null;

function normalizeToken(token?: string | null) {
  return token?.trim().toUpperCase() ?? '';
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

function normalizeName(fullName?: string | null) {
  return fullName?.trim().replace(/\s+/g, ' ') ?? '';
}

function mapActivityRowToRecord(row: SubscriberActivityRow): SubscriberActivityRecord {
  return {
    id: row.id,
    token: normalizeToken(row.token),
    email: normalizeEmail(row.email),
    fullName: normalizeName(row.full_name),
    type: row.type,
    pagePath: row.page_path || '',
    productId: row.product_id || '',
    productSlug: row.product_slug || '',
    productName: row.product_name || '',
    orderNumber: row.order_number || '',
    packageTitle: row.package_title || '',
    amount: typeof row.amount === 'number' ? row.amount : null,
    createdAt: row.created_at,
    meta: row.meta ?? {},
  };
}

function toActivityRow(record: SubscriberActivityRecord): SubscriberActivityRow {
  return {
    id: record.id,
    token: record.token,
    email: record.email,
    full_name: record.fullName,
    type: record.type,
    page_path: record.pagePath,
    product_id: record.productId,
    product_slug: record.productSlug,
    product_name: record.productName,
    order_number: record.orderNumber,
    package_title: record.packageTitle,
    amount: record.amount,
    created_at: record.createdAt,
    meta: record.meta,
  };
}

function mapManagementRowToRecord(row: SubscriberManagementRow): SubscriberManagementRecord {
  return {
    token: normalizeToken(row.token),
    status:
      row.status === 'vip' || row.status === 'paused' || row.status === 'blocked'
        ? row.status
        : 'active',
    notes: row.notes ?? '',
    updatedAt: row.updated_at,
  };
}

function toManagementRow(record: SubscriberManagementRecord): SubscriberManagementRow {
  return {
    token: record.token,
    status: record.status,
    notes: record.notes,
    updated_at: record.updatedAt,
  };
}

function upsertActivityCache(record: SubscriberActivityRecord) {
  const existing = subscriberActivitiesCache[0];

  if (
    existing &&
    existing.token === record.token &&
    existing.type === record.type &&
    existing.pagePath === record.pagePath &&
    existing.productSlug === record.productSlug &&
    existing.orderNumber === record.orderNumber &&
    Date.now() - new Date(existing.createdAt).getTime() < DUPLICATE_ACTIVITY_WINDOW_MS
  ) {
    return existing;
  }

  subscriberActivitiesCache = [record, ...subscriberActivitiesCache].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  subscriberActivitiesLoaded = true;
  emitSubscriberDataChange();
  return record;
}

function upsertManagementCache(record: SubscriberManagementRecord) {
  const existingIndex = subscriberManagementCache.findIndex(
    (item) => item.token === record.token,
  );

  if (existingIndex >= 0) {
    subscriberManagementCache[existingIndex] = record;
  } else {
    subscriberManagementCache = [record, ...subscriberManagementCache];
  }

  subscriberManagementLoaded = true;
  emitSubscriberDataChange();
  return record;
}

async function persistActivityRecord(record: SubscriberActivityRecord) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return record;
  }

  const { error } = await supabase
    .from(getSupabaseTableName('subscriberActivities'))
    .upsert(toActivityRow(record), { onConflict: 'id' });

  if (error) {
    throw new Error(error.message || 'Unable to save subscriber activity.');
  }

  return record;
}

async function persistManagementRecord(record: SubscriberManagementRecord) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return record;
  }

  const { error } = await supabase
    .from(getSupabaseTableName('subscriberManagement'))
    .upsert(toManagementRow(record), { onConflict: 'token' });

  if (error) {
    throw new Error(error.message || 'Unable to save subscriber management data.');
  }

  return record;
}

export function emitSubscriberDataChange() {
  emitBrowserEvent(SUBSCRIBER_DATA_CHANGE_EVENT);
}

export function readActiveSubscriberSession() {
  return readJsonCookie<ActiveSubscriberSession>(ACTIVE_SUBSCRIBER_COOKIE);
}

export function clearActiveSubscriberSession() {
  removeCookie(ACTIVE_SUBSCRIBER_COOKIE);
  emitSubscriberDataChange();
}

export function setActiveSubscriberSession(
  record: Pick<CustomerTokenRecord, 'token' | 'email' | 'fullName'>,
) {
  const normalizedToken = normalizeToken(record.token);
  const normalizedEmail = normalizeEmail(record.email);

  if (!normalizedToken || !normalizedEmail) {
    return;
  }

  writeJsonCookie(
    ACTIVE_SUBSCRIBER_COOKIE,
    {
      token: normalizedToken,
      email: normalizedEmail,
      fullName: normalizeName(record.fullName),
    } satisfies ActiveSubscriberSession,
    { maxAgeSeconds: 60 * 60 * 24 * 30 },
  );
  emitSubscriberDataChange();
}

export async function readSubscriberActivityRecords() {
  if (subscriberActivitiesLoaded) {
    return subscriberActivitiesCache;
  }

  if (subscriberActivitiesRequest) {
    return subscriberActivitiesRequest;
  }

  subscriberActivitiesRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      subscriberActivitiesCache = [];
      subscriberActivitiesLoaded = true;
      emitSubscriberDataChange();
      return subscriberActivitiesCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('subscriberActivities'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load subscriber activity.');
    }

    subscriberActivitiesCache = ((data ?? []) as SubscriberActivityRow[]).map(
      mapActivityRowToRecord,
    );
    subscriberActivitiesLoaded = true;
    emitSubscriberDataChange();
    return subscriberActivitiesCache;
  })();

  try {
    return await subscriberActivitiesRequest;
  } finally {
    subscriberActivitiesRequest = null;
  }
}

export async function readSubscriberManagementRecords() {
  if (subscriberManagementLoaded) {
    return subscriberManagementCache;
  }

  if (subscriberManagementRequest) {
    return subscriberManagementRequest;
  }

  subscriberManagementRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      subscriberManagementCache = [];
      subscriberManagementLoaded = true;
      emitSubscriberDataChange();
      return subscriberManagementCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('subscriberManagement'))
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load subscriber management records.');
    }

    subscriberManagementCache = ((data ?? []) as SubscriberManagementRow[]).map(
      mapManagementRowToRecord,
    );
    subscriberManagementLoaded = true;
    emitSubscriberDataChange();
    return subscriberManagementCache;
  })();

  try {
    return await subscriberManagementRequest;
  } finally {
    subscriberManagementRequest = null;
  }
}

export async function updateSubscriberManagementRecord(
  token: string,
  update: {
    status: SubscriberLifecycleStatus;
    notes?: string;
  },
) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    return null;
  }

  const nextRecord = upsertManagementCache({
    token: normalizedToken,
    status: update.status,
    notes: update.notes?.trim() ?? '',
    updatedAt: new Date().toISOString(),
  });

  await persistManagementRecord(nextRecord);
  return nextRecord;
}

function resolveSubscriberSession(input: TrackSubscriberActivityInput) {
  const normalizedToken = normalizeToken(input.token);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedFullName = normalizeName(input.fullName);

  if (normalizedToken && normalizedEmail) {
    return {
      token: normalizedToken,
      email: normalizedEmail,
      fullName: normalizedFullName,
    } satisfies ActiveSubscriberSession;
  }

  const activeSession = readActiveSubscriberSession();

  if (!activeSession) {
    return null;
  }

  return {
    token: normalizedToken || activeSession.token,
    email: normalizedEmail || activeSession.email,
    fullName: normalizedFullName || activeSession.fullName,
  } satisfies ActiveSubscriberSession;
}

export function trackSubscriberActivity(input: TrackSubscriberActivityInput) {
  const resolvedSession = resolveSubscriberSession(input);

  if (!resolvedSession) {
    return null;
  }

  const nextRecord = upsertActivityCache({
    id: `sub-${Math.random().toString(36).slice(2, 10)}`,
    token: resolvedSession.token,
    email: resolvedSession.email,
    fullName: resolvedSession.fullName,
    type: input.type,
    pagePath: input.pagePath ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    productId: input.productId?.trim() ?? '',
    productSlug: input.productSlug?.trim() ?? '',
    productName: input.productName?.trim() ?? '',
    orderNumber: input.orderNumber?.trim() ?? '',
    packageTitle: input.packageTitle?.trim() ?? '',
    amount: typeof input.amount === 'number' ? input.amount : null,
    createdAt: new Date().toISOString(),
    meta: input.meta ?? {},
  });

  void persistActivityRecord(nextRecord).catch(() => undefined);
  return nextRecord;
}

export function formatSubscriberActivityLabel(activity: SubscriberActivityRecord) {
  switch (activity.type) {
    case 'subscription_created':
      return 'Subscribed';
    case 'token_lookup':
      return 'Recovered token';
    case 'product_view':
      return 'Viewed product';
    case 'package_selected':
      return 'Selected package';
    case 'token_applied':
      return 'Applied token';
    case 'order_submitted':
      return 'Submitted order';
    case 'token_redeemed':
      return 'Used token discount';
    default:
      return 'Visited page';
  }
}
