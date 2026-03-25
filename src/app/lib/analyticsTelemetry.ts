import { readCountryCookie, type SupportedCountryCode } from './localeData';
import { readCookie, readJsonCookie, writeCookie, writeJsonCookie } from './cookies';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';

const ANALYTICS_SESSION_COOKIE = 'cloudmarket_analytics_session';
const ANALYTICS_VISITOR_COOKIE = 'cloudmarket_analytics_visitor';
const ANALYTICS_DATA_CHANGE_EVENT = 'cloudmarket-analytics-data-change';
const DUPLICATE_WINDOW_MS = 1200;

export type AnalyticsEventType =
  | 'session_start'
  | 'page_view'
  | 'product_view'
  | 'button_click'
  | 'search_query'
  | 'checkout_open'
  | 'package_select'
  | 'form_submit'
  | 'share_action';

export type AnalyticsSourceType =
  | 'direct'
  | 'social'
  | 'search'
  | 'referral'
  | 'campaign'
  | 'internal';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  createdAt: string;
  visitorId: string;
  sessionId: string;
  countryCode: SupportedCountryCode;
  pagePath: string;
  pageType: 'storefront' | 'marketplace' | 'product' | 'thank-you' | 'other';
  sourceType: AnalyticsSourceType;
  sourcePlatform: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  productId: string;
  productSlug: string;
  productName: string;
  buttonId: string;
  buttonLabel: string;
  searchQuery: string;
  resultsCount: number | null;
  orderNumber: string;
  amount: number | null;
  metadata: Record<string, string | number | boolean | null>;
}

interface AnalyticsEventRow {
  id: string;
  type: AnalyticsEventType;
  created_at: string;
  visitor_id: string;
  session_id: string;
  country_code: SupportedCountryCode;
  page_path: string;
  page_type: AnalyticsEvent['pageType'];
  source_type: AnalyticsSourceType;
  source_platform: string;
  referrer_host: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  button_id: string;
  button_label: string;
  search_query: string;
  results_count: number | null;
  order_number: string;
  amount: number | null;
  metadata: Record<string, string | number | boolean | null>;
}

