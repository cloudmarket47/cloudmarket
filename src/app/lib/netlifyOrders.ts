import type { PlacedOrder } from '../types';
import { submitNetlifyForm } from './netlifyForms';

const NETLIFY_ORDER_FORM_NAME = 'product-order';
export const NETLIFY_SUBSCRIPTION_FORM_NAME = 'email-subscription';

function isBrowser() {
  return typeof window !== 'undefined';
}

function buildOrderFieldMap(order: PlacedOrder) {
  return {
    'form-name': NETLIFY_ORDER_FORM_NAME,
    order_number: order.orderNumber,
    created_at: order.createdAt,
    locale_country_code: order.localeCountryCode,
    product_id: order.productId,
    product_slug: order.productSlug,
    product_name: order.productName,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_address: order.customerAddress,
    city: order.city,
    quantity: String(order.quantity),
    package_title: order.packageTitle,
    package_description: order.packageDescription,
    package_label: order.packageLabel,
    sets_included: order.setsIncluded,
    short_delivery_message: order.shortDeliveryMessage,
    customer_token: order.customerToken,
    base_amount: String(order.baseAmount),
    discount_percentage: String(order.discountPercentage),
    discount_amount: String(order.discountAmount),
    final_amount: String(order.finalAmount),
  };
}

export async function submitOrderToNetlifyForm(order: PlacedOrder) {
  if (!isBrowser()) {
    return;
  }

  await submitNetlifyForm(NETLIFY_ORDER_FORM_NAME, buildOrderFieldMap(order));
}

export async function notifyOrderSubmission(order: PlacedOrder) {
  if (!isBrowser()) {
    return;
  }

  await fetch('/api/order-notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order,
    }),
    keepalive: true,
  });
}

export async function syncOrderSubmission(order: PlacedOrder) {
  const results = await Promise.allSettled([
    submitOrderToNetlifyForm(order),
    notifyOrderSubmission(order),
  ]);

  return results;
}

export async function submitSubscriptionToNetlifyForm(input: {
  fullName: string;
  email: string;
  gender: string;
  location: string;
  token: string;
  sourceProductName?: string;
  sourceProductSlug?: string;
  sourcePageUrl?: string;
}) {
  await submitNetlifyForm(NETLIFY_SUBSCRIPTION_FORM_NAME, {
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
