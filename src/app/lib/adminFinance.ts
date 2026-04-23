import { getLocaleConfig, type SupportedCountryCode } from './localeData';
import {
  ensureAdminOrdersLoaded,
  readAdminOrders,
  type AdminManagedOrder,
} from './adminOrders';
import { loadStorefrontProducts } from './storefrontProducts';
import type { AdminCurrency } from './adminProductDrafts';
import {
  DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES,
  normalizeHomepageHighlightImages,
} from './homepageHighlights';
import {
  convertPriceAmount,
  loadRatesSnapshot,
  type RatesSnapshot,
  type SupportedRateCurrency,
} from './currencyRates';
import { getOptimizedMedia } from './media';
import { PRODUCT_CATEGORIES } from './productCategories';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';
import { readAppSetting, writeAppSetting } from './supabaseSettings';

const FINANCE_SETTINGS_SETTING_KEY = 'finance_settings';
export const FINANCE_DATA_CHANGE_EVENT = 'cloudmarket-finance-data-change';
export type AppThemeMode = 'light' | 'dark';

export type FinanceExpenseCategory =
  | 'inventory'
  | 'ads'
  | 'delivery'
  | 'operations'
  | 'packaging'
  | 'utilities'
  | 'salary'
  | 'other';

export interface FinanceSettings {
  startupCapital: number;
  companyName: string;
  currency: AdminCurrency;
  companyShortName: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  logoUrl: string;
  homepageHighlightImages: string[];
  homepageCategoryImages: Record<string, string>;
  reportingCountryCode: SupportedCountryCode;
  metaPixelId: string;
  metaPurchaseTrackingEnabled: boolean;
  formspreeEndpointUrl: string;
  customHeadMarkup: string;
  customFooterMarkup: string;
  appThemeMode: AppThemeMode;
  mobileStickyCtaTexts: string[];
}

function normalizeAppThemeMode(value: unknown): AppThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

function normalizeMobileStickyCtaTexts(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  return normalized.slice(0, 20);
}

export interface FinanceExpenseRecord {
  id: string;
  title: string;
  amount: number;
  category: FinanceExpenseCategory;
  note: string;
  createdAt: string;
  linkedOrderNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPurchaseCost: number;
  unitSalePrice: number;
  localeCountryCode: SupportedCountryCode;
  source: 'manual' | 'order';
}

export interface FinanceSaleRecord {
  id: string;
  title: string;
  productId: string;
  productSlug: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  amount: number;
  createdAt: string;
  linkedOrderNumber: string;
  localeCountryCode: SupportedCountryCode;
  note: string;
  countsTowardRevenue: boolean;
  generatedFrom: 'manual' | 'linked-order';
}

export interface FinanceReceiptRecord {
  id: string;
  type: 'delivered-order' | 'manual-sale';
  receiptNumber: string;
  orderNumber: string;
  createdAt: string;
  localeCountryCode: SupportedCountryCode;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  location: string;
  productName: string;
  packageTitle: string;
  quantity: number;
  amount: number;
  note: string;
  sourceLabel: string;
}

export interface FinanceLedgerRecord {
  id: string;
  type: 'sale' | 'expense' | 'pending-order' | 'failed-order';
  title: string;
  subtitle: string;
  amount: number;
  createdAt: string;
  localeCountryCode: SupportedCountryCode;
  orderNumber: string;
  customerName: string;
  statusLabel: string;
}

export interface FinanceInventoryItem {
  productId: string;
  productSlug: string;
  productName: string;
  currency: AdminCurrency;
  salePrice: number;
  purchaseCost: number;
  marginPerUnit: number;
}

export interface FinanceGeographyInsight {
  label: string;
  countryCode: SupportedCountryCode;
  countryName: string;
  orders: number;
  revenue: number;
}

export interface FinanceMonthlyReport {
  monthKey: string;
  label: string;
  sales: number;
  expenses: number;
  netProfit: number;
  pendingIncome: number;
  deliveredOrders: number;
  newOrders: number;
  processingOrders: number;
  failedOrders: number;
}

export interface FinanceSnapshot {
  settings: FinanceSettings;
  manualExpenses: FinanceExpenseRecord[];
  deliveryExpenses: FinanceExpenseRecord[];
  allExpenses: FinanceExpenseRecord[];
  manualSales: FinanceSaleRecord[];
  orders: AdminManagedOrder[];
  inventory: FinanceInventoryItem[];
  deliveredOrders: AdminManagedOrder[];
  pendingOrders: AdminManagedOrder[];
  failedOrders: AdminManagedOrder[];
  receiptRecords: FinanceReceiptRecord[];
  ledgerRecords: FinanceLedgerRecord[];
  monthlyReports: FinanceMonthlyReport[];
  alerts: string[];
  guidance: string[];
  geography: {
    countries: FinanceGeographyInsight[];
    regions: FinanceGeographyInsight[];
    topCountry: FinanceGeographyInsight | null;
    topRegion: FinanceGeographyInsight | null;
  };
  metrics: {
    totalSales: number;
    overallIncome: number;
    pendingIncome: number;
    pendingProfitEstimate: number;
    totalExpenses: number;
    totalGeneratedValue: number;
    inventoryCostOfSales: number;
    estimatedGrossProfit: number;
    pureProfit: number;
    netWorth: number;
    workingBalance: number;
    capitalReserve: number;
    deliveredOrders: number;
    processingOrders: number;
    newOrders: number;
    failedOrders: number;
    totalOrders: number;
    monthlySales: number;
    monthlyExpenses: number;
    monthlyNetProfit: number;
  };
  todaySummary: {
    totalOrders: number;
    totalSales: number;
    pendingSales: number;
    processingOrders: number;
    newOrders: number;
    failedOrders: number;
    totalExpenses: number;
    pureProfit: number;
    newOrderAlertCount: number;
  };
}

