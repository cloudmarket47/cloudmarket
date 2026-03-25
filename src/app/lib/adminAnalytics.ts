import {
  getAnalyticsDataChangeEventName,
  readAnalyticsEvents,
  type AnalyticsEvent,
} from './analyticsTelemetry';
import { getLocaleConfig, type SupportedCountryCode } from './localeData';
import { loadStorefrontProducts } from './storefrontProducts';
import { readAdminSubscribersSnapshot } from './adminSubscribers';
import { ensureAdminOrdersLoaded, readAdminOrders } from './adminOrders';
import type { Product } from '../types';

export interface AnalyticsDailyPoint {
  date: string;
  shortLabel: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  productViews: number;
  searches: number;
  buttonClicks: number;
  checkouts: number;
  formSubmissions: number;
  orders: number;
}

export interface ProductAnalyticsPerformance {
  productId: string;
  productSlug: string;
  productName: string;
  pageViews: number;
  uniqueVisitors: number;
  todayVisitors: number;
  searches: number;
  buttonClicks: number;
  packageSelections: number;
  checkoutOpens: number;
  formSubmissions: number;
  orders: number;
  interactionRate: number;
  conversionRate: number;
  topButtonId: string;
  topButtonLabel: string;
}

export interface SearchInsight {
  query: string;
  count: number;
  uniqueVisitors: number;
  averageResults: number;
  zeroResultCount: number;
}

export interface ButtonInsight {
  buttonId: string;
  buttonLabel: string;
  clicks: number;
  productName: string;
  pageType: AnalyticsEvent['pageType'] | 'all';
}

export interface SourceInsight {
  sourcePlatform: string;
  sourceType: string;
  sessions: number;
  visitors: number;
  pageViews: number;
  formSubmissions: number;
  conversionRate: number;
}

export interface CountryInsight {
  countryCode: SupportedCountryCode;
  countryName: string;
  visitors: number;
  pageViews: number;
  formSubmissions: number;
}

export interface OrderGeographyInsight {
  label: string;
  countryCode: SupportedCountryCode;
  countryName: string;
  orders: number;
  revenue: number;
}

export interface AnalyticsPrediction {
  projectedVisitors7d: number;
  projectedOrders7d: number;
  projectedForms7d: number;
  visitorsGrowthRate: number;
  orderGrowthRate: number;
  momentumScore: number;
  focusArea: string;
  likelyWinnerPage: string;
  likelyGrowthSource: string;
  recommendations: string[];
}

export interface AdminAnalyticsSnapshot {
  periodDays: number;
  generatedAt: string;
  events: AnalyticsEvent[];
  filteredEvents: AnalyticsEvent[];
  dailySeries: AnalyticsDailyPoint[];
  productPerformance: ProductAnalyticsPerformance[];
  searchInsights: SearchInsight[];
  buttonInsights: ButtonInsight[];
  sourceInsights: SourceInsight[];
  countryInsights: CountryInsight[];
  orderCountryInsights: OrderGeographyInsight[];
  orderRegionInsights: OrderGeographyInsight[];
  topOrderCountry: OrderGeographyInsight | null;
  topOrderRegion: OrderGeographyInsight | null;
  topPerformingPage: ProductAnalyticsPerformance | null;
  topOrdersPage: ProductAnalyticsPerformance | null;
  topDailyVisitorsPage: ProductAnalyticsPerformance | null;
  mostClickedProductButton: ButtonInsight | null;
  overview: {
    totalVisitors: number;
    totalSessions: number;
    totalPageViews: number;
    totalFormSubmissions: number;
    totalOrders: number;
    totalPublishedPages: number;
    averageConversionRate: number;
    averageInteractionRate: number;
    homepageSearches: number;
    zeroResultSearches: number;
    returningSubscribers: number;
  };
  prediction: AnalyticsPrediction;
}

function startOfLocalDay(dateValue: string | Date) {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(dateValue: string | Date) {
  const date = startOfLocalDay(dateValue);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatShortLabel(dateValue: string | Date) {
  return startOfLocalDay(dateValue).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
  });
}

