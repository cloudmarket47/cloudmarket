import type { CustomerTokenRecord } from '../types';
import {
  emitSubscriberDataChange,
  setActiveSubscriberSession,
  trackSubscriberActivity,
} from './subscriberTelemetry';
import { submitSubscriptionToNetlifyForm } from './netlifyOrders';
import { getSupabaseClient, getSupabaseTableName } from './supabase';

const TOKEN_DISCOUNT_PERCENTAGE = 10;
const TOKEN_MAX_ORDERS = 5;

interface SupabaseTokenRow {
  email: string;
  token: string;
  discount_percentage: number;
  remaining_uses: number;
  created_at: string;
  order_numbers?: string[] | null;
  full_name?: string | null;
  gender?: string | null;
  location?: string | null;
  source_product_slug?: string | null;
  source_product_name?: string | null;
  source_page_url?: string | null;
}

interface CreateCustomerDiscountTokenInput {
  email: string;
  fullName: string;
  gender: string;
  location: string;
  sourceProductSlug?: string;
  sourceProductName?: string;
  sourcePageUrl?: string;
}

let customerTokensCache: CustomerTokenRecord[] = [];
let customerTokensLoaded = false;
let customerTokensRequest: Promise<CustomerTokenRecord[]> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeNameForMatch(name: string) {
  return normalizeName(name).toLowerCase();
}

function normalizeGender(gender: string) {
  return gender.trim();
}

function normalizeLocation(location: string) {
  return location.trim().replace(/\s+/g, ' ');
}

function normalizeToken(token: string) {
  return token.trim().toUpperCase();
}

function generateTokenValue() {
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `CM-${randomPart}`;
}

function mapTokenRecord(row: SupabaseTokenRow): CustomerTokenRecord {
  return {
    email: normalizeEmail(row.email),
    fullName: normalizeName(row.full_name ?? ''),
    gender: normalizeGender(row.gender ?? ''),
    location: normalizeLocation(row.location ?? ''),
    token: normalizeToken(row.token),
    discountPercentage: row.discount_percentage,
    remainingUses: row.remaining_uses,
    createdAt: row.created_at,
    orderNumbers: row.order_numbers ?? [],
    sourceProductSlug: row.source_product_slug ?? undefined,
    sourceProductName: row.source_product_name ?? undefined,
    sourcePageUrl: row.source_page_url ?? undefined,
    source: 'supabase',
  };
}

function toTokenRow(record: CustomerTokenRecord): SupabaseTokenRow {
  return {
    email: record.email,
    full_name: record.fullName,
    gender: record.gender,
    location: record.location,
    token: record.token,
    discount_percentage: record.discountPercentage,
    remaining_uses: record.remainingUses,
    created_at: record.createdAt,
    order_numbers: record.orderNumbers,
    source_product_slug: record.sourceProductSlug,
    source_product_name: record.sourceProductName,
    source_page_url: record.sourcePageUrl,
  };
}

function upsertCachedToken(record: CustomerTokenRecord) {
  const existingIndex = customerTokensCache.findIndex(
    (item) => item.token === record.token || item.email === record.email,
  );

  if (existingIndex >= 0) {
    customerTokensCache[existingIndex] = record;
  } else {
    customerTokensCache = [record, ...customerTokensCache];
  }

  customerTokensLoaded = true;
  emitSubscriberDataChange();
  return record;
}

async function persistTokenRecord(record: CustomerTokenRecord) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from(getSupabaseTableName('customerTokens'))
    .upsert(toTokenRow(record), { onConflict: 'email' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to save customer token.');
  }

  return upsertCachedToken(mapTokenRecord(data as SupabaseTokenRow));
}

async function updateTokenRecordByToken(
  token: string,
  patch: Partial<SupabaseTokenRow>,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from(getSupabaseTableName('customerTokens'))
    .update(patch)
    .eq('token', normalizeToken(token))
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to update customer token.');
  }

  return upsertCachedToken(mapTokenRecord(data as SupabaseTokenRow));
}

