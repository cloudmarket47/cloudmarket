import { convertPriceAmount, type SupportedRateCurrency } from './currencyRates';
import { formatCurrency } from './utils';
import type { CustomerTokenRecord, PlacedOrder, Product } from '../types';
import { getLocaleConfig, type SupportedCountryCode } from './localeData';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';
import { readFinanceSettings } from './adminFinance';

const ORDERS_DATA_CHANGE_EVENT = 'cloudmarket-orders-cache-change';
const TRANSIENT_ORDER_STORAGE_PREFIX = 'cloudmarket-transient-order:';

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
  transaction_currency?: SupportedRateCurrency;
  store_currency?: SupportedRateCurrency;
  product_id: string;
  product_slug: string;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  customer_alt_phone: string;
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
  base_amount_in_store_currency?: number;
  discount_percentage: number;
  discount_amount: number;
  discount_amount_in_store_currency?: number;
  final_amount: number;
  final_amount_in_store_currency?: number;
  status?: string;
  source?: string;
  updated_at?: string;
  expense_amount?: number | null;
  expense_currency?: SupportedRateCurrency;
  expense_amount_in_store_currency?: number | null;
  expense_note?: string;
  expense_recorded_at?: string | null;
}

interface BuildPlacedOrderParams {
  product: Product;
  quantity: string;
  customerName: string;
  customerPhone: string;
  customerAlternatePhone: string;
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

function isBrowser() {
  return typeof window !== 'undefined';
}

function getTransientOrderStorageKey(orderNumber: string) {
  return `${TRANSIENT_ORDER_STORAGE_PREFIX}${orderNumber}`;
}

function writeTransientPlacedOrder(order: PlacedOrder) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(getTransientOrderStorageKey(order.orderNumber), JSON.stringify(order));
  } catch {
    // Ignore session storage failures.
  }
}

function readTransientPlacedOrder(orderNumber: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    const rawOrder = window.sessionStorage.getItem(getTransientOrderStorageKey(orderNumber));
    return rawOrder ? (JSON.parse(rawOrder) as PlacedOrder) : null;
  } catch {
    return null;
  }
}

function mapOrderRowToPlacedOrder(row: OrderRow): PlacedOrder {
  return {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    localeCountryCode: row.locale_country_code,
    transactionCurrency: row.transaction_currency ?? getLocaleConfig(row.locale_country_code).currencyCode,
    storeCurrency: row.store_currency ?? 'NGN',
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAlternatePhone: row.customer_alt_phone,
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
    baseAmountInStoreCurrency:
      typeof row.base_amount_in_store_currency === 'number'
        ? row.base_amount_in_store_currency
        : row.base_amount,
    discountPercentage: row.discount_percentage,
    discountAmount: row.discount_amount,
    discountAmountInStoreCurrency:
      typeof row.discount_amount_in_store_currency === 'number'
        ? row.discount_amount_in_store_currency
        : row.discount_amount,
    finalAmount: row.final_amount,
    finalAmountInStoreCurrency:
      typeof row.final_amount_in_store_currency === 'number'
        ? row.final_amount_in_store_currency
        : row.final_amount,
  };
}

function toOrderRow(order: PlacedOrder): OrderRow {
  return {
    order_number: order.orderNumber,
    created_at: order.createdAt,
    locale_country_code: order.localeCountryCode,
    transaction_currency: order.transactionCurrency,
    store_currency: order.storeCurrency,
    product_id: order.productId,
    product_slug: order.productSlug,
    product_name: order.productName,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_alt_phone: order.customerAlternatePhone,
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
    base_amount_in_store_currency: order.baseAmountInStoreCurrency,
    discount_percentage: order.discountPercentage,
    discount_amount: order.discountAmount,
    discount_amount_in_store_currency: order.discountAmountInStoreCurrency,
    final_amount: order.finalAmount,
    final_amount_in_store_currency: order.finalAmountInStoreCurrency,
    status: 'new',
    source: 'submission',
    expense_amount: null,
    expense_currency: order.storeCurrency,
    expense_amount_in_store_currency: null,
    expense_note: '',
    expense_recorded_at: null,
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
    const convertedTotal = convertPriceAmount(
      pkg.price,
      product.currencyCode ?? 'NGN',
      getLocaleConfig(localeCountryCode).currencyCode,
    );

    collection[quantity] = {
      quantity,
      title: pkg.title,
      description: pkg.description,
      sets: pkg.description,
      label: `${pkg.title} - ${pkg.description} - ${formatCurrency(convertedTotal, localeCountryCode)}`,
      total: convertedTotal,
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
  customerAlternatePhone,
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
  const transactionCurrency = getLocaleConfig(localeCountryCode).currencyCode;
  const storeCurrency = readFinanceSettings().currency;

  return {
    orderNumber: generateOrderNumber(),
    createdAt: new Date().toISOString(),
    localeCountryCode,
    transactionCurrency,
    storeCurrency,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    customerName,
    customerPhone,
    customerAlternatePhone: customerAlternatePhone.trim(),
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
    baseAmountInStoreCurrency: convertPriceAmount(
      pricing.baseAmount,
      transactionCurrency,
      storeCurrency,
    ),
    discountPercentage: pricing.discountPercentage,
    discountAmount: pricing.discountAmount,
    discountAmountInStoreCurrency: convertPriceAmount(
      pricing.discountAmount,
      transactionCurrency,
      storeCurrency,
    ),
    finalAmount: pricing.finalAmount,
    finalAmountInStoreCurrency: convertPriceAmount(
      pricing.finalAmount,
      transactionCurrency,
      storeCurrency,
    ),
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
        transaction_currency,
        store_currency,
        product_id,
        product_slug,
        product_name,
        customer_name,
        customer_phone,
        customer_alt_phone,
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
        base_amount_in_store_currency,
        discount_percentage,
        discount_amount,
        discount_amount_in_store_currency,
        final_amount,
        final_amount_in_store_currency
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
  writeTransientPlacedOrder(order);
  emitOrdersChange();

  if (supabase) {
    const { error } = await supabase.from(getSupabaseTableName('orders')).upsert(
      {
        ...toOrderRow(order),
        updated_at: new Date().toISOString(),
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

  const transientOrder = readTransientPlacedOrder(orderNumber);

  if (transientOrder) {
    persistedOrdersCache = {
      ...persistedOrdersCache,
      [transientOrder.orderNumber]: transientOrder,
    };
    persistedOrdersLoaded = true;
    return transientOrder;
  }

  await ensurePlacedOrdersLoaded();
  return persistedOrdersCache[orderNumber] ?? null;
}

export function rememberPlacedOrder(order: PlacedOrder) {
  persistedOrdersCache = {
    ...persistedOrdersCache,
    [order.orderNumber]: order,
  };
  persistedOrdersLoaded = true;
  writeTransientPlacedOrder(order);
  emitOrdersChange();
  return order;
}

export function getOrdersDataChangeEventName() {
  return ORDERS_DATA_CHANGE_EVENT;
}
