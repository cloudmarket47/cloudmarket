import type { PlacedOrder } from '../types';
import { submitFormspreeForm } from './formspree';

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
    submission_type: 'order',
    order_id: order.orderNumber,
    customer_name: order.customerName,
    customer_email: context?.customerEmail ?? '',
    customer_phone: order.customerPhone,
    customer_alternate_phone: order.customerAlternatePhone,
    customer_address: order.customerAddress,
    city: order.city,
    quantity: order.quantity,
    items: buildOrderItemsLabel(order),
    product_id: order.productId,
    product_slug: order.productSlug,
    product_name: order.productName,
    package_title: order.packageTitle,
    package_description: order.packageDescription,
    package_label: order.packageLabel,
    sets_included: order.setsIncluded,
    short_delivery_message: order.shortDeliveryMessage,
    customer_token: order.customerToken,
    base_amount: order.baseAmount,
    discount_percentage: order.discountPercentage,
    discount_amount: order.discountAmount,
    total: order.finalAmount,
    currency_code: ORDER_CURRENCY_BY_COUNTRY[order.localeCountryCode],
    locale_country_code: order.localeCountryCode,
    created_at: order.createdAt,
  };
}

async function postSubmissionNotification(payload: Record<string, string | number | boolean | null | undefined>) {
  if (!isBrowser()) {
    return;
  }

  await submitFormspreeForm(payload, {
    subject:
      payload.submission_type === 'subscription'
        ? 'CloudMarket subscription submission'
        : 'CloudMarket order submission',
  });
}

export async function syncOrderSubmission(order: PlacedOrder, context?: OrderSubmissionContext) {
  await postSubmissionNotification(buildOrderPayload(order, context));
}

export async function sendSubscriptionNotification(input: SubscriptionNotificationInput) {
  await postSubmissionNotification({
    submission_type: 'subscription',
    full_name: input.fullName,
    email: input.email,
    gender: input.gender,
    location: input.location,
    token: input.token,
    source_product_name: input.sourceProductName ?? '',
    source_product_slug: input.sourceProductSlug ?? '',
    source_page_url: input.sourcePageUrl ?? '',
  });
}