function isWithinPeriod(dateValue: string, periodDays: number) {
  const currentTime = Date.now();
  const targetTime = new Date(dateValue).getTime();
  const cutoffTime = currentTime - periodDays * 24 * 60 * 60 * 1000;
  return targetTime >= cutoffTime;
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

function roundToWhole(value: number) {
  return Math.max(0, Math.round(value));
}

function calculateGrowthRate(current: number, previous: number) {
  if (!previous && !current) {
    return 0;
  }

  if (!previous) {
    return 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function groupCountMap<T>(items: T[], keyResolver: (item: T) => string) {
  return items.reduce<Map<string, number>>((collection, item) => {
    const key = keyResolver(item);

    if (!key) {
      return collection;
    }

    collection.set(key, (collection.get(key) ?? 0) + 1);
    return collection;
  }, new Map());
}

function groupVisitorCount<T>(items: T[], keyResolver: (item: T) => string, visitorResolver: (item: T) => string) {
  const collection = new Map<string, Set<string>>();

  items.forEach((item) => {
    const key = keyResolver(item);
    const visitorId = visitorResolver(item);

    if (!key || !visitorId) {
      return;
    }

    const visitorSet = collection.get(key) ?? new Set<string>();
    visitorSet.add(visitorId);
    collection.set(key, visitorSet);
  });

  return collection;
}

function linearRegressionSlope(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const sampleSize = values.length;
  const averageX = (sampleSize - 1) / 2;
  const averageY = values.reduce((sum, value) => sum + value, 0) / sampleSize;

  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    numerator += (index - averageX) * (value - averageY);
    denominator += (index - averageX) ** 2;
  });

  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}

function forecastTotal(values: number[], daysForward: number) {
  if (!values.length) {
    return 0;
  }

  const recentValues = values.slice(-Math.min(values.length, 14));
  const average = recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;
  const slope = linearRegressionSlope(recentValues);
  let total = 0;

  for (let dayIndex = 1; dayIndex <= daysForward; dayIndex += 1) {
    total += Math.max(0, average + slope * dayIndex);
  }

  return roundToWhole(total);
}

function getDateWindowTotals(dailySeries: AnalyticsDailyPoint[], key: keyof AnalyticsDailyPoint) {
  const values = dailySeries.map((point) => {
    const value = point[key];
    return typeof value === 'number' ? value : 0;
  });

  const midpoint = Math.max(1, Math.floor(values.length / 2));
  const previousWindow = values.slice(0, midpoint);
  const currentWindow = values.slice(midpoint);

  return {
    currentTotal: currentWindow.reduce((sum, value) => sum + value, 0),
    previousTotal: previousWindow.reduce((sum, value) => sum + value, 0),
  };
}

function buildDailySeries(events: AnalyticsEvent[], periodDays: number) {
  const days = Array.from({ length: periodDays }, (_, index) => {
    const date = startOfLocalDay(new Date(Date.now() - (periodDays - index - 1) * 24 * 60 * 60 * 1000));
    return {
      date: formatDateKey(date),
      shortLabel: formatShortLabel(date),
    };
  });

  const pageViewEvents = events.filter((event) => event.type === 'page_view');
  const productViewEvents = events.filter((event) => event.type === 'product_view');
  const searchEvents = events.filter((event) => event.type === 'search_query');
  const buttonEvents = events.filter((event) => event.type === 'button_click');
  const checkoutEvents = events.filter((event) => event.type === 'checkout_open');
  const formEvents = events.filter((event) => event.type === 'form_submit');
  const sessionEvents = events.filter((event) => event.type === 'session_start');

  const pageViewsByDate = groupCountMap(pageViewEvents, (event) => formatDateKey(event.createdAt));
  const productViewsByDate = groupCountMap(productViewEvents, (event) => formatDateKey(event.createdAt));
  const searchesByDate = groupCountMap(searchEvents, (event) => formatDateKey(event.createdAt));
  const buttonClicksByDate = groupCountMap(buttonEvents, (event) => formatDateKey(event.createdAt));
  const checkoutsByDate = groupCountMap(checkoutEvents, (event) => formatDateKey(event.createdAt));
  const formsByDate = groupCountMap(formEvents, (event) => formatDateKey(event.createdAt));
  const visitorMapByDate = groupVisitorCount(pageViewEvents, (event) => formatDateKey(event.createdAt), (event) => event.visitorId);
  const sessionMapByDate = groupVisitorCount(sessionEvents, (event) => formatDateKey(event.createdAt), (event) => event.sessionId);

  return days.map((day) => ({
    date: day.date,
    shortLabel: day.shortLabel,
    visitors: visitorMapByDate.get(day.date)?.size ?? 0,
    sessions: sessionMapByDate.get(day.date)?.size ?? 0,
    pageViews: pageViewsByDate.get(day.date) ?? 0,
    productViews: productViewsByDate.get(day.date) ?? 0,
    searches: searchesByDate.get(day.date) ?? 0,
    buttonClicks: buttonClicksByDate.get(day.date) ?? 0,
    checkouts: checkoutsByDate.get(day.date) ?? 0,
    formSubmissions: formsByDate.get(day.date) ?? 0,
    orders: formsByDate.get(day.date) ?? 0,
  }));
}

function buildSearchInsights(events: AnalyticsEvent[]) {
  const searchEvents = events.filter((event) => event.type === 'search_query' && event.searchQuery);
  const groupedSearches = new Map<string, AnalyticsEvent[]>();

  searchEvents.forEach((event) => {
    const normalizedQuery = event.searchQuery.trim().toLowerCase();
    const collection = groupedSearches.get(normalizedQuery) ?? [];
    collection.push(event);
    groupedSearches.set(normalizedQuery, collection);
  });

  return Array.from(groupedSearches.entries())
    .map(([query, queryEvents]) => ({
      query,
      count: queryEvents.length,
      uniqueVisitors: new Set(queryEvents.map((event) => event.visitorId)).size,
      averageResults:
        queryEvents.reduce((sum, event) => sum + (event.resultsCount ?? 0), 0) / queryEvents.length,
      zeroResultCount: queryEvents.filter((event) => (event.resultsCount ?? 0) === 0).length,
    }))
    .sort((left, right) => right.count - left.count);
}

function buildButtonInsights(events: AnalyticsEvent[]) {
  const buttonEvents = events.filter((event) => event.type === 'button_click' && event.buttonId);
  const groupedButtons = new Map<string, AnalyticsEvent[]>();

  buttonEvents.forEach((event) => {
    const collectionKey = `${event.pageType}:${event.productSlug}:${event.buttonId}`;
    const collection = groupedButtons.get(collectionKey) ?? [];
    collection.push(event);
    groupedButtons.set(collectionKey, collection);
  });

  return Array.from(groupedButtons.values())
    .map((buttonEventsCollection) => {
      const latestEvent = buttonEventsCollection[buttonEventsCollection.length - 1];
      return {
        buttonId: latestEvent.buttonId,
        buttonLabel: latestEvent.buttonLabel || latestEvent.buttonId,
        clicks: buttonEventsCollection.length,
        productName: latestEvent.productName,
        pageType: latestEvent.pageType,
      } satisfies ButtonInsight;
    })
    .sort((left, right) => right.clicks - left.clicks);
}

function buildSourceInsights(events: AnalyticsEvent[]) {
  const sessionEvents = events.filter((event) => event.type === 'session_start');
  const pageViewEvents = events.filter((event) => event.type === 'page_view');
  const formSubmitEvents = events.filter((event) => event.type === 'form_submit');
  const groupedSources = new Map<string, AnalyticsEvent[]>();

  sessionEvents.forEach((event) => {
    const sourceKey = `${event.sourceType}:${event.sourcePlatform}`;
    const collection = groupedSources.get(sourceKey) ?? [];
    collection.push(event);
    groupedSources.set(sourceKey, collection);
  });

  return Array.from(groupedSources.entries())
    .map(([sourceKey, sourceSessionEvents]) => {
      const [sourceType, sourcePlatform] = sourceKey.split(':');
      const sessionIds = new Set(sourceSessionEvents.map((event) => event.sessionId));
      const visitors = new Set(sourceSessionEvents.map((event) => event.visitorId)).size;
      const matchingPageViews = pageViewEvents.filter((event) => sessionIds.has(event.sessionId));
      const matchingForms = formSubmitEvents.filter((event) => sessionIds.has(event.sessionId));

      return {
        sourcePlatform,
        sourceType,
        sessions: sessionIds.size,
        visitors,
        pageViews: matchingPageViews.length,
        formSubmissions: matchingForms.length,
        conversionRate: percentage(matchingForms.length, sessionIds.size),
      } satisfies SourceInsight;
    })
    .sort((left, right) => right.sessions - left.sessions);
}

function buildCountryInsights(events: AnalyticsEvent[]) {
  const pageViewEvents = events.filter((event) => event.type === 'page_view');
  const formSubmitEvents = events.filter((event) => event.type === 'form_submit');
  const countryCodes = Array.from(
    new Set(events.map((event) => event.countryCode).filter(Boolean)),
  ) as SupportedCountryCode[];

  return countryCodes
    .map((countryCode) => {
      const countryPageViews = pageViewEvents.filter((event) => event.countryCode === countryCode);
      const countryFormSubmissions = formSubmitEvents.filter(
        (event) => event.countryCode === countryCode,
      );

      return {
        countryCode,
        countryName: getLocaleConfig(countryCode).countryName,
        visitors: new Set(countryPageViews.map((event) => event.visitorId)).size,
        pageViews: countryPageViews.length,
        formSubmissions: countryFormSubmissions.length,
      } satisfies CountryInsight;
    })
    .sort((left, right) => right.pageViews - left.pageViews);
}

function buildOrderGeographyInsights(orders = readAdminOrders()) {
  const countryMap = new Map<string, OrderGeographyInsight>();
  const regionMap = new Map<string, OrderGeographyInsight>();

  orders.forEach((order) => {
    const countryName = getLocaleConfig(order.localeCountryCode).countryName;
    const existingCountry = countryMap.get(order.localeCountryCode);

    countryMap.set(order.localeCountryCode, {
      label: countryName,
      countryCode: order.localeCountryCode,
      countryName,
      orders: (existingCountry?.orders ?? 0) + 1,
      revenue: (existingCountry?.revenue ?? 0) + order.finalAmount,
    });

    const regionLabel = order.city?.trim() || 'Unknown Region';
    const regionKey = `${order.localeCountryCode}:${regionLabel.toLowerCase()}`;
    const existingRegion = regionMap.get(regionKey);

    regionMap.set(regionKey, {
      label: regionLabel,
      countryCode: order.localeCountryCode,
      countryName,
      orders: (existingRegion?.orders ?? 0) + 1,
      revenue: (existingRegion?.revenue ?? 0) + order.finalAmount,
    });
  });

  const orderCountryInsights = Array.from(countryMap.values()).sort((left, right) => right.orders - left.orders);
  const orderRegionInsights = Array.from(regionMap.values()).sort((left, right) => right.orders - left.orders);

  return {
    orderCountryInsights,
    orderRegionInsights,
    topOrderCountry: orderCountryInsights[0] ?? null,
    topOrderRegion: orderRegionInsights[0] ?? null,
  };
}

function buildProductPerformance(events: AnalyticsEvent[], storefrontProducts: Product[]) {
  const publishedProducts = storefrontProducts.filter((product) => product.status === 'published');
  const productViewEvents = events.filter((event) => event.type === 'product_view');
  const buttonEvents = events.filter((event) => event.type === 'button_click' && event.pageType === 'product');
  const packageEvents = events.filter((event) => event.type === 'package_select');
  const checkoutEvents = events.filter((event) => event.type === 'checkout_open');
  const formSubmitEvents = events.filter((event) => event.type === 'form_submit');
  const searchEvents = events.filter((event) => event.type === 'search_query' && event.pageType === 'marketplace');
  const today = new Date();

  return publishedProducts
    .map((product) => {
      const matchingPageViews = productViewEvents.filter(
        (event) =>
          event.productSlug === product.slug ||
          event.productId === product.id ||
          event.pagePath === `/product/${product.slug}`,
      );
      const matchingButtons = buttonEvents.filter((event) => event.productSlug === product.slug);
      const matchingPackages = packageEvents.filter((event) => event.productSlug === product.slug);
      const matchingCheckouts = checkoutEvents.filter((event) => event.productSlug === product.slug);
      const matchingForms = formSubmitEvents.filter((event) => event.productSlug === product.slug);
      const matchingSearches = searchEvents.filter((event) => {
        const query = event.searchQuery.trim().toLowerCase();
        if (!query) {
          return false;
        }

        return [
          product.name,
          product.shortDescription,
          product.sections.hero.title,
          product.sections.hero.subtitle,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      });
      const buttonCounts = buildButtonInsights(matchingButtons);
      const interactions =
        matchingButtons.length + matchingPackages.length + matchingCheckouts.length + matchingForms.length;

      return {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        pageViews: matchingPageViews.length,
        uniqueVisitors: new Set(matchingPageViews.map((event) => event.visitorId)).size,
        todayVisitors: new Set(
          matchingPageViews
            .filter((event) => formatDateKey(event.createdAt) === formatDateKey(today))
            .map((event) => event.visitorId),
        ).size,
        searches: matchingSearches.length,
        buttonClicks: matchingButtons.length,
        packageSelections: matchingPackages.length,
        checkoutOpens: matchingCheckouts.length,
        formSubmissions: matchingForms.length,
        orders: matchingForms.length,
        interactionRate: percentage(interactions, Math.max(1, matchingPageViews.length)),
        conversionRate: percentage(matchingForms.length, Math.max(1, matchingPageViews.length)),
        topButtonId: buttonCounts[0]?.buttonId ?? '',
        topButtonLabel: buttonCounts[0]?.buttonLabel ?? '',
      } satisfies ProductAnalyticsPerformance;
    })
    .sort((left, right) => right.pageViews - left.pageViews);
}

function calculateTopPerformingPage(products: ProductAnalyticsPerformance[]) {
  if (!products.length) {
    return null;
  }

  const maxViews = Math.max(...products.map((product) => product.pageViews), 1);
  const maxOrders = Math.max(...products.map((product) => product.orders), 1);
  const maxInteraction = Math.max(...products.map((product) => product.interactionRate), 1);

  return [...products]
    .sort((left, right) => {
      const leftScore =
        left.pageViews / maxViews * 0.35 +
        left.orders / maxOrders * 0.4 +
        left.interactionRate / maxInteraction * 0.25;
      const rightScore =
        right.pageViews / maxViews * 0.35 +
        right.orders / maxOrders * 0.4 +
        right.interactionRate / maxInteraction * 0.25;

      return rightScore - leftScore;
    })[0];
}

function buildPrediction({
  dailySeries,
  productPerformance,
  sourceInsights,
  searchInsights,
  overview,
}: {
  dailySeries: AnalyticsDailyPoint[];
  productPerformance: ProductAnalyticsPerformance[];
  sourceInsights: SourceInsight[];
  searchInsights: SearchInsight[];
  overview: AdminAnalyticsSnapshot['overview'];
}) {
  const visitorsWindow = getDateWindowTotals(dailySeries, 'visitors');
  const ordersWindow = getDateWindowTotals(dailySeries, 'orders');
  const visitorsGrowthRate = calculateGrowthRate(visitorsWindow.currentTotal, visitorsWindow.previousTotal);
  const orderGrowthRate = calculateGrowthRate(ordersWindow.currentTotal, ordersWindow.previousTotal);
  const projectedVisitors7d = forecastTotal(dailySeries.map((point) => point.visitors), 7);
  const projectedOrders7d = forecastTotal(dailySeries.map((point) => point.orders), 7);
  const projectedForms7d = forecastTotal(dailySeries.map((point) => point.formSubmissions), 7);
  const likelyWinnerPage = calculateTopPerformingPage(productPerformance)?.productName || 'No strong page yet';
  const likelyGrowthSource = sourceInsights[0]?.sourcePlatform || 'Direct traffic';
  const topViewedPage = [...productPerformance].sort((left, right) => right.pageViews - left.pageViews)[0] ?? null;
  const topOrderPage = [...productPerformance].sort((left, right) => right.orders - left.orders)[0] ?? null;
  const zeroResultRate = percentage(
    searchInsights.reduce((sum, insight) => sum + insight.zeroResultCount, 0),
    Math.max(1, overview.homepageSearches),
  );

  let focusArea = 'Scale the winning traffic source and maintain page momentum.';
  const recommendations: string[] = [];

  if (topViewedPage && topViewedPage.pageViews >= 10 && topViewedPage.conversionRate < overview.averageConversionRate) {
    focusArea = `Improve conversion on ${topViewedPage.productName}.`;
    recommendations.push(
      `${topViewedPage.productName} is attracting attention but converting below the site average. Tighten the offer framing and bring the order form closer to intent-heavy sections.`,
    );
  }

  if (zeroResultRate >= 25) {
    focusArea = 'Homepage search quality needs attention.';
    recommendations.push(
      'A large share of search queries return weak matches. Expand product titles, keyword coverage, and homepage search cues so visitors find pages faster.',
    );
  }

  if (sourceInsights[0] && sourceInsights[0].sessions >= 5 && sourceInsights[0].conversionRate < overview.averageConversionRate) {
    recommendations.push(
      `${sourceInsights[0].sourcePlatform} is sending the most traffic, but conversion is lagging. Align ad promise, hero copy, and package presentation more tightly.`,
    );
  } else if (sourceInsights[0]) {
    recommendations.push(
      `${sourceInsights[0].sourcePlatform} is currently your strongest acquisition source. Increase spend carefully while protecting conversion quality.`,
    );
  }

  if (topOrderPage && topOrderPage.orders > 0) {
    recommendations.push(
      `${topOrderPage.productName} is leading on completed orders. Use it as the benchmark for future page structure, offer stacking, and CTA placement.`,
    );
  }

  if (overview.returningSubscribers < Math.max(3, overview.totalVisitors * 0.1)) {
    recommendations.push(
      'Returning subscriber volume is still light. Push stronger subscriber capture and token reminders to turn first-time visitors into repeat buyers.',
    );
  }

  const momentumScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        45 +
          visitorsGrowthRate * 0.35 +
          orderGrowthRate * 0.45 +
          overview.averageConversionRate * 0.7,
      ),
    ),
  );

  return {
    projectedVisitors7d,
    projectedOrders7d,
    projectedForms7d,
    visitorsGrowthRate,
    orderGrowthRate,
    momentumScore,
    focusArea,
    likelyWinnerPage,
    likelyGrowthSource,
    recommendations: recommendations.slice(0, 4),
  } satisfies AnalyticsPrediction;
}

