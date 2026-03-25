import { formatCurrency } from './utils';
import type { CustomerTokenRecord, PlacedOrder, Product } from '../types';
import type { SupportedCountryCode } from './localeData';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';

const ORDERS_DATA_CHANGE_EVENT = 'cloudmarket-orders-cache-change';

export interface PackageOption {
  quantity: string;
  title: string;
  description: string;
  sets: string;
  label: string;
  total: number;
}

interface OrderRow {
  order_number: string;
  created_at: string;
  locale_country_code: SupportedCountryCode;
  product_id: string;
  product_slug: string;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  city: string;
  quantity: number;
  package_title: string;
  package_description: string;
  package_label: string;
  sets_included: string;
  short_delivery_message: string;
  customer_token: string;
  base_amount: number;
  discount_percentage: number;
  discount_amount: number;
  final_amount: number;
}

interface BuildPlacedOrderParams {
  product: Product;
  quantity: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  shortDeliveryMessage: string;
  customerToken: string;
  tokenRecord: CustomerTokenRecord | null;
  localeCountryCode: SupportedCountryCode;
}

let persistedOrdersCache: Record<string, PlacedOrder> = {};
let persistedOrdersLoaded = false;
let persistedOrdersRequest: Promise<Record<string, PlacedOrder>> | null = null;

function mapOrderRowToPlacedOrder(row: OrderRow): PlacedOrder {
  return {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    localeCountryCode: row.locale_country_code,
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    city: row.city,
    quantity: row.quantity,
    packageTitle: row.package_title,
    packageDescription: row.package_description,
    packageLabel: row.package_label,
    setsIncluded: row.sets_included,
    shortDeliveryMessage: row.short_delivery_message,
    customerToken: row.customer_token,
    baseAmount: row.base_amount,
    discountPercentage: row.discount_percentage,
    discountAmount: row.discount_amount,
    finalAmount: row.final_amount,
  };
}

function toOrderRow(order: PlacedOrder): OrderRow {
  return {
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
    quantity: order.quantity,
    package_title: order.packageTitle,
    package_description: order.packageDescription,
    package_label: order.packageLabel,
    sets_included: order.setsIncluded,
    short_delivery_message: order.shortDeliveryMessage,
    customer_token: order.customerToken,
    base_amount: order.baseAmount,
    discount_percentage: order.discountPercentage,
    discount_amount: order.discountAmount,
    final_amount: order.finalAmount,
  };
}

function emitOrdersChange() {
  emitBrowserEvent(ORDERS_DATA_CHANGE_EVENT);
}

export function getOrderStorageKey() {
  return getSupabaseTableName('orders');
}

export function buildPackageOptions(
  product: Product,
  localeCountryCode: SupportedCountryCode = 'NG',
): Record<string, PackageOption> {
  return product.sections.offer.packages.reduce<Record<string, PackageOption>>((collection, pkg, index) => {
    const quantity = pkg.title.match(/buy\s+(\d+)/i)?.[1] ?? String(index + 1);

    collection[quantity] = {
      quantity,
      title: pkg.title,
      description: pkg.description,
      sets: pkg.description,
      label: `${pkg.title} - ${pkg.description} - ${formatCurrency(pkg.price, localeCountryCode)}`,
      total: pkg.price,
    };

    return collection;
  }, {});
}

export function calculateOrderPricing(baseAmount: number, discountPercentage: number) {
  const safeDiscountPercentage = Math.max(0, discountPercentage);
  const discountAmount = Math.round((baseAmount * safeDiscountPercentage) / 100);

  return {
    baseAmount,
    discountPercentage: safeDiscountPercentage,
    discountAmount,
    finalAmount: Math.max(0, baseAmount - discountAmount),
  };
}

export function generateOrderNumber() {
  return `ORD-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
}

export function createPlacedOrder({
  product,
  quantity,
  customerName,
  customerPhone,
  customerAddress,
  city,
  shortDeliveryMessage,
  customerToken,
  tokenRecord,
  localeCountryCode,
}: BuildPlacedOrderParams): PlacedOrder {
  const options = buildPackageOptions(product, localeCountryCode);
  const selectedPackage = options[quantity] ?? Object.values(options)[0];
  const pricing = calculateOrderPricing(
    selectedPackage.total,
    tokenRecord?.discountPercentage ?? 0,
  );

  return {
    orderNumber: generateOrderNumber(),
    createdAt: new Date().toISOString(),
    localeCountryCode,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    customerName,
    customerPhone,
    customerAddress,
    city,
    quantity: Number(quantity),
    packageTitle: selectedPackage.title,
    packageDescription: selectedPackage.description,
    packageLabel: selectedPackage.label,
    setsIncluded: selectedPackage.sets,
    shortDeliveryMessage: shortDeliveryMessage.trim(),
    customerToken: customerToken.trim().toUpperCase(),
    baseAmount: pricing.baseAmount,
    discountPercentage: pricing.discountPercentage,
    discountAmount: pricing.discountAmount,
    finalAmount: pricing.finalAmount,
  };
}

export async function ensurePlacedOrdersLoaded(force = false) {
  if (persistedOrdersLoaded && !force) {
    return persistedOrdersCache;
  }

  if (persistedOrdersRequest && !force) {
    return persistedOrdersRequest;
  }

  persistedOrdersRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      persistedOrdersCache = {};
      persistedOrdersLoaded = true;
      emitOrdersChange();
      return persistedOrdersCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('orders'))
      .select(
        `
        order_number,
        created_at,
        locale_country_code,
        product_id,
        product_slug,
        product_name,
        customer_name,
        customer_phone,
        customer_address,
        city,
        quantity,
        package_title,
        package_description,
        package_label,
        sets_included,
        short_delivery_message,
        customer_token,
        base_amount,
        discount_percentage,
        discount_amount,
        final_amount
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load orders.');
    }

    persistedOrdersCache = ((data ?? []) as OrderRow[]).reduce<Record<string, PlacedOrder>>(
      (collection, row) => {
        const order = mapOrderRowToPlacedOrder(row);
        collection[order.orderNumber] = order;
        return collection;
      },
      {},
    );
    persistedOrdersLoaded = true;
    emitOrdersChange();
    return persistedOrdersCache;
  })();

  try {
    return await persistedOrdersRequest;
  } finally {
    persistedOrdersRequest = null;
  }
}

export async function persistPlacedOrder(order: PlacedOrder) {
  const supabase = getSupabaseClient();
  persistedOrdersCache = {
    ...persistedOrdersCache,
    [order.orderNumber]: order,
  };
  persistedOrdersLoaded = true;
  emitOrdersChange();

  if (supabase) {
    const { error } = await supabase.from(getSupabaseTableName('orders')).upsert(
      {
        ...toOrderRow(order),
        status: 'new',
        updated_at: new Date().toISOString(),
        expense_amount: null,
        expense_note: '',
        expense_recorded_at: null,
      },
      {
        onConflict: 'order_number',
      },
    );

    if (error) {
      throw new Error(error.message || 'Unable to save order.');
    }
  }

  return order;
}

export function getPersistedOrders() {
  if (!persistedOrdersLoaded) {
    void ensurePlacedOrdersLoaded();
  }

  return persistedOrdersCache;
}

export async function getPlacedOrder(orderNumber: string | null) {
  if (!orderNumber) {
    return null;
  }

  await ensurePlacedOrdersLoaded();
  return persistedOrdersCache[orderNumber] ?? null;
}

export function getOrdersDataChangeEventName() {
  return ORDERS_DATA_CHANGE_EVENT;
}
