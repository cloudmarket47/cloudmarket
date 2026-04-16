import type { SupportedCountryCode } from './localeData';
import type { PlacedOrder } from '../types';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';
import { convertPriceAmount, type SupportedRateCurrency } from './currencyRates';

export const ADMIN_ORDERS_DATA_CHANGE_EVENT = 'cloudmarket-admin-orders-change';

export type AdminOrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'cancelled'
  | 'failed'
  | 'delivered';

export interface AdminManagedOrder {
  id: string;
  orderNumber: string;
  localeCountryCode: SupportedCountryCode;
  transactionCurrency: SupportedRateCurrency;
  storeCurrency: SupportedRateCurrency;
  productId: string;
  productSlug: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  customerAlternatePhone: string;
  customerAddress: string;
  city: string;
  quantity: number;
  packageTitle: string;
  packageDescription: string;
  packageLabel: string;
  setsIncluded: string;
  shortDeliveryMessage: string;
  customerToken: string;
  baseAmount: number;
  baseAmountInStoreCurrency: number;
  discountPercentage: number;
  discountAmount: number;
  discountAmountInStoreCurrency: number;
  finalAmount: number;
  finalAmountInStoreCurrency: number;
  status: AdminOrderStatus;
  source: 'submission' | 'seed';
  createdAt: string;
  updatedAt: string;
  expenseAmount: number | null;
  expenseCurrency: SupportedRateCurrency;
  expenseAmountInStoreCurrency: number | null;
  expenseNote: string;
  expenseRecordedAt: string;
}

interface AdminOrderUpdateInput {
  status: AdminOrderStatus;
  expenseAmount?: number | null;
  expenseCurrency?: SupportedRateCurrency;
  expenseNote?: string;
}

interface OrderRow {
  id?: string | null;
  order_number: string;
  locale_country_code?: string | null;
  transaction_currency?: SupportedRateCurrency | null;
  store_currency?: SupportedRateCurrency | null;
  product_id?: string | null;
  product_slug?: string | null;
  product_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_alt_phone?: string | null;
  customer_address?: string | null;
  city?: string | null;
  quantity?: number | null;
  package_title?: string | null;
  package_description?: string | null;
  package_label?: string | null;
  sets_included?: string | null;
  short_delivery_message?: string | null;
  customer_token?: string | null;
  base_amount?: number | null;
  base_amount_in_store_currency?: number | null;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  discount_amount_in_store_currency?: number | null;
  final_amount?: number | null;
  final_amount_in_store_currency?: number | null;
  status?: AdminOrderStatus | null;
  source?: 'submission' | 'seed' | null;
  created_at?: string | null;
  updated_at?: string | null;
  expense_amount?: number | null;
  expense_currency?: SupportedRateCurrency | null;
  expense_amount_in_store_currency?: number | null;
  expense_note?: string | null;
  expense_recorded_at?: string | null;
}

let adminOrdersCache: AdminManagedOrder[] = [];
let adminOrdersLoaded = false;
let adminOrdersRequest: Promise<AdminManagedOrder[]> | null = null;

function normalizeCurrencyCountryCode(value?: string | null): SupportedCountryCode {
  if (value === 'US' || value === 'GH' || value === 'KE' || value === 'ZA') {
    return value;
  }

  return 'NG';
}

