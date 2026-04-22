import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CircleDollarSign,
  Globe2,
  LayoutDashboard,
  Package,
  PackagePlus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getAnalyticsDataEventName,
  readAdminAnalyticsSnapshot,
  type AdminAnalyticsSnapshot,
} from '../../lib/adminAnalytics';
import {
  ADMIN_NOTIFICATIONS_CHANGE_EVENT,
  readAdminNotificationsSnapshot,
  type AdminNotificationSnapshot,
} from '../../lib/adminNotifications';
import {
  ADMIN_ORDERS_DATA_CHANGE_EVENT,
  ensureAdminOrdersLoaded,
  readAdminOrders,
  type AdminManagedOrder,
} from '../../lib/adminOrders';
import {
  ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT,
  ensureAdminProductDraftsLoaded,
  readAdminProductDrafts,
} from '../../lib/adminProductDrafts';
import {
  FINANCE_DATA_CHANGE_EVENT,
  readFinanceSnapshot,
  type FinanceSnapshot,
} from '../../lib/adminFinance';
import {
  readAdminSubscribersSnapshot,
  type AdminSubscriberSnapshot,
} from '../../lib/adminSubscribers';
import { useBrandingSettings } from '../../lib/branding';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  SUBSCRIBER_DATA_CHANGE_EVENT,
  formatSubscriberActivityLabel,
} from '../../lib/subscriberTelemetry';
import { cn, formatCurrency, formatCurrencyByCode, formatDate } from '../../lib/utils';

type DashboardPeriod = 7 | 30;

interface DashboardState {
  analytics: AdminAnalyticsSnapshot;
  finance: FinanceSnapshot;
  notifications: AdminNotificationSnapshot;
  orders: AdminManagedOrder[];
  publishedPages: number;
  draftPages: number;
  subscribers: AdminSubscriberSnapshot;
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'blue' | 'emerald' | 'orange' | 'violet';
  icon: typeof Package;
}) {
  const toneClass = {
    blue: 'bg-[#eef4ff] text-[#2B63D9]',
    emerald: 'bg-[#ecfdf5] text-[#0E7C7B]',
    orange: 'bg-[#fff4ea] text-[#f97316]',
    violet: 'bg-[#f5f3ff] text-[#8b5cf6]',
  }[tone];

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem]', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateValue: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(dateValue).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function orderStatusClassName(status: AdminManagedOrder['status']) {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700';
    case 'confirmed':
      return 'bg-cyan-100 text-cyan-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
      return 'bg-slate-200 text-slate-700';
    case 'failed':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-orange-100 text-orange-700';
  }
}

