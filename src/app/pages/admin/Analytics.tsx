import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../../components/design-system/Button';
import {
  getAnalyticsDataEventName,
  readAdminAnalyticsSnapshot,
  type AdminAnalyticsSnapshot,
  type AnalyticsPrediction,
  type ButtonInsight,
  type ProductAnalyticsPerformance,
  type SearchInsight,
  type SourceInsight,
} from '../../lib/adminAnalytics';
import { cn, formatDate } from '../../lib/utils';

type PeriodOption = 7 | 30 | 90;

const PERIOD_OPTIONS: PeriodOption[] = [7, 30, 90];
const SOURCE_COLORS = ['#0f766e', '#2563eb', '#8b5cf6', '#f97316', '#16a34a', '#ec4899'];
const PRODUCT_COLORS = ['#0f766e', '#2563eb', '#f97316', '#8b5cf6', '#14b8a6', '#7c3aed'];

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatRelativeTime(dateValue: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000));

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: typeof Users;
  tone: 'blue' | 'teal' | 'orange' | 'violet';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'bg-[#eef5ff] text-[#2563eb]'
      : tone === 'orange'
        ? 'bg-[#fff2de] text-[#d97706]'
        : tone === 'violet'
          ? 'bg-[#f4efff] text-[#7c3aed]'
          : 'bg-[#eaf8f3] text-[#0f766e]';

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClassName}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_54px_rgba(15,23,42,0.06)] sm:p-6',
        className,
      )}
    >
      <div className="mb-5">
        <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function HighlightCard({
  label,
  title,
  detail,
  accent,
}: {
  label: string;
  title: string;
  detail: string;
  accent: 'teal' | 'blue' | 'orange';
}) {
  const accentClassName =
    accent === 'blue'
      ? 'from-[#eff6ff] to-white border-[#dbeafe]'
      : accent === 'orange'
        ? 'from-[#fff7ed] to-white border-[#fed7aa]'
        : 'from-[#ecfdf5] to-white border-[#bbf7d0]';

  return (
    <div className={`rounded-[1.6rem] border bg-gradient-to-br p-5 ${accentClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
      {message}
    </div>
  );
}

function ProductPerformanceCard({ product }: { product: ProductAnalyticsPerformance }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">{product.productName}</p>
          <p className="mt-1 text-sm text-slate-500">/{product.productSlug}</p>
        </div>
        <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">
          {product.orders} orders
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[1.1rem] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Visitors</p>
          <p className="mt-2 text-sm font-bold text-slate-950">{formatCompactNumber(product.uniqueVisitors)}</p>
        </div>
        <div className="rounded-[1.1rem] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Interaction</p>
          <p className="mt-2 text-sm font-bold text-slate-950">{formatPercent(product.interactionRate)}</p>
        </div>
        <div className="rounded-[1.1rem] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today</p>
          <p className="mt-2 text-sm font-bold text-slate-950">{product.todayVisitors}</p>
        </div>
        <div className="rounded-[1.1rem] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top CTA</p>
          <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-950">
            {product.topButtonLabel || 'No clicks yet'}
          </p>
        </div>
      </div>
    </div>
  );
}

function SearchInsightCard({ insight }: { insight: SearchInsight }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">{insight.query}</p>
          <p className="mt-1 text-sm text-slate-500">{insight.uniqueVisitors} unique visitors</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {insight.count} searches
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          Avg results: {insight.averageResults.toFixed(1)}
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm">
          Zero-result: {insight.zeroResultCount}
        </span>
      </div>
    </div>
  );
}

function ButtonInsightRow({ insight, maxClicks }: { insight: ButtonInsight; maxClicks: number }) {
  const width = maxClicks > 0 ? `${Math.max(14, (insight.clicks / maxClicks) * 100)}%` : '14%';

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">{insight.buttonLabel}</p>
          <p className="mt-1 text-sm text-slate-500">
            {insight.productName || 'Marketplace'} • {insight.pageType}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {insight.clicks}
        </span>
      </div>
      <div className="mt-4 h-2.5 rounded-full bg-white">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0f766e] via-[#14b8a6] to-[#60a5fa]"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function SourceInsightList({ insights }: { insights: SourceInsight[] }) {
  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <div key={`${insight.sourcePlatform}-${insight.sourceType}`} className="flex items-center gap-3">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-900">{insight.sourcePlatform}</p>
              <p className="text-sm font-semibold text-slate-600">{insight.sessions} sessions</p>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{insight.sourceType}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionPanel({ prediction }: { prediction: AnalyticsPrediction }) {
  const radialData = [{ name: 'Momentum', value: prediction.momentumScore, fill: '#0f766e' }];

  return (
    <SectionCard
      title="Business Prediction Model"
      subtitle="A built-in growth lens that converts traffic and behaviour patterns into practical next moves."
      className="overflow-hidden"
    >
      <div className="grid gap-6 xl:grid-cols-[300px,1fr]">
        <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Momentum score</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={radialData}
                innerRadius="68%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                barSize={22}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={24} />
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-950 text-4xl font-black"
                >
                  {prediction.momentumScore}
                </text>
                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-500 text-sm font-medium"
                >
                  / 100
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm leading-6 text-slate-500">
            Based on traffic direction, order trend, and conversion pressure across the selected period.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Next 7 days</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(prediction.projectedVisitors7d)}</p>
              <p className="mt-1 text-sm text-slate-500">Projected visitors</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Projected orders</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(prediction.projectedOrders7d)}</p>
              <p className="mt-1 text-sm text-slate-500">Forecast form submissions</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Projected forms</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(prediction.projectedForms7d)}</p>
              <p className="mt-1 text-sm text-slate-500">Likely captured orders</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-[#eff6ff] to-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Primary focus area</p>
              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{prediction.focusArea}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  Visitors: {prediction.visitorsGrowthRate > 0 ? '+' : ''}
                  {formatPercent(prediction.visitorsGrowthRate)}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  Orders: {prediction.orderGrowthRate > 0 ? '+' : ''}
                  {formatPercent(prediction.orderGrowthRate)}
                </span>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-[#ecfdf5] to-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Likely winner</p>
              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{prediction.likelyWinnerPage}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Best growth source right now: <span className="font-semibold text-slate-900">{prediction.likelyGrowthSource}</span>
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recommended next actions</p>
            <div className="mt-4 space-y-3">
              {prediction.recommendations.map((recommendation) => (
                <div
                  key={recommendation}
                  className="flex gap-3 rounded-[1.2rem] border border-white bg-white px-4 py-3 shadow-sm"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 flex-none text-[#0f766e]" />
                  <p className="text-sm leading-6 text-slate-600">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function Analytics() {
  const [periodDays, setPeriodDays] = useState<PeriodOption>(30);
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSnapshot = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const nextSnapshot = await readAdminAnalyticsSnapshot(periodDays);
        if (!isActive) {
          return;
        }

        setSnapshot(nextSnapshot);
      } finally {
        if (isActive) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadSnapshot();

    const syncSilently = () => {
      void loadSnapshot(true);
    };

    const intervalId = window.setInterval(syncSilently, 20000);
    window.addEventListener(getAnalyticsDataEventName(), syncSilently);
    window.addEventListener('storage', syncSilently);
    window.addEventListener('focus', syncSilently);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener(getAnalyticsDataEventName(), syncSilently);
      window.removeEventListener('storage', syncSilently);
      window.removeEventListener('focus', syncSilently);
    };
  }, [periodDays]);

  const overview = snapshot?.overview;
  const dailySeries = snapshot?.dailySeries ?? [];
  const productPerformance = snapshot?.productPerformance ?? [];
  const searchInsights = snapshot?.searchInsights ?? [];
  const buttonInsights = snapshot?.buttonInsights ?? [];
  const sourceInsights = snapshot?.sourceInsights ?? [];
  const countryInsights = snapshot?.countryInsights ?? [];
  const orderCountryInsights = snapshot?.orderCountryInsights ?? [];
  const orderRegionInsights = snapshot?.orderRegionInsights ?? [];
  const prediction = snapshot?.prediction;

  const hasData = (snapshot?.filteredEvents.length ?? 0) > 0;
  const conversionChartData = useMemo(
    () =>
      (snapshot?.dailySeries ?? []).map((point) => ({
        ...point,
        conversionRate: point.visitors > 0 ? Number(((point.formSubmissions / point.visitors) * 100).toFixed(1)) : 0,
      })),
    [snapshot],
  );
  const sourceChartData = sourceInsights.slice(0, 6).map((item) => ({
    name: item.sourcePlatform,
    value: item.sessions,
  }));
  const productChartData = productPerformance.slice(0, 6).map((product) => ({
    name: product.productName.length > 18 ? `${product.productName.slice(0, 18)}…` : product.productName,
    visitors: product.uniqueVisitors,
    orders: product.orders,
  }));
  const countryChartData = countryInsights.slice(0, 5).map((country) => ({
    name: country.countryCode,
    visitors: country.visitors,
    forms: country.formSubmissions,
  }));
  const maxButtonClicks = buttonInsights[0]?.clicks ?? 0;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-[#183b57] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              <BrainCircuit className="h-4 w-4" />
              Intelligence Center
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Business analytics built to rank, predict, and focus the next move.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              This dashboard reads live site traffic, product interactions, search intent, form submissions,
              button clicks, and external traffic sources so you can see what is growing, what is leaking,
              and what deserves more budget.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Top performing page</p>
              <p className="mt-3 text-lg font-black text-white">
                {snapshot?.topPerformingPage?.productName ?? 'No product traffic yet'}
              </p>
              <p className="mt-2 text-sm text-white/65">
                {snapshot?.topPerformingPage
                  ? `${snapshot.topPerformingPage.orders} orders • ${formatPercent(snapshot.topPerformingPage.interactionRate)} interaction`
                  : 'Publish pages and drive traffic to unlock rankings.'}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Last refreshed</p>
              <p className="mt-3 text-lg font-black text-white">
                {snapshot ? formatRelativeTime(snapshot.generatedAt) : 'Loading'}
              </p>
              <p className="mt-2 text-sm text-white/65">
                {snapshot ? formatDate(snapshot.generatedAt) : 'Syncing analytics stream'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full max-w-fit rounded-full border border-white/10 bg-white/10 p-1 backdrop-blur">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriodDays(option)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  periodDays === option ? 'bg-white text-slate-950 shadow-sm' : 'text-white/72 hover:text-white',
                )}
              >
                {option} days
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/72 backdrop-blur">
              Live sync every 20s
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                setIsRefreshing(true);
                void readAdminAnalyticsSnapshot(periodDays)
                  .then((nextSnapshot) => {
                    setSnapshot(nextSnapshot);
                  })
                  .finally(() => {
                    setIsRefreshing(false);
                  });
              }}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {isLoading && !snapshot ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`analytics-skeleton-${index}`}
              className="h-40 animate-pulse rounded-[1.75rem] border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Unique visitors"
          value={formatCompactNumber(overview?.totalVisitors ?? 0)}
          subtitle={`${formatCompactNumber(overview?.totalSessions ?? 0)} sessions in the selected window`}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label="Captured orders"
          value={formatCompactNumber(overview?.totalOrders ?? 0)}
          subtitle={`${formatPercent(overview?.averageConversionRate ?? 0)} visitor-to-order conversion`}
          icon={TrendingUp}
          tone="teal"
        />
        <MetricCard
          label="Homepage search use"
          value={formatCompactNumber(overview?.homepageSearches ?? 0)}
          subtitle={`${formatCompactNumber(overview?.zeroResultSearches ?? 0)} zero-result searches detected`}
          icon={Search}
          tone="orange"
        />
        <MetricCard
          label="Returning subscribers"
          value={formatCompactNumber(overview?.returningSubscribers ?? 0)}
          subtitle={`${formatCompactNumber(overview?.totalPublishedPages ?? 0)} published product pages live`}
          icon={Activity}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <HighlightCard
          label="Best performer"
          title={snapshot?.topPerformingPage?.productName ?? 'No page leader yet'}
          detail={
            snapshot?.topPerformingPage
              ? `${snapshot.topPerformingPage.orders} orders with ${formatPercent(snapshot.topPerformingPage.interactionRate)} interaction rate.`
              : 'Drive visitors to your published pages to surface a clear winner.'
          }
          accent="teal"
        />
        <HighlightCard
          label="Most daily visitors"
          title={snapshot?.topDailyVisitorsPage?.productName ?? 'No daily leader yet'}
          detail={
            snapshot?.topDailyVisitorsPage
              ? `${snapshot.topDailyVisitorsPage.todayVisitors} visitors today on the current top page.`
              : 'No product page has daily visit signals yet.'
          }
          accent="blue"
        />
        <HighlightCard
          label="Most clicked CTA"
          title={snapshot?.mostClickedProductButton?.buttonLabel ?? 'No CTA activity yet'}
          detail={
            snapshot?.mostClickedProductButton
              ? `${snapshot.mostClickedProductButton.clicks} clicks on ${snapshot.mostClickedProductButton.productName || 'storefront buttons'}.`
              : 'Once visitors begin clicking calls-to-action, the strongest CTA will appear here.'
          }
          accent="orange"
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.45fr,1fr]">
        <SectionCard
          title="Traffic, visitors, and daily conversions"
          subtitle="Daily site visitors, page views, and product order capture across the selected period."
        >
          {hasData ? (
            <div className="space-y-6">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries}>
                    <defs>
                      <linearGradient id="analyticsVisitors" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="analyticsPageViews" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="#64748b"
                      tickFormatter={(value: number) => formatCompactNumber(value)}
                    />
                    <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.08)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="visitors" stroke="#2563eb" fill="url(#analyticsVisitors)" strokeWidth={3} name="Visitors" />
                    <Area type="monotone" dataKey="pageViews" stroke="#0f766e" fill="url(#analyticsPageViews)" strokeWidth={3} name="Page views" />
                    <Line type="monotone" dataKey="formSubmissions" stroke="#f97316" strokeWidth={3} dot={false} name="Form submissions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.3rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Page views</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatCompactNumber(overview?.totalPageViews ?? 0)}</p>
                </div>
                <div className="rounded-[1.3rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Product views</p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {formatCompactNumber(dailySeries.reduce((sum, point) => sum + point.productViews, 0))}
                  </p>
                </div>
                <div className="rounded-[1.3rem] bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Checkout opens</p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {formatCompactNumber(dailySeries.reduce((sum, point) => sum + point.checkouts, 0))}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No analytics traffic has been captured yet. Open the storefront, visit product pages, and submit sample orders to populate this dashboard." />
          )}
        </SectionCard>

        <SectionCard
          title="Engagement flow"
          subtitle="Homepage search activity, button clicks, and checkout movement per day."
        >
          {hasData ? (
            <div className="space-y-5">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversionChartData}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(value: number) => formatCompactNumber(value)} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(value: number) => `${value}%`} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.08)' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="searches" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="buttonClicks" stroke="#0f766e" strokeWidth={3} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="checkouts" stroke="#f97316" strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#2563eb" strokeWidth={3} strokeDasharray="8 6" dot={false} name="Conversion rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Most clicked product CTA</p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {snapshot?.mostClickedProductButton?.buttonLabel ?? 'No CTA data yet'}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Homepage search quality</p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {overview?.homepageSearches ? formatPercent(((overview.zeroResultSearches ?? 0) / overview.homepageSearches) * 100) : '0.0%'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Zero-result search share</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="Engagement charts will appear as soon as visitors search, click CTAs, and open checkout on your live pages." />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard
          title="External traffic sources"
          subtitle="See which social platforms, ad sources, and referrals are sending visitors into the site."
        >
          {sourceChartData.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceChartData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={102} paddingAngle={4}>
                      {sourceChartData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.08)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-5">
                <SourceInsightList insights={sourceInsights.slice(0, 6)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {sourceInsights.slice(0, 4).map((source) => (
                    <div key={`${source.sourcePlatform}-${source.sourceType}-stats`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-950">{source.sourcePlatform}</p>
                      <p className="mt-1 text-sm text-slate-500">{source.visitors} visitors</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatPercent(source.conversionRate)} conversion
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="External source analytics will appear after visitors arrive through direct, social, search, or campaign traffic." />
          )}
        </SectionCard>

        <SectionCard
          title="Country and market distribution"
          subtitle="Traffic and form submissions split by detected country or market."
        >
          {countryChartData.length > 0 ? (
            <div className="space-y-5">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryChartData} layout="vertical" margin={{ left: 6, right: 6 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} stroke="#64748b" width={40} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.08)' }} />
                    <Legend />
                    <Bar dataKey="visitors" fill="#2563eb" radius={[10, 10, 10, 10]} />
                    <Bar dataKey="forms" fill="#0f766e" radius={[10, 10, 10, 10]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2">
                {countryInsights.map((country) => (
                  <span key={country.countryCode} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    {country.countryName}: {country.visitors} visitors
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="Country distribution appears once visitors begin reaching the site through the localized storefront." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Order geography intelligence"
        subtitle="Which country and which state or region are producing the strongest order volume right now."
      >
        {orderCountryInsights.length > 0 || orderRegionInsights.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top order country</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{snapshot?.topOrderCountry?.label ?? 'No country data yet'}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {snapshot?.topOrderCountry
                    ? `${snapshot.topOrderCountry.orders} orders • ${formatCompactNumber(snapshot.topOrderCountry.revenue)} total value`
                    : 'Order geography will appear once real orders are managed inside the admin.'}
                </p>
              </div>
              <div className="space-y-3">
                {orderCountryInsights.slice(0, 5).map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.orders} orders</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{formatCompactNumber(item.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top state / region</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{snapshot?.topOrderRegion?.label ?? 'No region data yet'}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {snapshot?.topOrderRegion
                    ? `${snapshot.topOrderRegion.countryName} • ${snapshot.topOrderRegion.orders} orders`
                    : 'State and region order concentration will show up here automatically.'}
                </p>
              </div>
              <div className="space-y-3">
                {orderRegionInsights.slice(0, 5).map((item) => (
                  <div key={`${item.countryCode}-${item.label}`} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.countryName}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{item.orders} orders</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState message="Order geography will appear once the admin begins receiving and managing real orders across regions." />
        )}
      </SectionCard>

      <SectionCard
        title="Published product page leaderboard"
        subtitle="Ranked by product traffic, orders, and interaction quality so you can see which page deserves more spend."
      >
        {productPerformance.length > 0 ? (
          <div className="space-y-6">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productChartData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                  <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.08)' }} />
                  <Legend />
                  <Bar dataKey="visitors" radius={[10, 10, 0, 0]} name="Visitors">
                    {productChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="orders" fill="#0f766e" radius={[10, 10, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Product page</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Visitors</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Today</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Orders</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Interaction</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top button</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {productPerformance.map((product) => (
                    <tr key={product.productId} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{product.productName}</p>
                        <p className="mt-1 text-sm text-slate-500">/{product.productSlug}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{product.uniqueVisitors}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{product.todayVisitors}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{product.orders}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{formatPercent(product.interactionRate)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{product.topButtonLabel || 'No clicks yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {productPerformance.map((product) => (
                <ProductPerformanceCard key={product.productId} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState message="Published product pages will begin ranking here once they receive product views, button clicks, and order submissions." />
        )}
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-2">
        <SectionCard
          title="Homepage search intelligence"
          subtitle="What visitors are typing into homepage search and how often those searches fail to match products."
        >
          {searchInsights.length > 0 ? (
            <div className="space-y-4">
              {searchInsights.slice(0, 6).map((insight) => (
                <SearchInsightCard key={insight.query} insight={insight} />
              ))}
            </div>
          ) : (
            <EmptyState message="Search analytics will appear after visitors begin using the marketplace search field." />
          )}
        </SectionCard>

        <SectionCard
          title="Top buttons and CTA pressure"
          subtitle="The most clicked buttons across product pages and the storefront, ranked by real visitor interactions."
        >
          {buttonInsights.length > 0 ? (
            <div className="space-y-4">
              {buttonInsights.slice(0, 8).map((insight) => (
                <ButtonInsightRow
                  key={`${insight.pageType}-${insight.buttonId}-${insight.productName}`}
                  insight={insight}
                  maxClicks={maxButtonClicks}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="CTA analytics will show here once visitors begin interacting with your product and storefront buttons." />
          )}
        </SectionCard>
      </div>

      {prediction ? <PredictionPanel prediction={prediction} /> : null}

      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-[0_22px_54px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Decision summary</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">What this dashboard is telling you right now</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            <Trophy className="h-4 w-4" />
            {snapshot?.topPerformingPage?.productName ?? 'Awaiting a page leader'}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2563eb]">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Best traffic source</p>
                <p className="text-sm text-slate-500">{sourceInsights[0]?.sourcePlatform ?? 'No source data yet'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf8f3] text-[#0f766e]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Top orders page</p>
                <p className="text-sm text-slate-500">{snapshot?.topOrdersPage?.productName ?? 'No order leader yet'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff2de] text-[#d97706]">
                <MousePointerClick className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Most clicked button</p>
                <p className="text-sm text-slate-500">{snapshot?.mostClickedProductButton?.buttonLabel ?? 'No click leader yet'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          Focus next on <span className="font-semibold text-slate-900">{prediction?.focusArea ?? 'driving more qualified traffic into your published pages'}</span>.
          The current winner is <span className="font-semibold text-slate-900">{prediction?.likelyWinnerPage ?? 'still emerging'}</span>, and the source with the strongest growth opportunity is{' '}
          <span className="font-semibold text-slate-900">{prediction?.likelyGrowthSource ?? 'still emerging'}</span>.
          Use the product leaderboard and source panels above to decide where to improve creatives, budgets, and CTA placement.
        </div>
      </section>
    </div>
  );
}