interface FinanceExpenseRow {
  id: string;
  created_at: string;
  source: 'manual' | 'order';
  data: FinanceExpenseRecord;
}

interface FinanceSaleRow {
  id: string;
  created_at: string;
  data: FinanceSaleRecord;
}

let financeSettingsCache = defaultFinanceSettings();
let financeSettingsLoaded = false;
let financeSettingsRequest: Promise<FinanceSettings> | null = null;
let financeExpensesCache: FinanceExpenseRecord[] = [];
let financeExpensesLoaded = false;
let financeExpensesRequest: Promise<FinanceExpenseRecord[]> | null = null;
let financeSalesCache: FinanceSaleRecord[] = [];
let financeSalesLoaded = false;
let financeSalesRequest: Promise<FinanceSaleRecord[]> | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function emitFinanceChange() {
  emitBrowserEvent(FINANCE_DATA_CHANGE_EVENT);
}

function createFinanceId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function normalizeCountryCode(value?: string | null): SupportedCountryCode {
  if (value === 'US' || value === 'GH' || value === 'KE' || value === 'ZA') {
    return value;
  }

  return 'NG';
}

function startOfLocalDay(dateValue: string | Date) {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(dateValue: string | Date, target: Date) {
  const source = startOfLocalDay(dateValue);
  return source.getTime() === startOfLocalDay(target).getTime();
}

function formatMonthKey(dateValue: string | Date) {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString('en-NG', {
    month: 'short',
    year: 'numeric',
  });
}

function normalizeFinanceCurrency(value?: string | null): AdminCurrency {
  if (value === 'USD' || value === 'GHS' || value === 'KES' || value === 'ZAR') {
    return value;
  }

  return 'NGN';
}

function countryCodeFromCurrency(currency: AdminCurrency): SupportedCountryCode {
  switch (currency) {
    case 'USD':
      return 'US';
    case 'GHS':
      return 'GH';
    case 'KES':
      return 'KE';
    case 'ZAR':
      return 'ZA';
    default:
      return 'NG';
  }
}

function normalizeHomepageCategoryImages(input?: Record<string, string> | null) {
  const imageEntries = typeof input === 'object' && input ? input : {};

  return PRODUCT_CATEGORIES.reduce<Record<string, string>>((accumulator, category) => {
    const nextValue = imageEntries[category.slug];

    if (typeof nextValue === 'string' && nextValue.trim()) {
      accumulator[category.slug] = nextValue.trim();
    }

    return accumulator;
  }, {});
}

function defaultFinanceSettings(): FinanceSettings {
  return {
    startupCapital: 0,
    companyName: 'CloudMarket',
    currency: 'NGN',
    companyShortName: 'CM',
    companyPhone: '+1(336)4596552',
    companyEmail: 'cloudmarket47@gmail.com',
    companyWebsite: 'https://cloudmarket.ng',
    logoUrl: '/brand/cloudmarket-logo.jfif',
    homepageHighlightImages: [...DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES],
    homepageCategoryImages: {},
    reportingCountryCode: 'NG',
    metaPixelId: '',
    metaPurchaseTrackingEnabled: false,
    formspreeEndpointUrl: '',
    customHeadMarkup: '',
    customFooterMarkup: '',
    appThemeMode: 'light',
    mobileStickyCtaTexts: [
      'Order Now - Pay on Delivery',
      'Claim Today\'s Free Delivery Offer',
      'Get the Bundle Before It Sells Out',
      'Unlock the Best Promo Package Now',
      'Tap to Reserve Your Discounted Order',
    ],
  };
}

function normalizeFinanceExpenseRecord(expense: FinanceExpenseRecord): FinanceExpenseRecord {
  return {
    ...expense,
    localeCountryCode: normalizeCountryCode(expense.localeCountryCode),
    productId: expense.productId ?? '',
    productName: expense.productName ?? '',
    quantity: typeof expense.quantity === 'number' && expense.quantity > 0 ? expense.quantity : 1,
    unitPurchaseCost:
      typeof expense.unitPurchaseCost === 'number' ? expense.unitPurchaseCost : 0,
    unitSalePrice: typeof expense.unitSalePrice === 'number' ? expense.unitSalePrice : 0,
    source: expense.source === 'order' ? ('order' as const) : ('manual' as const),
  };
}

function normalizeFinanceSaleRecord(sale: FinanceSaleRecord): FinanceSaleRecord {
  return {
    ...sale,
    localeCountryCode: normalizeCountryCode(sale.localeCountryCode),
    productId: sale.productId ?? '',
    productSlug: sale.productSlug ?? '',
    customerAddress: sale.customerAddress ?? '',
    quantity: typeof sale.quantity === 'number' && sale.quantity > 0 ? sale.quantity : 1,
    unitPrice: typeof sale.unitPrice === 'number' ? sale.unitPrice : sale.amount,
    unitCost: typeof sale.unitCost === 'number' ? sale.unitCost : 0,
    countsTowardRevenue: sale.countsTowardRevenue !== false,
    generatedFrom: sale.generatedFrom === 'linked-order' ? 'linked-order' : 'manual',
  };
}

function buildInventoryCatalog(
  products: Awaited<ReturnType<typeof loadStorefrontProducts>>,
  storeCurrency: AdminCurrency,
  ratesSnapshot: RatesSnapshot,
) {
  return products
    .filter((product) => product.status === 'published')
    .map((product) => {
      const sourceCurrency = normalizeFinanceCurrency(product.currencyCode) as SupportedRateCurrency;
      const salePrice = convertPriceAmount(
        product.price,
        sourceCurrency,
        storeCurrency as SupportedRateCurrency,
        ratesSnapshot,
      );
      const purchaseCost = convertPriceAmount(
        product.purchaseCost ?? 0,
        sourceCurrency,
        storeCurrency as SupportedRateCurrency,
        ratesSnapshot,
      );

      return {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        currency: storeCurrency,
        salePrice,
        purchaseCost,
        marginPerUnit: Number((salePrice - purchaseCost).toFixed(storeCurrency === 'NGN' ? 0 : 2)),
      };
    })
    .sort((left, right) => left.productName.localeCompare(right.productName));
}

export async function ensureFinanceSettingsLoaded(force = false) {
  if (financeSettingsLoaded && !force) {
    return financeSettingsCache;
  }

  if (financeSettingsRequest && !force) {
    return financeSettingsRequest;
  }

  financeSettingsRequest = (async () => {
    const parsedSettings = await readAppSetting<Partial<FinanceSettings>>(
      FINANCE_SETTINGS_SETTING_KEY,
      {},
    );
    const defaults = defaultFinanceSettings();

    financeSettingsCache = {
      ...defaults,
      ...parsedSettings,
      startupCapital:
        typeof parsedSettings.startupCapital === 'number' && parsedSettings.startupCapital >= 0
          ? parsedSettings.startupCapital
          : defaults.startupCapital,
      currency: normalizeFinanceCurrency(parsedSettings.currency),
      homepageHighlightImages: normalizeHomepageHighlightImages(
        parsedSettings.homepageHighlightImages,
      ),
      homepageCategoryImages: normalizeHomepageCategoryImages(
        parsedSettings.homepageCategoryImages,
      ),
      reportingCountryCode: countryCodeFromCurrency(
        normalizeFinanceCurrency(parsedSettings.currency ?? defaults.currency),
      ),
      metaPixelId:
        typeof parsedSettings.metaPixelId === 'string'
          ? parsedSettings.metaPixelId.trim()
          : defaults.metaPixelId,
      metaPurchaseTrackingEnabled:
        typeof parsedSettings.metaPurchaseTrackingEnabled === 'boolean'
          ? parsedSettings.metaPurchaseTrackingEnabled
          : defaults.metaPurchaseTrackingEnabled,
      formspreeEndpointUrl:
        typeof parsedSettings.formspreeEndpointUrl === 'string'
          ? parsedSettings.formspreeEndpointUrl.trim()
          : defaults.formspreeEndpointUrl,
      customHeadMarkup:
        typeof parsedSettings.customHeadMarkup === 'string'
          ? parsedSettings.customHeadMarkup
          : defaults.customHeadMarkup,
      customFooterMarkup:
        typeof parsedSettings.customFooterMarkup === 'string'
          ? parsedSettings.customFooterMarkup
          : defaults.customFooterMarkup,
      appThemeMode: normalizeAppThemeMode(parsedSettings.appThemeMode),
      mobileStickyCtaTexts: normalizeMobileStickyCtaTexts(
        parsedSettings.mobileStickyCtaTexts ?? defaults.mobileStickyCtaTexts,
      ),
    } satisfies FinanceSettings;
    financeSettingsCache = {
      ...financeSettingsCache,
      logoUrl: getOptimizedMedia(financeSettingsCache.logoUrl),
      homepageHighlightImages: financeSettingsCache.homepageHighlightImages.map((image) =>
        getOptimizedMedia(image),
      ),
      homepageCategoryImages: Object.fromEntries(
        Object.entries(financeSettingsCache.homepageCategoryImages).map(([key, value]) => [
          key,
          getOptimizedMedia(value),
        ]),
      ),
    };
    financeSettingsLoaded = true;
    emitFinanceChange();
    return financeSettingsCache;
  })();

  try {
    return await financeSettingsRequest;
  } finally {
    financeSettingsRequest = null;
  }
}

function readStoredManualExpenses() {
  return financeExpensesCache
    .map((expense) => normalizeFinanceExpenseRecord(expense))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function ensureFinanceExpensesLoaded(force = false) {
  if (financeExpensesLoaded && !force) {
    return financeExpensesCache;
  }

  if (financeExpensesRequest && !force) {
    return financeExpensesRequest;
  }

  financeExpensesRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      financeExpensesCache = [];
      financeExpensesLoaded = true;
      emitFinanceChange();
      return financeExpensesCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('financeExpenses'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load finance expenses.');
    }

    financeExpensesCache = ((data ?? []) as FinanceExpenseRow[]).map((row) =>
      normalizeFinanceExpenseRecord({
        ...row.data,
        id: row.id,
        createdAt: row.created_at,
        source: row.source,
      }),
    );
    financeExpensesLoaded = true;
    emitFinanceChange();
    return financeExpensesCache;
  })();

  try {
    return await financeExpensesRequest;
  } finally {
    financeExpensesRequest = null;
  }
}