async function generateUniqueTokenValue() {
  await ensureCustomerTokensLoaded();
  const existingTokens = new Set(customerTokensCache.map((record) => record.token));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateTokenValue();

    if (!existingTokens.has(candidate)) {
      return candidate;
    }
  }

  return `CM-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export async function ensureCustomerTokensLoaded(force = false) {
  if (customerTokensLoaded && !force) {
    return customerTokensCache;
  }

  if (customerTokensRequest && !force) {
    return customerTokensRequest;
  }

  customerTokensRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      customerTokensCache = [];
      customerTokensLoaded = true;
      emitSubscriberDataChange();
      return customerTokensCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('customerTokens'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load customer tokens.');
    }

    customerTokensCache = ((data ?? []) as SupabaseTokenRow[]).map(mapTokenRecord);
    customerTokensLoaded = true;
    emitSubscriberDataChange();
    return customerTokensCache;
  })();

  try {
    return await customerTokensRequest;
  } finally {
    customerTokensRequest = null;
  }
}

function findTokenByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return customerTokensCache.find((record) => normalizeEmail(record.email) === normalizedEmail) ?? null;
}

function findTokenByIdentity(fullName: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeNameForMatch(fullName);

  return (
    customerTokensCache.find((record) => {
      if (normalizeEmail(record.email) !== normalizedEmail) {
        return false;
      }

      if (!record.fullName.trim()) {
        return true;
      }

      return normalizeNameForMatch(record.fullName) === normalizedName;
    }) ?? null
  );
}

function findTokenByValue(token: string) {
  const normalizedToken = normalizeToken(token);
  return customerTokensCache.find((record) => normalizeToken(record.token) === normalizedToken) ?? null;
}

export async function createCustomerDiscountToken({
  email,
  fullName,
  gender,
  location,
  sourceProductSlug,
  sourceProductName,
  sourcePageUrl,
}: CreateCustomerDiscountTokenInput) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = normalizeName(fullName);
  const normalizedGender = normalizeGender(gender);
  const normalizedLocation = normalizeLocation(location);

  if (!normalizedEmail || !normalizedFullName || !normalizedGender || !normalizedLocation) {
    throw new Error('Name, gender, location, and email are required.');
  }

  await ensureCustomerTokensLoaded();
  const existingRecord =
    findTokenByIdentity(normalizedFullName, normalizedEmail) ?? findTokenByEmail(normalizedEmail);

  if (existingRecord) {
    const hydratedRecord = await persistTokenRecord({
      ...existingRecord,
      fullName: existingRecord.fullName || normalizedFullName,
      gender: existingRecord.gender || normalizedGender,
      location: existingRecord.location || normalizedLocation,
      sourceProductSlug: existingRecord.sourceProductSlug || sourceProductSlug,
      sourceProductName: existingRecord.sourceProductName || sourceProductName,
      sourcePageUrl: existingRecord.sourcePageUrl || sourcePageUrl,
    });

    setActiveSubscriberSession(hydratedRecord);
    trackSubscriberActivity({
      type: 'subscription_created',
      token: hydratedRecord.token,
      email: hydratedRecord.email,
      fullName: hydratedRecord.fullName,
      productSlug: sourceProductSlug,
      productName: sourceProductName,
      pagePath: sourcePageUrl,
    });
    return hydratedRecord;
  }

  const nextRecord: CustomerTokenRecord = {
    email: normalizedEmail,
    fullName: normalizedFullName,
    gender: normalizedGender,
    location: normalizedLocation,
    token: await generateUniqueTokenValue(),
    discountPercentage: TOKEN_DISCOUNT_PERCENTAGE,
    remainingUses: TOKEN_MAX_ORDERS,
    createdAt: new Date().toISOString(),
    orderNumbers: [],
    sourceProductSlug,
    sourceProductName,
    sourcePageUrl,
    source: 'supabase',
  };

  const savedRecord = await persistTokenRecord(nextRecord);
  setActiveSubscriberSession(savedRecord);
  trackSubscriberActivity({
    type: 'subscription_created',
    token: savedRecord.token,
    email: savedRecord.email,
    fullName: savedRecord.fullName,
    productSlug: sourceProductSlug,
    productName: sourceProductName,
    pagePath: sourcePageUrl,
  });
  await submitSubscriptionToNetlifyForm({
    fullName: savedRecord.fullName,
    email: savedRecord.email,
    gender: savedRecord.gender,
    location: savedRecord.location,
    token: savedRecord.token,
    sourceProductName: savedRecord.sourceProductName,
    sourceProductSlug: savedRecord.sourceProductSlug,
    sourcePageUrl: savedRecord.sourcePageUrl,
  }).catch(() => undefined);

  return savedRecord;
}

export async function findCustomerDiscountTokenByIdentity(fullName: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = normalizeName(fullName);

  if (!normalizedEmail || !normalizedFullName) {
    return {
      isFound: false,
      record: null,
      message: 'Enter the full name and email used during subscription.',
    };
  }

  await ensureCustomerTokensLoaded();
  const record = findTokenByIdentity(normalizedFullName, normalizedEmail);

  if (!record) {
    return {
      isFound: false,
      record: null,
      message: 'We could not find a subscriber token for that name and email combination.',
    };
  }

  setActiveSubscriberSession(record);
  trackSubscriberActivity({
    type: 'token_lookup',
    token: record.token,
    email: record.email,
    fullName: record.fullName,
    productSlug: record.sourceProductSlug,
    productName: record.sourceProductName,
    pagePath: record.sourcePageUrl,
  });

  return {
    isFound: true,
    record,
    message: `Token found. ${record.remainingUses} discounted order(s) remaining.`,
  };
}

export async function validateCustomerDiscountToken(token: string) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    return {
      isValid: false,
      record: null,
      message: 'Enter a token before applying the discount.',
    };
  }

  await ensureCustomerTokensLoaded();
  const record = findTokenByValue(normalizedToken);

  if (!record) {
    return {
      isValid: false,
      record: null,
      message: 'This token is invalid or no longer available.',
    };
  }

  if (record.remainingUses <= 0) {
    return {
      isValid: false,
      record,
      message: 'This token has already used all available discounted orders.',
    };
  }

  setActiveSubscriberSession(record);

  return {
    isValid: true,
    record,
    message: `${record.discountPercentage}% discount applied to this order.`,
  };
}

export async function redeemCustomerDiscountToken(
  token: string,
  orderNumber: string,
  activityContext?: {
    productId?: string;
    productSlug?: string;
    productName?: string;
    packageTitle?: string;
    amount?: number;
    pagePath?: string;
  },
) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    return null;
  }

  await ensureCustomerTokensLoaded();
  const currentRecord = findTokenByValue(normalizedToken);

  if (!currentRecord || currentRecord.remainingUses <= 0) {
    return null;
  }

  const nextRecord = await updateTokenRecordByToken(normalizedToken, {
    remaining_uses: Math.max(0, currentRecord.remainingUses - 1),
    order_numbers: Array.from(new Set([...currentRecord.orderNumbers, orderNumber])),
  });

  setActiveSubscriberSession(nextRecord);
  trackSubscriberActivity({
    type: 'token_redeemed',
    token: nextRecord.token,
    email: nextRecord.email,
    fullName: nextRecord.fullName,
    orderNumber,
    productId: activityContext?.productId,
    productSlug: activityContext?.productSlug,
    productName: activityContext?.productName,
    packageTitle: activityContext?.packageTitle,
    amount: activityContext?.amount ?? null,
    pagePath: activityContext?.pagePath,
  });

  return nextRecord;
}

export async function listCustomerDiscountTokens() {
  await ensureCustomerTokensLoaded();
  return customerTokensCache;
}