function mapOrderRowToAdminOrder(row: OrderRow): AdminManagedOrder {
  const transactionCurrency = row.transaction_currency ?? 'NGN';
  const storeCurrency = row.store_currency ?? 'NGN';
  const baseAmount = typeof row.base_amount === 'number' ? row.base_amount : 0;
  const discountAmount = typeof row.discount_amount === 'number' ? row.discount_amount : 0;
  const finalAmount = typeof row.final_amount === 'number' ? row.final_amount : 0;
  const expenseAmount = typeof row.expense_amount === 'number' ? row.expense_amount : null;
  const expenseCurrency = row.expense_currency ?? storeCurrency;

  return {
    id: row.id || row.order_number,
    orderNumber: row.order_number,
    localeCountryCode: normalizeCurrencyCountryCode(row.locale_country_code),
    transactionCurrency,
    storeCurrency,
    productId: row.product_id || '',
    productSlug: row.product_slug || '',
    productName: row.product_name || 'Order Item',
    customerName: row.customer_name || 'Customer',
    customerPhone: row.customer_phone || '',
    customerAlternatePhone: row.customer_alt_phone || '',
    customerAddress: row.customer_address || '',
    city: row.city || '',
    quantity: typeof row.quantity === 'number' ? row.quantity : 1,
    packageTitle: row.package_title || '',
    packageDescription: row.package_description || '',
    packageLabel: row.package_label || '',
    setsIncluded: row.sets_included || '',
    shortDeliveryMessage: row.short_delivery_message || '',
    customerToken: row.customer_token || '',
    baseAmount,
    baseAmountInStoreCurrency:
      typeof row.base_amount_in_store_currency === 'number'
        ? row.base_amount_in_store_currency
        : convertPriceAmount(baseAmount, transactionCurrency, storeCurrency),
    discountPercentage:
      typeof row.discount_percentage === 'number' ? row.discount_percentage : 0,
    discountAmount,
    discountAmountInStoreCurrency:
      typeof row.discount_amount_in_store_currency === 'number'
        ? row.discount_amount_in_store_currency
        : convertPriceAmount(discountAmount, transactionCurrency, storeCurrency),
    finalAmount,
    finalAmountInStoreCurrency:
      typeof row.final_amount_in_store_currency === 'number'
        ? row.final_amount_in_store_currency
        : convertPriceAmount(finalAmount, transactionCurrency, storeCurrency),
    status:
      row.status === 'confirmed' ||
      row.status === 'processing' ||
      row.status === 'cancelled' ||
      row.status === 'failed' ||
      row.status === 'delivered'
        ? row.status
        : 'new',
    source: row.source === 'seed' ? 'seed' : 'submission',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    expenseAmount,
    expenseCurrency,
    expenseAmountInStoreCurrency:
      typeof row.expense_amount_in_store_currency === 'number'
        ? row.expense_amount_in_store_currency
        : expenseAmount === null
          ? null
          : convertPriceAmount(expenseAmount, expenseCurrency, storeCurrency),
    expenseNote: row.expense_note || '',
    expenseRecordedAt: row.expense_recorded_at || '',
  };
}

function toOrderRow(order: AdminManagedOrder): OrderRow {
  return {
    order_number: order.orderNumber,
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
    status: order.status,
    source: order.source,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    expense_amount: order.expenseAmount,
    expense_currency: order.expenseCurrency,
    expense_amount_in_store_currency: order.expenseAmountInStoreCurrency,
    expense_note: order.expenseNote,
    expense_recorded_at: order.expenseRecordedAt || null,
  };
}

function emitAdminOrdersChange() {
  emitBrowserEvent(ADMIN_ORDERS_DATA_CHANGE_EVENT);
}

export function createAdminOrderFromPlacedOrder(order: PlacedOrder): AdminManagedOrder {
  return {
    id: order.orderNumber,
    orderNumber: order.orderNumber,
    localeCountryCode: normalizeCurrencyCountryCode(order.localeCountryCode),
    transactionCurrency: order.transactionCurrency,
    storeCurrency: order.storeCurrency,
    productId: order.productId,
    productSlug: order.productSlug,
    productName: order.productName,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAlternatePhone: order.customerAlternatePhone,
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
    baseAmountInStoreCurrency: order.baseAmountInStoreCurrency,
    discountPercentage: order.discountPercentage,
    discountAmount: order.discountAmount,
    discountAmountInStoreCurrency: order.discountAmountInStoreCurrency,
    finalAmount: order.finalAmount,
    finalAmountInStoreCurrency: order.finalAmountInStoreCurrency,
    status: 'new',
    source: 'submission',
    createdAt: order.createdAt,
    updatedAt: order.createdAt,
    expenseAmount: null,
    expenseCurrency: order.storeCurrency,
    expenseAmountInStoreCurrency: null,
    expenseNote: '',
    expenseRecordedAt: '',
  };
}