interface AnalyticsSession {
  id: string;
  visitorId: string;
  createdAt: string;
  landingPath: string;
  sourceType: AnalyticsSourceType;
  sourcePlatform: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

interface TrackAnalyticsEventInput {
  type: AnalyticsEventType;
  pagePath?: string;
  pageType?: AnalyticsEvent['pageType'];
  productId?: string;
  productSlug?: string;
  productName?: string;
  buttonId?: string;
  buttonLabel?: string;
  searchQuery?: string;
  resultsCount?: number | null;
  orderNumber?: string;
  amount?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
}

const SOURCE_PLATFORM_MAP: Array<{
  match: RegExp;
  platform: string;
  type: AnalyticsSourceType;
}> = [
  { match: /facebook|fbclid|l\.facebook/i, platform: 'Facebook', type: 'social' },
  { match: /instagram/i, platform: 'Instagram', type: 'social' },
  { match: /tiktok|ttclid/i, platform: 'TikTok', type: 'social' },
  { match: /twitter|x\.com|t\.co/i, platform: 'X', type: 'social' },
  { match: /youtube|youtu\.be/i, platform: 'YouTube', type: 'social' },
  { match: /linkedin/i, platform: 'LinkedIn', type: 'social' },
  { match: /snapchat/i, platform: 'Snapchat', type: 'social' },
  { match: /pinterest/i, platform: 'Pinterest', type: 'social' },
  { match: /telegram|t\.me/i, platform: 'Telegram', type: 'social' },
  { match: /whatsapp|wa\.me/i, platform: 'WhatsApp', type: 'social' },
  { match: /google|gclid|googleadservices/i, platform: 'Google', type: 'search' },
  { match: /bing/i, platform: 'Bing', type: 'search' },
  { match: /yahoo/i, platform: 'Yahoo', type: 'search' },
];

let analyticsEventsCache: AnalyticsEvent[] = [];
let analyticsEventsLoaded = false;
let analyticsEventsRequest: Promise<AnalyticsEvent[]> | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function createAnalyticsId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function classifyPageType(pagePath: string): AnalyticsEvent['pageType'] {
  if (pagePath === '/') {
    return 'marketplace';
  }

  if (pagePath.startsWith('/product/')) {
    return 'product';
  }

  if (pagePath.startsWith('/thank-you')) {
    return 'thank-you';
  }

  return 'storefront';
}

function emitAnalyticsDataChange() {
  emitBrowserEvent(ANALYTICS_DATA_CHANGE_EVENT);
}

function normalizePath(path?: string) {
  if (!path) {
    if (!isBrowser()) {
      return '/';
    }

    return `${window.location.pathname}${window.location.search}`;
  }

  return path;
}

function normalizeCountryCode() {
  return readCountryCookie();
}

function getPersistentVisitorId() {
  if (!isBrowser()) {
    return 'visitor-ssr';
  }

  const storedVisitorId = readCookie(ANALYTICS_VISITOR_COOKIE);

  if (storedVisitorId) {
    return storedVisitorId;
  }

  const visitorId = createAnalyticsId('visitor');
  writeCookie(ANALYTICS_VISITOR_COOKIE, visitorId, { maxAgeSeconds: 60 * 60 * 24 * 365 });
  return visitorId;
}

function getSourceFromReference(rawValue: string) {
  const normalizedValue = rawValue.trim().toLowerCase();

  if (!normalizedValue) {
    return {
      sourcePlatform: 'Direct',
      sourceType: 'direct' as AnalyticsSourceType,
    };
  }

  const matchedSource = SOURCE_PLATFORM_MAP.find((source) => source.match.test(normalizedValue));

  if (matchedSource) {
    return {
      sourcePlatform: matchedSource.platform,
      sourceType: matchedSource.type,
    };
  }

  return {
    sourcePlatform: normalizedValue.replace(/^https?:\/\//, '').split('/')[0] || 'Referral',
    sourceType: 'referral' as AnalyticsSourceType,
  };
}

function resolveSessionSource() {
  if (!isBrowser()) {
    return {
      sourcePlatform: 'Direct',
      sourceType: 'direct' as AnalyticsSourceType,
      referrerHost: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    };
  }

  const url = new URL(window.location.href);
  const utmSource = url.searchParams.get('utm_source')?.trim() ?? '';
  const utmMedium = url.searchParams.get('utm_medium')?.trim() ?? '';
  const utmCampaign = url.searchParams.get('utm_campaign')?.trim() ?? '';

  if (utmSource) {
    const source = getSourceFromReference(utmSource);

    return {
      sourcePlatform: source.sourcePlatform,
      sourceType: utmMedium ? 'campaign' : source.sourceType,
      referrerHost: '',
      utmSource,
      utmMedium,
      utmCampaign,
    };
  }

  const hasGoogleClickId = url.searchParams.has('gclid');
  const hasFacebookClickId = url.searchParams.has('fbclid');
  const hasTikTokClickId = url.searchParams.has('ttclid');

  if (hasGoogleClickId || hasFacebookClickId || hasTikTokClickId) {
    const source = hasGoogleClickId
      ? { sourcePlatform: 'Google Ads', sourceType: 'campaign' as AnalyticsSourceType }
      : hasFacebookClickId
        ? { sourcePlatform: 'Facebook Ads', sourceType: 'campaign' as AnalyticsSourceType }
        : { sourcePlatform: 'TikTok Ads', sourceType: 'campaign' as AnalyticsSourceType };

    return {
      ...source,
      referrerHost: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    };
  }

  const documentReferrer = document.referrer;

  if (!documentReferrer) {
    return {
      sourcePlatform: 'Direct',
      sourceType: 'direct' as AnalyticsSourceType,
      referrerHost: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    };
  }

  try {
    const referrerUrl = new URL(documentReferrer);

    if (referrerUrl.origin === window.location.origin) {
      return {
        sourcePlatform: 'Internal',
        sourceType: 'internal' as AnalyticsSourceType,
        referrerHost: referrerUrl.host,
        utmSource: '',
        utmMedium: '',
        utmCampaign: '',
      };
    }

    const source = getSourceFromReference(referrerUrl.host);

    return {
      sourcePlatform: source.sourcePlatform,
      sourceType: source.sourceType,
      referrerHost: referrerUrl.host,
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    };
  } catch {
    const source = getSourceFromReference(documentReferrer);

    return {
      sourcePlatform: source.sourcePlatform,
      sourceType: source.sourceType,
      referrerHost: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    };
  }
}

function readAnalyticsSession() {
  return readJsonCookie<AnalyticsSession>(ANALYTICS_SESSION_COOKIE);
}

function writeAnalyticsSession(session: AnalyticsSession) {
  writeJsonCookie(ANALYTICS_SESSION_COOKIE, session, {
    maxAgeSeconds: 60 * 60 * 12,
  });
}

function mapEventRowToEvent(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    countryCode: row.country_code,
    pagePath: row.page_path,
    pageType: row.page_type,
    sourceType: row.source_type,
    sourcePlatform: row.source_platform,
    referrerHost: row.referrer_host,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    buttonId: row.button_id,
    buttonLabel: row.button_label,
    searchQuery: row.search_query,
    resultsCount: row.results_count,
    orderNumber: row.order_number,
    amount: row.amount,
    metadata: row.metadata ?? {},
  };
}

function toEventRow(event: AnalyticsEvent): AnalyticsEventRow {
  return {
    id: event.id,
    type: event.type,
    created_at: event.createdAt,
    visitor_id: event.visitorId,
    session_id: event.sessionId,
    country_code: event.countryCode,
    page_path: event.pagePath,
    page_type: event.pageType,
    source_type: event.sourceType,
    source_platform: event.sourcePlatform,
    referrer_host: event.referrerHost,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    product_id: event.productId,
    product_slug: event.productSlug,
    product_name: event.productName,
    button_id: event.buttonId,
    button_label: event.buttonLabel,
    search_query: event.searchQuery,
    results_count: event.resultsCount,
    order_number: event.orderNumber,
    amount: event.amount,
    metadata: event.metadata,
  };
}

function upsertAnalyticsEventCache(event: AnalyticsEvent) {
  const latestEvent = analyticsEventsCache[0];

  if (
    latestEvent &&
    latestEvent.type === event.type &&
    latestEvent.sessionId === event.sessionId &&
    latestEvent.pagePath === event.pagePath &&
    latestEvent.buttonId === event.buttonId &&
    latestEvent.searchQuery === event.searchQuery &&
    latestEvent.orderNumber === event.orderNumber &&
    Date.now() - new Date(latestEvent.createdAt).getTime() < DUPLICATE_WINDOW_MS
  ) {
    return latestEvent;
  }

  analyticsEventsCache = [event, ...analyticsEventsCache].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  analyticsEventsLoaded = true;
  emitAnalyticsDataChange();
  return event;
}

async function persistAnalyticsEvent(event: AnalyticsEvent) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return event;
  }

  const { error } = await supabase
    .from(getSupabaseTableName('analyticsEvents'))
    .upsert(toEventRow(event), { onConflict: 'id' });

  if (error) {
    throw new Error(error.message || 'Unable to save analytics event.');
  }

  return event;
}