function readStoredManualSales() {
  return financeSalesCache
    .map((sale) => normalizeFinanceSaleRecord(sale))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function ensureFinanceSalesLoaded(force = false) {
  if (financeSalesLoaded && !force) {
    return financeSalesCache;
  }

  if (financeSalesRequest && !force) {
    return financeSalesRequest;
  }

  financeSalesRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      financeSalesCache = [];
      financeSalesLoaded = true;
      emitFinanceChange();
      return financeSalesCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('financeSales'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load finance sales.');
    }

    financeSalesCache = ((data ?? []) as FinanceSaleRow[]).map((row) =>
      normalizeFinanceSaleRecord({
        ...row.data,
        id: row.id,
        createdAt: row.created_at,
      }),
    );
    financeSalesLoaded = true;
    emitFinanceChange();
    return financeSalesCache;
  })();

  try {
    return await financeSalesRequest;
  } finally {
    financeSalesRequest = null;
  }
}

function buildOrderExpenseRecords(
  orders: AdminManagedOrder[],
  inventoryItems: FinanceInventoryItem[],
  reportingCountryCode: SupportedCountryCode,
) {
  const inventoryMap = new Map(inventoryItems.map((item) => [item.productId, item]));

  return orders
    .filter((order) => typeof order.expenseAmount === 'number' && order.expenseAmount > 0)
    .map((order) => ({
      id: `order-expense-${order.orderNumber}`,
      title: `Order cost for ${order.orderNumber}`,
      amount: order.expenseAmountInStoreCurrency ?? order.expenseAmount ?? 0,
      category: 'delivery' as FinanceExpenseCategory,
      note: order.expenseNote,
      createdAt: order.expenseRecordedAt || order.updatedAt || order.createdAt,
      linkedOrderNumber: order.orderNumber,
      productId: order.productId,
      productName: order.productName,
      quantity: order.quantity,
      unitPurchaseCost: inventoryMap.get(order.productId)?.purchaseCost ?? 0,
      unitSalePrice:
        order.quantity > 0
          ? Math.round(order.finalAmountInStoreCurrency / Math.max(1, order.quantity))
          : order.finalAmountInStoreCurrency,
      localeCountryCode: reportingCountryCode,
      source: 'order' as const,
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function calculatePendingProfitEstimate(
  pendingIncome: number,
  orderExpenses: FinanceExpenseRecord[],
  deliveredOrders: AdminManagedOrder[],
) {
  if (!pendingIncome) {
    return 0;
  }

  const averageExpensePerDeliveredOrder =
    deliveredOrders.length > 0
      ? orderExpenses.reduce((sum, expense) => sum + expense.amount, 0) / deliveredOrders.length
      : 0;

  return Math.max(0, pendingIncome - averageExpensePerDeliveredOrder);
}

function buildOrderGeographyInsights(orders: AdminManagedOrder[]) {
  const countryMap = new Map<string, FinanceGeographyInsight>();
  const regionMap = new Map<string, FinanceGeographyInsight>();

  orders.forEach((order) => {
    const countryName = getLocaleConfig(order.localeCountryCode).countryName;
    const existingCountry = countryMap.get(order.localeCountryCode);
    countryMap.set(order.localeCountryCode, {
      label: countryName,
      countryCode: order.localeCountryCode,
      countryName,
      orders: (existingCountry?.orders ?? 0) + 1,
      revenue: (existingCountry?.revenue ?? 0) + order.finalAmountInStoreCurrency,
    });

    const regionLabel = order.city?.trim() || 'Unknown Region';
    const regionKey = `${order.localeCountryCode}:${regionLabel.toLowerCase()}`;
    const existingRegion = regionMap.get(regionKey);
    regionMap.set(regionKey, {
      label: regionLabel,
      countryCode: order.localeCountryCode,
      countryName,
      orders: (existingRegion?.orders ?? 0) + 1,
      revenue: (existingRegion?.revenue ?? 0) + order.finalAmountInStoreCurrency,
    });
  });

  const countries = Array.from(countryMap.values()).sort((left, right) => right.orders - left.orders);
  const regions = Array.from(regionMap.values()).sort((left, right) => right.orders - left.orders);

  return {
    countries,
    regions,
    topCountry: countries[0] ?? null,
    topRegion: regions[0] ?? null,
  };
}

function buildMonthlyReports(
  orders: AdminManagedOrder[],
  expenses: FinanceExpenseRecord[],
  manualSales: FinanceSaleRecord[],
) {
  const monthKeys = new Set<string>();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - offset, 1);
    monthKeys.add(formatMonthKey(monthDate));
  }

  orders.forEach((order) => monthKeys.add(formatMonthKey(order.createdAt)));
  expenses.forEach((expense) => monthKeys.add(formatMonthKey(expense.createdAt)));
  manualSales.forEach((sale) => monthKeys.add(formatMonthKey(sale.createdAt)));

  return Array.from(monthKeys)
    .sort((left, right) => left.localeCompare(right))
    .slice(-6)
    .map((monthKey) => {
      const monthlyOrders = orders.filter((order) => formatMonthKey(order.createdAt) === monthKey);
      const monthlyExpenses = expenses.filter((expense) => formatMonthKey(expense.createdAt) === monthKey);
      const monthlyManualSales = manualSales.filter((sale) => formatMonthKey(sale.createdAt) === monthKey && sale.countsTowardRevenue);
      const sales =
        monthlyOrders
          .filter((order) => order.status === 'delivered')
          .reduce((sum, order) => sum + order.finalAmountInStoreCurrency, 0) +
        monthlyManualSales.reduce((sum, sale) => sum + sale.amount, 0);
      const expensesTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const pendingIncome = monthlyOrders
        .filter(
          (order) =>
            order.status === 'new' || order.status === 'confirmed' || order.status === 'processing',
        )
        .reduce((sum, order) => sum + order.finalAmountInStoreCurrency, 0);

      return {
        monthKey,
        label: formatMonthLabel(monthKey),
        sales,
        expenses: expensesTotal,
        netProfit: sales - expensesTotal,
        pendingIncome,
        deliveredOrders: monthlyOrders.filter((order) => order.status === 'delivered').length,
        newOrders: monthlyOrders.filter((order) => order.status === 'new').length,
        processingOrders: monthlyOrders.filter((order) => order.status === 'confirmed' || order.status === 'processing').length,
        failedOrders: monthlyOrders.filter((order) => order.status === 'failed' || order.status === 'cancelled').length,
      } satisfies FinanceMonthlyReport;
    });
}

function buildAlerts(snapshot: Omit<FinanceSnapshot, 'alerts' | 'guidance'>) {
  const alerts: string[] = [];
  const guidance: string[] = [];

  if (snapshot.metrics.pureProfit < 0) {
    alerts.push('The business is currently running at a loss. Expenses are above realized sales.');
  }

  if (snapshot.metrics.capitalReserve < 0) {
    alerts.push('Startup capital reserve has dropped below zero. You are spending past the original capital.');
  }

  if (snapshot.todaySummary.newOrderAlertCount > 0) {
    alerts.push(`${snapshot.todaySummary.newOrderAlertCount} new order${snapshot.todaySummary.newOrderAlertCount > 1 ? 's' : ''} need attention today.`);
  }

  if (snapshot.metrics.pendingIncome > snapshot.metrics.totalSales * 0.45) {
    guidance.push('A large share of business value is still pending. Push fulfillment faster to convert pending value into real income.');
  }

  if (snapshot.metrics.totalExpenses > snapshot.metrics.totalSales * 0.6) {
    guidance.push('Expense pressure is high against realized sales. Review ads, inventory, and non-essential spend before scaling.');
  }

  if (snapshot.metrics.failedOrders > 0) {
    guidance.push('Track failed orders closely. Repeated failed orders can quietly drag profit and conversion quality.');
  }

  if (snapshot.metrics.monthlyNetProfit > 0) {
    guidance.push('Monthly profit is positive. Protect margin by keeping delivery and advertising costs efficient.');
  }

  if (!guidance.length) {
    guidance.push('Finance health is stable. Keep recording expenses and sales daily so the dashboard stays accurate.');
  }

  return { alerts, guidance };
}

export function readFinanceSettings() {
  if (!financeSettingsLoaded) {
    void ensureFinanceSettingsLoaded();
  }

  return financeSettingsCache;
}

export async function updateFinanceSettings(update: Partial<FinanceSettings>) {
  const currentSettings = await ensureFinanceSettingsLoaded();
  const nextSettings: FinanceSettings = {
    ...currentSettings,
    ...update,
    startupCapital:
      typeof update.startupCapital === 'number'
        ? Math.max(0, update.startupCapital)
        : currentSettings.startupCapital,
    companyName: (update.companyName ?? currentSettings.companyName).trim(),
    currency: normalizeFinanceCurrency(update.currency ?? currentSettings.currency),
    companyShortName: (update.companyShortName ?? currentSettings.companyShortName).trim() || currentSettings.companyShortName,
    companyPhone: (update.companyPhone ?? currentSettings.companyPhone).trim(),
    companyEmail: (update.companyEmail ?? currentSettings.companyEmail).trim(),
    companyWebsite: (update.companyWebsite ?? currentSettings.companyWebsite).trim(),
    logoUrl: (update.logoUrl ?? currentSettings.logoUrl).trim() || currentSettings.logoUrl,
    homepageHighlightImages: normalizeHomepageHighlightImages(
      update.homepageHighlightImages ?? currentSettings.homepageHighlightImages,
    ),
    homepageCategoryImages: normalizeHomepageCategoryImages(
      update.homepageCategoryImages ?? currentSettings.homepageCategoryImages,
    ),
    reportingCountryCode: countryCodeFromCurrency(
      normalizeFinanceCurrency(update.currency ?? currentSettings.currency),
    ),
    metaPixelId: (update.metaPixelId ?? currentSettings.metaPixelId).trim(),
    metaPurchaseTrackingEnabled:
      typeof update.metaPurchaseTrackingEnabled === 'boolean'
        ? update.metaPurchaseTrackingEnabled
        : currentSettings.metaPurchaseTrackingEnabled,
    formspreeEndpointUrl:
      (update.formspreeEndpointUrl ?? currentSettings.formspreeEndpointUrl).trim(),
    customHeadMarkup: update.customHeadMarkup ?? currentSettings.customHeadMarkup,
    customFooterMarkup: update.customFooterMarkup ?? currentSettings.customFooterMarkup,
    appThemeMode: normalizeAppThemeMode(update.appThemeMode ?? currentSettings.appThemeMode),
    mobileStickyCtaTexts: normalizeMobileStickyCtaTexts(
      update.mobileStickyCtaTexts ?? currentSettings.mobileStickyCtaTexts,
    ),
  };

  financeSettingsCache = nextSettings;
  financeSettingsLoaded = true;
  await writeAppSetting(FINANCE_SETTINGS_SETTING_KEY, nextSettings);
  emitFinanceChange();
  return nextSettings;
}

export async function recordFinanceExpense(input: {
  title: string;
  amount: number;
  category: FinanceExpenseCategory;
  note?: string;
  createdAt?: string;
  linkedOrderNumber?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPurchaseCost?: number;
  unitSalePrice?: number;
  localeCountryCode?: SupportedCountryCode;
}) {
  await ensureFinanceExpensesLoaded();
  const expenses = readStoredManualExpenses().filter((expense) => expense.source === 'manual');
  const nextExpense: FinanceExpenseRecord = {
    id: createFinanceId('expense'),
    title: input.title.trim(),
    amount: Math.max(0, input.amount),
    category: input.category,
    note: input.note?.trim() ?? '',
    createdAt: input.createdAt ?? new Date().toISOString(),
    linkedOrderNumber: input.linkedOrderNumber?.trim() ?? '',
    productId: input.productId?.trim() ?? '',
    productName: input.productName?.trim() ?? '',
    quantity: typeof input.quantity === 'number' && input.quantity > 0 ? input.quantity : 1,
    unitPurchaseCost: typeof input.unitPurchaseCost === 'number' ? input.unitPurchaseCost : 0,
    unitSalePrice: typeof input.unitSalePrice === 'number' ? input.unitSalePrice : 0,
    localeCountryCode: normalizeCountryCode(input.localeCountryCode),
    source: 'manual',
  };

  financeExpensesCache = [nextExpense, ...expenses];
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from(getSupabaseTableName('financeExpenses')).upsert(
      {
        id: nextExpense.id,
        created_at: nextExpense.createdAt,
        source: nextExpense.source,
        data: nextExpense,
      } satisfies FinanceExpenseRow,
      {
        onConflict: 'id',
      },
    );

    if (error) {
      throw new Error(error.message || 'Unable to save finance expense.');
    }
  }

  emitFinanceChange();
  return nextExpense;
}

export async function deleteFinanceExpense(expenseId: string) {
  await ensureFinanceExpensesLoaded();
  const nextExpenses = readStoredManualExpenses()
    .filter((expense) => expense.source === 'manual')
    .filter((expense) => expense.id !== expenseId);

  financeExpensesCache = nextExpenses;
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from(getSupabaseTableName('financeExpenses'))
      .delete()
      .eq('id', expenseId);

    if (error) {
      throw new Error(error.message || 'Unable to delete finance expense.');
    }
  }

  emitFinanceChange();
}

