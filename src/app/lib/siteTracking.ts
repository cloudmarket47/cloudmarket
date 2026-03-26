import type { PlacedOrder } from '../types';
import { ensureFinanceSettingsLoaded, readFinanceSettings } from './adminFinance';
import { readCookie, writeCookie } from './cookies';

export interface SiteTrackingSettings {
  metaPixelId: string;
  metaPurchaseTrackingEnabled: boolean;
  customHeadMarkup: string;
  customFooterMarkup: string;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
    __cloudmarketMetaPixelIds?: string[];
  }
}

interface MetaPixelStub {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: unknown[][];
}

const META_PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
const META_CONVERSIONS_ENDPOINT = '/.netlify/functions/meta-conversions';
const META_FBC_COOKIE_NAME = '_fbc';
const META_FBP_COOKIE_NAME = '_fbp';
const META_BROWSER_IDENTIFIER_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const TRACKED_CURRENCY_BY_COUNTRY = {
  GH: 'GHS',
  KE: 'KES',
  NG: 'NGN',
  US: 'USD',
  ZA: 'ZAR',
} as const;

interface MetaPurchaseTrackingContext {
  customerEmail?: string | null;
}

interface MetaConversionsPayload {
  pixelId: string;
  eventName: 'Purchase';
  eventId: string;
  eventTime: number;
  eventSourceUrl: string;
  userData: {
    email: string;
    phone: string;
    customerName: string;
    fbp: string;
    fbc: string;
    clientUserAgent: string;
  };
  customData: {
    currency: string;
    value: number;
    orderId: string;
    contentIds: string[];
    contentName: string;
    contentType: 'product';
    contents: Array<{
      id: string;
      quantity: number;
      item_price: number;
    }>;
    numItems: number;
  };
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function buildMetaClickIdCookieValue(fbclid: string) {
  return `fb.1.${Date.now()}.${fbclid}`;
}

function syncMetaBrowserIdentifiers() {
  if (!isBrowser()) {
    return {
      fbc: '',
      fbp: '',
    };
  }

  const url = new URL(window.location.href);
  const fbclid = url.searchParams.get('fbclid')?.trim() ?? '';
  const fbp = readCookie(META_FBP_COOKIE_NAME)?.trim() ?? '';
  let fbc = readCookie(META_FBC_COOKIE_NAME)?.trim() ?? '';

  if (fbclid && !fbc.endsWith(`.${fbclid}`)) {
    fbc = buildMetaClickIdCookieValue(fbclid);
    writeCookie(META_FBC_COOKIE_NAME, fbc, {
      maxAgeSeconds: META_BROWSER_IDENTIFIER_MAX_AGE_SECONDS,
    });
  }

  return {
    fbc,
    fbp,
  };
}

export function readSiteTrackingSettings(): SiteTrackingSettings {
  const financeSettings = readFinanceSettings();

  return {
    metaPixelId: financeSettings.metaPixelId.trim(),
    metaPurchaseTrackingEnabled: financeSettings.metaPurchaseTrackingEnabled,
    customHeadMarkup: financeSettings.customHeadMarkup,
    customFooterMarkup: financeSettings.customFooterMarkup,
  };
}

export async function ensureSiteTrackingSettingsLoaded(force = false) {
  await ensureFinanceSettingsLoaded(force);
  return readSiteTrackingSettings();
}

function markManagedElement(element: Element, slot: string) {
  element.setAttribute('data-cloudmarket-managed-slot', slot);
}

function cloneExecutableNode(node: Node, slot: string): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.cloneNode(false);
  }

  const element = node as Element;

  if (element.tagName.toLowerCase() === 'script') {
    const script = document.createElement('script');
    Array.from(element.attributes).forEach((attribute) => {
      script.setAttribute(attribute.name, attribute.value);
    });
    script.text = element.textContent ?? '';
    markManagedElement(script, slot);
    return script;
  }

  const clone = element.cloneNode(false) as Element;
  markManagedElement(clone, slot);
  Array.from(element.childNodes).forEach((childNode) => {
    const nextChild = cloneExecutableNode(childNode, slot);

    if (nextChild) {
      clone.appendChild(nextChild);
    }
  });

  return clone;
}

function mountManagedMarkup(target: HTMLElement, markup: string, slot: string) {
  const trimmedMarkup = markup.trim();

  if (!trimmedMarkup) {
    return () => undefined;
  }

  const template = document.createElement('template');
  template.innerHTML = trimmedMarkup;

  const insertedNodes: Node[] = [];
  Array.from(template.content.childNodes).forEach((childNode) => {
    const mountedNode = cloneExecutableNode(childNode, slot);

    if (mountedNode) {
      target.appendChild(mountedNode);
      insertedNodes.push(mountedNode);
    }
  });

  return () => {
    insertedNodes.forEach((node) => {
      node.parentNode?.removeChild(node);
    });
  };
}