function ensureAnalyticsSession(currentPagePath: string) {
  const existingSession = readAnalyticsSession();

  if (existingSession) {
    return {
      session: existingSession,
      isNew: false,
    };
  }

  const sessionSource = resolveSessionSource();
  const session: AnalyticsSession = {
    id: createAnalyticsId('session'),
    visitorId: getPersistentVisitorId(),
    createdAt: new Date().toISOString(),
    landingPath: currentPagePath,
    sourceType: sessionSource.sourceType,
    sourcePlatform: sessionSource.sourcePlatform,
    referrerHost: sessionSource.referrerHost,
    utmSource: sessionSource.utmSource,
    utmMedium: sessionSource.utmMedium,
    utmCampaign: sessionSource.utmCampaign,
  };

  writeAnalyticsSession(session);

  const sessionStartEvent = upsertAnalyticsEventCache({
    id: createAnalyticsId('evt'),
    type: 'session_start',
    createdAt: session.createdAt,
    visitorId: session.visitorId,
    sessionId: session.id,
    countryCode: normalizeCountryCode(),
    pagePath: currentPagePath,
    pageType: classifyPageType(currentPagePath),
    sourceType: session.sourceType,
    sourcePlatform: session.sourcePlatform,
    referrerHost: session.referrerHost,
    utmSource: session.utmSource,
    utmMedium: session.utmMedium,
    utmCampaign: session.utmCampaign,
    productId: '',
    productSlug: '',
    productName: '',
    buttonId: '',
    buttonLabel: '',
    searchQuery: '',
    resultsCount: null,
    orderNumber: '',
    amount: null,
    metadata: {},
  });

  void persistAnalyticsEvent(sessionStartEvent).catch(() => undefined);

  return {
    session,
    isNew: true,
  };
}