export async function recordManualSale(input: {
  title: string;
  amount: number;
  productId?: string;
  productSlug?: string;
  productName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  quantity?: number;
  unitPrice?: number;
  unitCost?: number;
  note?: string;
  linkedOrderNumber?: string;
  localeCountryCode?: SupportedCountryCode;
  createdAt?: string;
  countsTowardRevenue?: boolean;
  generatedFrom?: 'manual' | 'linked-order';
}) {
  await ensureFinanceSalesLoaded();
  const sales = readStoredManualSales();
  const nextSale: FinanceSaleRecord = {
    id: createFinanceId('sale'),
    title: input.title.trim(),
    productId: input.productId?.trim() ?? '',
    productSlug: input.productSlug?.trim() ?? '',
    productName: input.productName?.trim() ?? 'Manual Sale',
    customerName: input.customerName?.trim() ?? 'Walk-in Customer',
    customerPhone: input.customerPhone?.trim() ?? '',
    customerEmail: input.customerEmail?.trim() ?? '',
    customerAddress: input.customerAddress?.trim() ?? '',
    quantity: typeof input.quantity === 'number' && input.quantity > 0 ? input.quantity : 1,
    unitPrice: typeof input.unitPrice === 'number' ? input.unitPrice : Math.max(0, input.amount),
    unitCost: typeof input.unitCost === 'number' ? input.unitCost : 0,
    amount: Math.max(0, input.amount),
    createdAt: input.createdAt ?? new Date().toISOString(),
    linkedOrderNumber: input.linkedOrderNumber?.trim() ?? '',
    localeCountryCode: normalizeCountryCode(input.localeCountryCode),
    note: input.note?.trim() ?? '',
    countsTowardRevenue: input.countsTowardRevenue !== false,
    generatedFrom: input.generatedFrom === 'linked-order' ? 'linked-order' : 'manual',
  };

  financeSalesCache = [nextSale, ...sales];
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from(getSupabaseTableName('financeSales')).upsert(
      {
        id: nextSale.id,
        created_at: nextSale.createdAt,
        data: nextSale,
      } satisfies FinanceSaleRow,
      {
        onConflict: 'id',
      },
    );

    if (error) {
      throw new Error(error.message || 'Unable to save finance sale.');
    }
  }

  emitFinanceChange();
  return nextSale;
}