export async function ensureAdminOrdersLoaded(force = false) {
  if (adminOrdersLoaded && !force) {
    return adminOrdersCache;
  }

  if (adminOrdersRequest && !force) {
    return adminOrdersRequest;
  }

  adminOrdersRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      adminOrdersCache = [];
      adminOrdersLoaded = true;
      emitAdminOrdersChange();
      return adminOrdersCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('orders'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load orders.');
    }

    adminOrdersCache = ((data ?? []) as OrderRow[]).map(mapOrderRowToAdminOrder);
    adminOrdersLoaded = true;
    emitAdminOrdersChange();
    return adminOrdersCache;
  })();

  try {
    return await adminOrdersRequest;
  } finally {
    adminOrdersRequest = null;
  }
}

export function readAdminOrders() {
  if (!adminOrdersLoaded) {
    void ensureAdminOrdersLoaded();
  }

  return adminOrdersCache;
}

export async function recordSubmittedOrder(order: PlacedOrder) {
  const incomingOrder = createAdminOrderFromPlacedOrder(order);
  const supabase = getSupabaseClient();

  adminOrdersCache = [
    incomingOrder,
    ...adminOrdersCache.filter((currentOrder) => currentOrder.orderNumber !== incomingOrder.orderNumber),
  ];
  adminOrdersLoaded = true;
  emitAdminOrdersChange();

  if (supabase) {
    const { error } = await supabase.from(getSupabaseTableName('orders')).upsert(toOrderRow(incomingOrder), {
      onConflict: 'order_number',
    });

    if (error) {
      throw new Error(error.message || 'Unable to save submitted order.');
    }
  }

  return incomingOrder;
}

export async function updateManagedOrder(orderNumber: string, update: AdminOrderUpdateInput) {
  await ensureAdminOrdersLoaded();
  const targetOrder = adminOrdersCache.find((order) => order.orderNumber === orderNumber);

  if (!targetOrder) {
    return null;
  }

  const shouldResetExpense = update.status === 'new';
  const hasIncomingExpense =
    typeof update.expenseAmount === 'number' && update.expenseAmount >= 0;
  const nextExpenseCurrency = update.expenseCurrency ?? targetOrder.expenseCurrency ?? targetOrder.storeCurrency;

  const nextOrder: AdminManagedOrder = {
    ...targetOrder,
    status: update.status,
    updatedAt: new Date().toISOString(),
    expenseAmount: shouldResetExpense
      ? null
      : hasIncomingExpense
        ? update.expenseAmount ?? null
        : targetOrder.expenseAmount,
    expenseCurrency: shouldResetExpense ? targetOrder.storeCurrency : nextExpenseCurrency,
    expenseAmountInStoreCurrency: shouldResetExpense
      ? null
      : hasIncomingExpense
        ? convertPriceAmount(
            update.expenseAmount ?? 0,
            nextExpenseCurrency,
            targetOrder.storeCurrency,
          )
        : targetOrder.expenseAmountInStoreCurrency,
    expenseNote: shouldResetExpense
      ? ''
      : update.expenseNote?.trim() ?? targetOrder.expenseNote,
    expenseRecordedAt: shouldResetExpense
      ? ''
      : hasIncomingExpense || update.expenseNote !== undefined
        ? new Date().toISOString()
        : targetOrder.expenseRecordedAt,
  };

  adminOrdersCache = [
    nextOrder,
    ...adminOrdersCache.filter((order) => order.orderNumber !== orderNumber),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  emitAdminOrdersChange();

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from(getSupabaseTableName('orders')).upsert(toOrderRow(nextOrder), {
      onConflict: 'order_number',
    });

    if (error) {
      throw new Error(error.message || 'Unable to update order.');
    }
  }

  return nextOrder;
}

export async function deleteManagedOrder(orderNumber: string) {
  await ensureAdminOrdersLoaded();

  adminOrdersCache = adminOrdersCache.filter((order) => order.orderNumber !== orderNumber);
  emitAdminOrdersChange();

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from(getSupabaseTableName('orders'))
      .delete()
      .eq('order_number', orderNumber);

    if (error) {
      throw new Error(error.message || 'Unable to delete order.');
    }
  }
}