export async function readAdminAnalyticsSnapshot(periodDays = 30): Promise<AdminAnalyticsSnapshot> {
  await ensureAdminOrdersLoaded();
  const [events, subscriberSnapshot, storefrontProducts] = await Promise.all([
    readAnalyticsEvents(),
    readAdminSubscribersSnapshot(),
    loadStorefrontProducts(),
  ]);
  const filteredEvents = events.filter((event) => isWithinPeriod(event.createdAt, periodDays));
  const dailySeries = buildDailySeries(filteredEvents, periodDays);
  const productPerformance = buildProductPerformance(filteredEvents, storefrontProducts);
  const searchInsights = buildSearchInsights(filteredEvents);
  const buttonInsights = buildButtonInsights(filteredEvents);
  const sourceInsights = buildSourceInsights(filteredEvents);
  const countryInsights = buildCountryInsights(filteredEvents);
  const { orderCountryInsights, orderRegionInsights, topOrderCountry, topOrderRegion } =
    buildOrderGeographyInsights(readAdminOrders());
  const uniqueVisitors = new Set(
    filteredEvents
      .filter((event) => event.type === 'page_view')
      .map((event) => event.visitorId),
  );
  const uniqueSessions = new Set(
    filteredEvents
      .filter((event) => event.type === 'session_start')
      .map((event) => event.sessionId),
  );
  const pageViewCount = filteredEvents.filter((event) => event.type === 'page_view').length;
  const formSubmissionCount = filteredEvents.filter((event) => event.type === 'form_submit').length;
  const totalOrders = formSubmissionCount;
  const totalPublishedPages = storefrontProducts.filter((product) => product.status === 'published').length;
  const averageConversionRate = percentage(totalOrders, Math.max(1, uniqueVisitors.size));
  const averageInteractionRate =
    productPerformance.length > 0
      ? Number(
          (
            productPerformance.reduce((sum, product) => sum + product.interactionRate, 0) /
            productPerformance.length
          ).toFixed(1),
        )
      : 0;
  const zeroResultSearches = searchInsights.reduce((sum, insight) => sum + insight.zeroResultCount, 0);

  const overview = {
    totalVisitors: uniqueVisitors.size,
    totalSessions: uniqueSessions.size,
    totalPageViews: pageViewCount,
    totalFormSubmissions: formSubmissionCount,
    totalOrders,
    totalPublishedPages,
    averageConversionRate,
    averageInteractionRate,
    homepageSearches: filteredEvents.filter((event) => event.type === 'search_query').length,
    zeroResultSearches,
    returningSubscribers: subscriberSnapshot.metrics.returningCustomers,
  };

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    events,
    filteredEvents,
    dailySeries,
    productPerformance,
    searchInsights,
    buttonInsights,
    sourceInsights,
    countryInsights,
    orderCountryInsights,
    orderRegionInsights,
    topOrderCountry,
    topOrderRegion,
    topPerformingPage: calculateTopPerformingPage(productPerformance),
    topOrdersPage: [...productPerformance].sort((left, right) => right.orders - left.orders)[0] ?? null,
    topDailyVisitorsPage:
      [...productPerformance].sort((left, right) => right.todayVisitors - left.todayVisitors)[0] ?? null,
    mostClickedProductButton:
      buttonInsights.find((button) => button.pageType === 'product') ?? null,
    overview,
    prediction: buildPrediction({
      dailySeries,
      productPerformance,
      sourceInsights,
      searchInsights,
      overview,
    }),
  };
}

export function getAnalyticsDataEventName() {
  return getAnalyticsDataChangeEventName();
}