export function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  if (!isBrowser()) {
    return null;
  }

  const pagePath = normalizePath(input.pagePath);
  const { session } = ensureAnalyticsSession(pagePath);
  const event = upsertAnalyticsEventCache({
    id: createAnalyticsId('evt'),
    type: input.type,
    createdAt: new Date().toISOString(),
    visitorId: session.visitorId,
    sessionId: session.id,
    countryCode: normalizeCountryCode(),
    pagePath,
    pageType: input.pageType ?? classifyPageType(pagePath),
    sourceType: session.sourceType,
    sourcePlatform: session.sourcePlatform,
    referrerHost: session.referrerHost,
    utmSource: session.utmSource,
    utmMedium: session.utmMedium,
    utmCampaign: session.utmCampaign,
    productId: input.productId?.trim() ?? '',
    productSlug: input.productSlug?.trim() ?? '',
    productName: input.productName?.trim() ?? '',
    buttonId: input.buttonId?.trim() ?? '',
    buttonLabel: input.buttonLabel?.trim() ?? '',
    searchQuery: input.searchQuery?.trim() ?? '',
    resultsCount: typeof input.resultsCount === 'number' ? input.resultsCount : null,
    orderNumber: input.orderNumber?.trim() ?? '',
    amount: typeof input.amount === 'number' ? input.amount : null,
    metadata: input.metadata ?? {},
  });

  void persistAnalyticsEvent(event).catch(() => undefined);
  return event;
}

export function trackAnalyticsButtonClick(input: Omit<TrackAnalyticsEventInput, 'type'>) {
  return trackAnalyticsEvent({
    ...input,
    type: 'button_click',
  });
}

export async function readAnalyticsEvents() {
  if (analyticsEventsLoaded) {
    return analyticsEventsCache;
  }

  if (analyticsEventsRequest) {
    return analyticsEventsRequest;
  }

  analyticsEventsRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      analyticsEventsCache = [];
      analyticsEventsLoaded = true;
      emitAnalyticsDataChange();
      return analyticsEventsCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('analyticsEvents'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load analytics events.');
    }

    analyticsEventsCache = ((data ?? []) as AnalyticsEventRow[]).map(mapEventRowToEvent);
    analyticsEventsLoaded = true;
    emitAnalyticsDataChange();
    return analyticsEventsCache;
  })();

  try {
    return await analyticsEventsRequest;
  } finally {
    analyticsEventsRequest = null;
  }
}

export function getAnalyticsDataChangeEventName() {
  return ANALYTICS_DATA_CHANGE_EVENT;
}