export function Dashboard() {
  const branding = useBrandingSettings();
  const { isDarkMode } = useAppTheme();
  const [period, setPeriod] = useState<DashboardPeriod>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async (mode: 'initial' | 'silent' = 'initial') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);

      try {
        await Promise.all([ensureAdminProductDraftsLoaded(), ensureAdminOrdersLoaded()]);
        const drafts = readAdminProductDrafts();
        const orders = readAdminOrders();
        const [finance, analytics, notifications, subscribers] = await Promise.all([
          readFinanceSnapshot(),
          readAdminAnalyticsSnapshot(period),
          readAdminNotificationsSnapshot(),
          readAdminSubscribersSnapshot(),
        ]);

        if (!isMounted) return;

        setDashboard({
          analytics,
          finance,
          notifications,
          orders,
          publishedPages: drafts.filter((draft) => draft.status === 'published').length,
          draftPages: drafts.filter((draft) => draft.status === 'draft').length,
          subscribers,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void load('initial');

    const sync = () => {
      void load('silent');
    };

    const events = [
      FINANCE_DATA_CHANGE_EVENT,
      ADMIN_ORDERS_DATA_CHANGE_EVENT,
      ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT,
      ADMIN_NOTIFICATIONS_CHANGE_EVENT,
      SUBSCRIBER_DATA_CHANGE_EVENT,
      getAnalyticsDataEventName(),
      'storage',
    ];

    events.forEach((eventName) => window.addEventListener(eventName, sync as EventListener));
    const timer = window.setInterval(sync, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, sync as EventListener));
    };
  }, [period]);

  const derived = useMemo(() => {
    if (!dashboard) return null;

    const country = dashboard.finance.settings.reportingCountryCode;
    const topSource = dashboard.analytics.sourceInsights[0];

    return {
      country,
      todayRevenue: formatCurrency(dashboard.finance.todaySummary.totalSales, country),
      pendingIncome: formatCurrency(dashboard.finance.metrics.pendingIncome, country),
      netProfit: formatCurrency(dashboard.finance.metrics.pureProfit, country),
      totalSales: formatCurrency(dashboard.finance.metrics.totalSales, country),
      topSource: topSource ? `${topSource.sourcePlatform} (${topSource.sessions} sessions)` : 'Direct traffic',
      topPage: dashboard.analytics.topPerformingPage?.productName ?? 'No clear leader yet',
      newOrders: dashboard.orders.filter((order) => order.status === 'new').length,
    };
  }, [dashboard]);

  if (isLoading || !dashboard || !derived) {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`dashboard-skeleton-${index + 1}`} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 h-8 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trafficData = dashboard.analytics.dailySeries.map((point) => ({
    label: point.shortLabel,
    visitors: point.visitors,
    submissions: point.formSubmissions,
  }));
  const financeData = dashboard.finance.monthlyReports.map((report) => ({
    label: report.label,
    sales: report.sales,
    expenses: report.expenses,
    profit: report.netProfit,
  }));
  const recentOrders = dashboard.orders.slice(0, 5);
  const recentNotifications = dashboard.notifications.notifications.slice(0, 4);
  const recentSubscriberActivity = dashboard.subscribers.todayActivities.slice(0, 4);
  const priorityItems = [
    dashboard.notifications.unreadCount > 0
      ? {
          label: `${dashboard.notifications.unreadCount} unread notification${dashboard.notifications.unreadCount > 1 ? 's' : ''}`,
          description: 'Open settings to review the notification center and admin alert controls.',
          href: '/admin/settings',
          icon: Bell,
          tone: 'blue',
        }
      : null,
    dashboard.finance.alerts.length > 0
      ? {
          label: `${dashboard.finance.alerts.length} finance alert${dashboard.finance.alerts.length > 1 ? 's' : ''}`,
          description: dashboard.finance.alerts[0],
          href: '/admin/finance',
          icon: AlertTriangle,
          tone: 'orange',
        }
      : null,
    derived.newOrders > 0
      ? {
          label: `${derived.newOrders} new order${derived.newOrders > 1 ? 's' : ''}`,
          description: 'Move fresh orders into confirmed or processing after recording the order expense.',
          href: '/admin/orders',
          icon: ShoppingBag,
          tone: 'emerald',
        }
      : null,
    dashboard.draftPages > 0
      ? {
          label: `${dashboard.draftPages} draft page${dashboard.draftPages > 1 ? 's' : ''}`,
          description: 'Publish stronger pages so they start collecting traffic from the homepage.',
          href: '/admin/products',
          icon: Package,
          tone: 'violet',
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    description: string;
    href: string;
    icon: typeof Package;
    tone: 'blue' | 'emerald' | 'orange' | 'violet';
  }>;

  return (
    <div className="space-y-8">
      <section
        className={cn(
          'overflow-hidden rounded-[2.2rem] border p-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)] md:p-8',
          isDarkMode
            ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(43,99,217,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,124,123,0.18),transparent_32%),linear-gradient(135deg,#0f141b,rgba(21,27,34,0.98))]'
            : 'border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(43,99,217,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,124,123,0.14),transparent_32%),linear-gradient(135deg,#ffffff,rgba(248,250,252,0.98))]'
        )}
      >
        <div className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
          <div>
            <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-950 text-white')}>
              <LayoutDashboard className="h-3.5 w-3.5" />
              Premium Admin Dashboard
            </div>
            <h1 className={cn('mt-5 max-w-3xl text-3xl font-black tracking-tight md:text-5xl', isDarkMode ? 'text-white' : 'text-slate-950')}>
              {branding.companyName} command center built for clearer decisions and friendlier daily work
            </h1>
            <p className={cn('mt-4 max-w-2xl text-sm leading-7 md:text-base', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              Follow live orders, traffic, revenue, subscribers, and admin alerts without jumping across pages just to know what needs action next.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/admin/products/create" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0E7C7B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6968]">
                <PackagePlus className="h-4 w-4" />
                Create Product Page
              </Link>
              <Link to="/admin/orders" className={cn('inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition', isDarkMode ? 'border-white/12 bg-[#161b22] text-slate-100 hover:bg-[#1b2330]' : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50')}>
                <ShoppingBag className="h-4 w-4" />
                Open Orders
              </Link>
              <Link to="/admin/analytics" className={cn('inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition', isDarkMode ? 'border-white/12 bg-[#161b22] text-slate-100 hover:bg-[#1b2330]' : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50')}>
                <TrendingUp className="h-4 w-4" />
                Open Analytics
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm', isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-white/90 text-slate-600')}>
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Refreshing live data' : `Last refresh ${formatRelativeTime(dashboard.analytics.generatedAt)}`}
              </span>
              <span className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm', isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-white/90 text-slate-600')}>
                <Globe2 className="h-3.5 w-3.5" />
                {derived.topSource}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={cn('rounded-[1.65rem] border p-5 shadow-sm backdrop-blur', isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-white/70 bg-white/85')}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today revenue</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{derived.todayRevenue}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Pure profit today is {formatCurrency(dashboard.finance.todaySummary.pureProfit, derived.country)}.</p>
            </div>
            <div className={cn('rounded-[1.65rem] border p-5 shadow-sm backdrop-blur', isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-white/70 bg-white/85')}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top performing page</p>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{derived.topPage}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Best page based on traffic, engagement, and conversion.</p>
            </div>
            <div className={cn('rounded-[1.65rem] border p-5 shadow-sm backdrop-blur', isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-white/70 bg-white/85')}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unread alerts</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{dashboard.notifications.unreadCount}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Orders, finance, subscribers, and draft activity are combined here.</p>
            </div>
            <div className={cn('rounded-[1.65rem] border p-5 shadow-sm backdrop-blur', isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-white/70 bg-white/85')}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pending income</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{derived.pendingIncome}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{dashboard.finance.metrics.processingOrders} confirmed or processing orders are still in motion.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Published pages" value={String(dashboard.publishedPages)} description={`${dashboard.draftPages} drafts still private`} tone="blue" icon={Package} />
        <Stat label="Net profit" value={derived.netProfit} description={`${dashboard.finance.metrics.deliveredOrders} delivered orders realized`} tone="emerald" icon={CircleDollarSign} />
        <Stat label="Returning subscribers" value={String(dashboard.subscribers.metrics.returningCustomers)} description={`${dashboard.subscribers.metrics.activeToday} active today`} tone="violet" icon={Users} />
        <Stat label="Total sales" value={derived.totalSales} description={`${dashboard.analytics.overview.totalVisitors} visitors in ${period} days`} tone="orange" icon={Wallet} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Panel
          title="Traffic pulse"
          subtitle="Visitors and form submissions moving across the active reporting window."
          action={
            <div className="flex items-center gap-2">
              {[7, 30].map((value) => (
                <button
                  key={`dashboard-period-${value}`}
                  type="button"
                  onClick={() => setPeriod(value as DashboardPeriod)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    period === value ? 'bg-slate-950 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {value}d
                </button>
              ))}
            </div>
          }
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="dashVisitors" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2B63D9" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2B63D9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashForms" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0E7C7B" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#0E7C7B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0' }} />
                <Area type="monotone" dataKey="visitors" stroke="#2B63D9" fill="url(#dashVisitors)" strokeWidth={3} />
                <Area type="monotone" dataKey="submissions" stroke="#0E7C7B" fill="url(#dashForms)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Priority queue"
          subtitle="The fastest way to see what needs action next."
        >
          <div className="space-y-3">
            {priorityItems.length > 0 ? priorityItems.map((item) => {
              const Icon = item.icon;
              const toneClass = {
                blue: 'bg-[#eef4ff] text-[#2B63D9]',
                emerald: 'bg-[#ecfdf5] text-[#0E7C7B]',
                orange: 'bg-[#fff4ea] text-[#f97316]',
                violet: 'bg-[#f5f3ff] text-[#8b5cf6]',
              }[item.tone];

              return (
                <Link key={item.label} to={item.href} className="flex items-start gap-4 rounded-[1.45rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem]', toneClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 flex-none text-slate-400" />
                </Link>
              );
            }) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <p className="text-lg font-bold text-slate-950">No urgent queue item</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">The dashboard is calm right now. Keep watching traffic, orders, and finance signals.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <Panel
          title="Finance pulse"
          subtitle="Monthly sales, expenses, and profit in one cleaner business view."
          action={<Link to="/admin/finance" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"><Wallet className="h-4 w-4" />Open finance</Link>}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0' }} />
                <Bar dataKey="sales" radius={[10, 10, 0, 0]} fill="#0E7C7B" />
                <Bar dataKey="expenses" radius={[10, 10, 0, 0]} fill="#F97316" />
                <Bar dataKey="profit" radius={[10, 10, 0, 0]} fill="#2B63D9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Recent orders"
          subtitle="Latest customer submissions with clearer status and amount context."
          action={<Link to="/admin/orders" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"><ShoppingBag className="h-4 w-4" />View all orders</Link>}
        >
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link key={order.orderNumber} to="/admin/orders" className="flex flex-col gap-3 rounded-[1.45rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-slate-950">{order.customerName}</p>
                    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize', orderStatusClassName(order.status))}>{order.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{order.productName} • {order.packageTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">{order.orderNumber} • {order.city} • {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-lg font-black text-slate-950">
                    {formatCurrencyByCode(order.finalAmountInStoreCurrency, order.storeCurrency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Qty {order.quantity} • {formatCurrencyByCode(order.finalAmount, order.transactionCurrency)} original
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <Panel
          title="Notifications"
          subtitle="Fresh admin alerts from orders, finance, subscribers, and product drafts."
          action={<Link to="/admin/settings" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"><Bell className="h-4 w-4" />Open settings</Link>}
        >
          <div className="space-y-3">
            {recentNotifications.map((notification) => (
              <Link key={notification.id} to={notification.href} className="block rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-950">{notification.title}</p>
                  {notification.unread ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#2B63D9]" /> : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                <p className="mt-2 text-xs font-medium text-slate-400">{formatRelativeTime(notification.createdAt)}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title="Subscriber activity"
          subtitle="Live movement from your email list and returning customers."
          action={<Link to="/admin/subscribers" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"><Users className="h-4 w-4" />Open subscribers</Link>}
        >
          <div className="space-y-3">
            {recentSubscriberActivity.map((activity) => (
              <Link key={activity.id} to="/admin/subscribers" className="block rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                <p className="text-sm font-bold text-slate-950">{formatSubscriberActivityLabel(activity)}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {(activity.fullName || activity.email) || 'Subscriber'}{activity.productName ? ` • ${activity.productName}` : ''}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400">{formatRelativeTime(activity.createdAt)}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Winners at a glance"
        subtitle="A quick look at the strongest page, most recent traffic window, and where orders are landing."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-5">
            <Trophy className="h-5 w-5 text-[#f97316]" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top page</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{derived.topPage}</p>
            <p className="mt-2 text-sm text-slate-600">Best overall performer in the active analytics window.</p>
          </div>
          <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-5">
            <Sparkles className="h-5 w-5 text-[#2B63D9]" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top source</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{derived.topSource}</p>
            <p className="mt-2 text-sm text-slate-600">Current leading traffic source from the active period.</p>
          </div>
          <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-5">
            <Globe2 className="h-5 w-5 text-[#0E7C7B]" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top order market</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{dashboard.finance.geography.topCountry?.label ?? 'No country data yet'}</p>
            <p className="mt-2 text-sm text-slate-600">{dashboard.finance.geography.topCountry ? `${dashboard.finance.geography.topCountry.orders} orders` : 'Order regions will appear as sales grow.'}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
