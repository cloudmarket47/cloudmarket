import type { PlacedOrder } from '../types';

const SEND_ORDER_ENDPOINT = '/.netlify/functions/send-order';
const ORDER_CURRENCY_BY_COUNTRY = {
  GH: 'GHS',
  KE: 'KES',
  NG: 'NGN',
  US: 'USD',
  ZA: 'ZAR',
} as const;

interface OrderSubmissionContext {
  customerEmail?: string | null;
}

interface SubscriptionNotificationInput {
  fullName: string;
  email: string;
  gender: string;
  location: string;
  token: string;
  sourceProductName?: string;
  sourceProductSlug?: string;
  sourcePageUrl?: string;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function buildOrderItemsLabel(order: PlacedOrder) {
  return `${order.productName} | ${order.packageTitle} | Qty ${order.quantity}`;
}

function buildOrderPayload(order: PlacedOrder, context?: OrderSubmissionContext) {
  return {
    type: 'order',
    orderId: order.orderNumber,
    name: order.customerName,
    email: context?.customerEmail ?? '',
    items: buildOrderItemsLabel(order),
    total: order.finalAmount,
    currencyCode: ORDER_CURRENCY_BY_COUNTRY[order.localeCountryCode],
    order: {
      createdAt: order.createdAt,
      localeCountryCode: order.localeCountryCode,
      productId: order.productId,
      productSlug: order.productSlug,
      productName: order.productName,
      customerName: order.customerName,
      customerEmail: context?.customerEmail ?? '',
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      city: order.city,
      quantity: order.quantity,
      packageTitle: order.packageTitle,
      packageDescription: order.packageDescription,
      packageLabel: order.packageLabel,
      setsIncluded: order.setsIncluded,
      shortDeliveryMessage: order.shortDeliveryMessage,
      customerToken: order.customerToken,
      baseAmount: order.baseAmount,
      discountPercentage: order.discountPercentage,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
    },
  };
}

async function postSubmissionNotification(payload: Record<string, unknown>) {
  if (!isBrowser()) {
    return;
  }

  const response = await fetch(SEND_ORDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Submission notification failed with status ${response.status}.`);
  }
}

export async function syncOrderSubmission(order: PlacedOrder, context?: OrderSubmissionContext) {
  await postSubmissionNotification(buildOrderPayload(order, context));
}

export async function sendSubscriptionNotification(input: SubscriptionNotificationInput) {
  await postSubmissionNotification({
    type: 'subscription',
    name: input.fullName,
    email: input.email,
    subscription: {
      fullName: input.fullName,
      email: input.email,
      gender: input.gender,
      location: input.location,
      token: input.token,
      sourceProductName: input.sourceProductName ?? '',
      sourceProductSlug: input.sourceProductSlug ?? '',
      sourcePageUrl: input.sourcePageUrl ?? '',
    },
  });
}