export async function deleteFinanceSale(saleId: string) {
  await ensureFinanceSalesLoaded();
  const nextSales = readStoredManualSales().filter((sale) => sale.id !== saleId);
  financeSalesCache = nextSales;
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from(getSupabaseTableName('financeSales'))
      .delete()
      .eq('id', saleId);

    if (error) {
      throw new Error(error.message || 'Unable to delete finance sale.');
    }
  }

  emitFinanceChange();
}

export async function deleteFinanceEntriesForOrder(orderNumber: string) {
  const normalizedOrderNumber = orderNumber.trim();

  if (!normalizedOrderNumber) {
    return;
  }

  await Promise.all([ensureFinanceExpensesLoaded(), ensureFinanceSalesLoaded()]);

  const expenseIdsToDelete = financeExpensesCache
    .filter((expense) => expense.linkedOrderNumber === normalizedOrderNumber)
    .map((expense) => expense.id);
  const saleIdsToDelete = financeSalesCache
    .filter((sale) => sale.linkedOrderNumber === normalizedOrderNumber)
    .map((sale) => sale.id);

  financeExpensesCache = financeExpensesCache.filter(
    (expense) => expense.linkedOrderNumber !== normalizedOrderNumber,
  );
  financeSalesCache = financeSalesCache.filter(
    (sale) => sale.linkedOrderNumber !== normalizedOrderNumber,
  );
  emitFinanceChange();

  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  if (expenseIdsToDelete.length > 0) {
    const { error } = await supabase
      .from(getSupabaseTableName('financeExpenses'))
      .delete()
      .in('id', expenseIdsToDelete);

    if (error) {
      throw new Error(error.message || 'Unable to delete linked finance expenses.');
    }
  }

  if (saleIdsToDelete.length > 0) {
    const { error } = await supabase
      .from(getSupabaseTableName('financeSales'))
      .delete()
      .in('id', saleIdsToDelete);

    if (error) {
      throw new Error(error.message || 'Unable to delete linked finance sales.');
    }
  }
}