function createMetaPixelStub() {
  if (!isBrowser()) {
    return null;
  }

  if (typeof window.fbq === 'function') {
    return window.fbq;
  }

  const stub = function fbqStub(...args: unknown[]) {
    if (typeof stub.callMethod === 'function') {
      stub.callMethod(...args);
      return;
    }

    stub.queue.push(args);
  } as MetaPixelStub;

  stub.queue = [];
  stub.loaded = true;
  stub.version = '2.0';
  stub.push = stub.queue;

  window.fbq = stub;
  window._fbq = stub;

  return stub;
}

function ensureMetaPixelScript() {
  if (!isBrowser()) {
    return;
  }

  if (document.querySelector('script[data-cloudmarket-meta-pixel-script="true"]')) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = META_PIXEL_SCRIPT_SRC;
  script.setAttribute('data-cloudmarket-meta-pixel-script', 'true');
  document.head.appendChild(script);
}

function ensureMetaPixelReady(pixelId: string) {
  if (!isBrowser() || !pixelId.trim()) {
    return false;
  }

  const fbq = createMetaPixelStub();

  if (!fbq) {
    return false;
  }

  ensureMetaPixelScript();

  const initializedPixelIds = window.__cloudmarketMetaPixelIds ?? [];

  if (!initializedPixelIds.includes(pixelId)) {
    fbq('init', pixelId);
    window.__cloudmarketMetaPixelIds = [...initializedPixelIds, pixelId];
  }

  return typeof window.fbq === 'function';
}

export function applySiteTracking(settings: SiteTrackingSettings) {
  if (!isBrowser()) {
    return () => undefined;
  }

  if (settings.metaPixelId) {
    syncMetaBrowserIdentifiers();
    ensureMetaPixelReady(settings.metaPixelId);
  }

  const cleanupHead = mountManagedMarkup(document.head, settings.customHeadMarkup, 'head');
  const cleanupFooter = mountManagedMarkup(document.body, settings.customFooterMarkup, 'footer');

  return () => {
    cleanupHead();
    cleanupFooter();
  };
}

export async function trackMetaPageView() {
  const settings = await ensureSiteTrackingSettingsLoaded().catch(() => readSiteTrackingSettings());

  syncMetaBrowserIdentifiers();

  if (!settings.metaPixelId || !ensureMetaPixelReady(settings.metaPixelId)) {
    return;
  }

  window.fbq?.('track', 'PageView');
}

function buildMetaPurchasePayload(
  order: PlacedOrder,
  pixelId: string,
  context?: MetaPurchaseTrackingContext,
): MetaConversionsPayload {
  const currency = TRACKED_CURRENCY_BY_COUNTRY[order.localeCountryCode];
  const itemId = order.productId || order.productSlug || order.orderNumber;
  const itemPrice =
    order.quantity > 0 ? Number((order.finalAmount / Math.max(1, order.quantity)).toFixed(2)) : order.finalAmount;
  const { fbc, fbp } = syncMetaBrowserIdentifiers();

  return {
    pixelId,
    eventName: 'Purchase',
    eventId: order.orderNumber,
    eventTime: Math.floor(
      Number.isFinite(Date.parse(order.createdAt))
        ? Date.parse(order.createdAt) / 1000
        : Date.now() / 1000,
    ),
    eventSourceUrl: window.location.href,
    userData: {
      email: context?.customerEmail?.trim() ?? '',
      phone: order.customerPhone,
      customerName: order.customerName,
      fbp,
      fbc,
      clientUserAgent: window.navigator.userAgent,
    },
    customData: {
      currency,
      value: order.finalAmount,
      orderId: order.orderNumber,
      contentIds: [itemId],
      contentName: order.productName,
      contentType: 'product',
      contents: [
        {
          id: itemId,
          quantity: order.quantity,
          item_price: itemPrice,
        },
      ],
      numItems: order.quantity,
    },
  };
}

async function postMetaPurchaseConversion(payload: MetaConversionsPayload) {
  if (!isBrowser()) {
    return;
  }

  const response = await fetch(META_CONVERSIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Meta Conversions API submission failed with status ${response.status}.`);
  }
}

export async function trackMetaPurchase(order: PlacedOrder, context?: MetaPurchaseTrackingContext) {
  const settings = await ensureSiteTrackingSettingsLoaded().catch(() => readSiteTrackingSettings());

  if (!settings.metaPurchaseTrackingEnabled || !settings.metaPixelId) {
    return;
  }

  const payload = buildMetaPurchasePayload(order, settings.metaPixelId, context);

  ensureMetaPixelReady(settings.metaPixelId);

  if (typeof window.fbq === 'function') {
    window.fbq(
      'track',
      'Purchase',
      {
        value: payload.customData.value,
        currency: payload.customData.currency,
        content_ids: payload.customData.contentIds,
        content_name: payload.customData.contentName,
        content_type: payload.customData.contentType,
        contents: payload.customData.contents,
        num_items: payload.customData.numItems,
        order_id: payload.customData.orderId,
      },
      {
        eventID: payload.eventId,
      },
    );
  }

  await postMetaPurchaseConversion(payload);
}