export async function refreshFinanceData() {
  await Promise.all([
    ensureFinanceSettingsLoaded(true),
    ensureFinanceExpensesLoaded(true),
    ensureFinanceSalesLoaded(true),
  ]);
}

export async function readFinanceSnapshot() {
  const [settings, products, ratesSnapshot] = await Promise.all([
    ensureFinanceSettingsLoaded(),
    loadStorefrontProducts(),
    loadRatesSnapshot(true),
    ensureAdminOrdersLoaded(),
    ensureFinanceExpensesLoaded(),
    ensureFinanceSalesLoaded(),
  ]);
  const orders = readAdminOrders();
  const inventory = buildInventoryCatalog(products, settings.currency, ratesSnapshot);
  const inventoryMap = new Map(inventory.map((item) => [item.productId, item]));
  const deliveredOrders = orders.filter((order) => order.status === 'delivered');
  const pendingOrders = orders.filter(
    (order) =>
      order.status === 'new' || order.status === 'confirmed' || order.status === 'processing',
  );
  const failedOrders = orders.filter(
    (order) => order.status === 'failed' || order.status === 'cancelled',
  );
  const manualExpenses = readStoredManualExpenses().filter((expense) => expense.source === 'manual');
  const orderExpenses = buildOrderExpenseRecords(orders, inventory, settings.reportingCountryCode);
  const allExpenses = [...manualExpenses, ...orderExpenses].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const manualSales = readStoredManualSales();
  const countedManualSales = manualSales.filter((sale) => sale.countsTowardRevenue);
  const totalDeliveredSales = deliveredOrders.reduce(
    (sum, order) => sum + order.finalAmountInStoreCurrency,
    0,
  );
  const totalManualSales = countedManualSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalSales = totalDeliveredSales + totalManualSales;
  const totalExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingIncome = pendingOrders.reduce(
    (sum, order) => sum + order.finalAmountInStoreCurrency,
    0,
  );
  const pendingProfitEstimate = calculatePendingProfitEstimate(pendingIncome, orderExpenses, deliveredOrders);
  const totalGeneratedValue =
    orders.reduce((sum, order) => sum + order.finalAmountInStoreCurrency, 0) + totalManualSales;
  const inventoryCostOfSales =
    deliveredOrders.reduce(
      (sum, order) =>
        sum + (inventoryMap.get(order.productId)?.purchaseCost ?? 0) * Math.max(1, order.quantity),
      0,
    ) +
    countedManualSales.reduce(
      (sum, sale) => sum + Math.max(0, sale.unitCost) * Math.max(1, sale.quantity),
      0,
    );
  const estimatedGrossProfit = totalSales - inventoryCostOfSales;
  const pureProfit = totalSales - totalExpenses;
  const capitalReserve = settings.startupCapital - totalExpenses;
  const workingBalance = settings.startupCapital + totalSales - totalExpenses;
  const netWorth = settings.startupCapital + pureProfit;
  const currentMonthKey = formatMonthKey(new Date());
  const monthlyReports = buildMonthlyReports(orders, allExpenses, manualSales);
  const currentMonthReport = monthlyReports.find((report) => report.monthKey === currentMonthKey);
  const today = new Date();
  const geography = buildOrderGeographyInsights(orders);

  const receiptRecords = [
    ...deliveredOrders.map((order) => ({
      id: order.orderNumber,
      type: 'delivered-order' as const,
      receiptNumber: `RCPT-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      createdAt: order.updatedAt || order.createdAt,
      localeCountryCode: settings.reportingCountryCode,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: '',
      customerAddress: order.customerAddress,
      location: order.city,
      productName: order.productName,
      packageTitle: order.packageTitle,
      quantity: order.quantity,
      amount: order.finalAmountInStoreCurrency,
      note: order.shortDeliveryMessage || order.packageDescription,
      sourceLabel: 'Delivered order',
    })),
    ...manualSales.map((sale) => ({
      id: sale.id,
      type: 'manual-sale' as const,
      receiptNumber: `RCPT-${sale.id.slice(-6).toUpperCase()}`,
      orderNumber: sale.linkedOrderNumber,
      createdAt: sale.createdAt,
      localeCountryCode: sale.localeCountryCode,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerEmail: sale.customerEmail,
      customerAddress: sale.customerAddress,
      location: sale.customerAddress,
      productName: sale.productName,
      packageTitle: sale.title,
      quantity: sale.quantity,
      amount: sale.amount,
      note: sale.note,
      sourceLabel: sale.linkedOrderNumber ? 'Linked finance sale' : 'Manual finance sale',
    })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) satisfies FinanceReceiptRecord[];

  const ledgerRecords = [
    ...deliveredOrders.map((order) => ({
      id: `sale-${order.orderNumber}`,
      type: 'sale' as const,
      title: `${order.productName} sale`,
      subtitle: `${order.customerName} - ${order.packageTitle}`,
      amount: order.finalAmountInStoreCurrency,
      createdAt: order.updatedAt || order.createdAt,
      localeCountryCode: settings.reportingCountryCode,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      statusLabel: 'Delivered',
    })),
    ...countedManualSales.map((sale) => ({
      id: `manual-sale-${sale.id}`,
      type: 'sale' as const,
      title: sale.title,
      subtitle: `${sale.customerName} - ${sale.productName} x${sale.quantity}`,
      amount: sale.amount,
      createdAt: sale.createdAt,
      localeCountryCode: sale.localeCountryCode,
      orderNumber: sale.linkedOrderNumber,
      customerName: sale.customerName,
      statusLabel: sale.linkedOrderNumber ? 'Linked sale' : 'Manual sale',
    })),
    ...allExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: 'expense' as const,
      title: expense.title,
      subtitle: expense.note || expense.category,
      amount: expense.amount,
      createdAt: expense.createdAt,
      localeCountryCode: expense.localeCountryCode,
      orderNumber: expense.linkedOrderNumber,
      customerName: '',
      statusLabel: expense.source === 'order' ? 'Order expense' : 'Expense',
    })),
    ...pendingOrders.map((order) => ({
      id: `pending-${order.orderNumber}`,
      type: 'pending-order' as const,
      title: `${order.productName} pending value`,
      subtitle: `${order.customerName} - ${order.packageTitle}`,
      amount: order.finalAmountInStoreCurrency,
      createdAt: order.createdAt,
      localeCountryCode: settings.reportingCountryCode,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      statusLabel:
        order.status === 'processing'
          ? 'Processing'
          : order.status === 'confirmed'
            ? 'Confirmed'
            : 'New',
    })),
    ...failedOrders.map((order) => ({
      id: `failed-${order.orderNumber}`,
      type: 'failed-order' as const,
      title: `${order.productName} unsuccessful order`,
      subtitle: `${order.customerName} - ${order.packageTitle}`,
      amount: order.finalAmountInStoreCurrency,
      createdAt: order.updatedAt || order.createdAt,
      localeCountryCode: settings.reportingCountryCode,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      statusLabel: order.status === 'cancelled' ? 'Cancelled' : 'Failed',
    })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) satisfies FinanceLedgerRecord[];

  const todayOrders = orders.filter((order) => isSameLocalDay(order.createdAt, today));
  const todayExpenses = allExpenses.filter((expense) => isSameLocalDay(expense.createdAt, today));
  const todaySales = deliveredOrders
    .filter((order) => isSameLocalDay(order.updatedAt || order.createdAt, today))
    .reduce((sum, order) => sum + order.finalAmountInStoreCurrency, 0) +
    countedManualSales.filter((sale) => isSameLocalDay(sale.createdAt, today)).reduce((sum, sale) => sum + sale.amount, 0);

  const partialSnapshot = {
    settings,
    manualExpenses,
    deliveryExpenses: orderExpenses,
    allExpenses,
    manualSales,
    orders,
    inventory,
    deliveredOrders,
    pendingOrders,
    failedOrders,
    receiptRecords,
    ledgerRecords,
    monthlyReports,
    geography,
    metrics: {
      totalSales,
      overallIncome: totalSales,
      pendingIncome,
      pendingProfitEstimate,
      totalExpenses,
      totalGeneratedValue,
      inventoryCostOfSales,
      estimatedGrossProfit,
      pureProfit,
      netWorth,
      workingBalance,
      capitalReserve,
      deliveredOrders: deliveredOrders.length,
      processingOrders: orders.filter((order) => order.status === 'confirmed' || order.status === 'processing').length,
      newOrders: orders.filter((order) => order.status === 'new').length,
      failedOrders: failedOrders.length,
      totalOrders: orders.length,
      monthlySales: currentMonthReport?.sales ?? 0,
      monthlyExpenses: currentMonthReport?.expenses ?? 0,
      monthlyNetProfit: currentMonthReport?.netProfit ?? 0,
    },
    todaySummary: {
      totalOrders: todayOrders.length,
      totalSales: todaySales,
      pendingSales: todayOrders
        .filter(
          (order) =>
            order.status === 'new' || order.status === 'confirmed' || order.status === 'processing',
        )
        .reduce((sum, order) => sum + order.finalAmountInStoreCurrency, 0),
      processingOrders: todayOrders.filter((order) => order.status === 'confirmed' || order.status === 'processing').length,
      newOrders: todayOrders.filter((order) => order.status === 'new').length,
      failedOrders: todayOrders.filter((order) => order.status === 'failed' || order.status === 'cancelled').length,
      totalExpenses: todayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      pureProfit: todaySales - todayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      newOrderAlertCount: todayOrders.filter((order) => order.status === 'new').length,
    },
  } satisfies Omit<FinanceSnapshot, 'alerts' | 'guidance'>;

  const { alerts, guidance } = buildAlerts(partialSnapshot);

  return {
    ...partialSnapshot,
    alerts,
    guidance,
  } satisfies FinanceSnapshot;
}
