import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Mail,
  Repeat2,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { SubscriberDetailModal } from '../../components/admin/SubscriberDetailModal';
import { Button } from '../../components/design-system/Button';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  buildSubscribersCsv,
  readAdminSubscribersSnapshot,
  type AdminSubscriberProfile,
  type AdminSubscriberSnapshot,
  type SubscriberSegment,
} from '../../lib/adminSubscribers';
import {
  SUBSCRIBER_DATA_CHANGE_EVENT,
  formatSubscriberActivityLabel,
  type SubscriberActivityRecord,
  type SubscriberLifecycleStatus,
  updateSubscriberManagementRecord,
} from '../../lib/subscriberTelemetry';
import { formatCurrency, formatDate } from '../../lib/utils';

const DIRECTORY_PAGE_SIZE = 10;

function formatTime(dateValue: string) {
  return new Date(dateValue).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isSameLocalDay(dateValue: string, target: Date) {
  const sourceDate = new Date(dateValue);

  return (
    sourceDate.getFullYear() === target.getFullYear() &&
    sourceDate.getMonth() === target.getMonth() &&
    sourceDate.getDate() === target.getDate()
  );
}

function getStatusClassName(status: SubscriberLifecycleStatus) {
  switch (status) {
    case 'vip':
      return 'bg-emerald-100 text-emerald-700';
    case 'paused':
      return 'bg-amber-100 text-amber-700';
    case 'blocked':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}

function getSegmentClassName(segment: SubscriberSegment) {
  switch (segment) {
    case 'high-value':
      return 'bg-[#eef6dc] text-[#648b28]';
    case 'returning':
      return 'bg-[#edf4ff] text-[#2967c8]';
    case 'token-user':
      return 'bg-[#fff2de] text-[#d97706]';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getActivityDescription(activity: SubscriberActivityRecord) {
  if (activity.type === 'page_view') {
    return activity.pagePath || 'Visited a storefront page';
  }

  if (activity.type === 'product_view') {
    return activity.productName || 'Viewed a product page';
  }

  if (activity.type === 'package_selected') {
    return activity.packageTitle || 'Selected a package';
  }

  if (activity.type === 'order_submitted') {
    return activity.orderNumber || 'Submitted an order';
  }

  return activity.productName || activity.pagePath || 'Subscriber activity captured';
}

function matchesSubscriberSearch(subscriber: AdminSubscriberProfile, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    subscriber.record.fullName,
    subscriber.record.email,
    subscriber.record.token,
    subscriber.record.location,
    subscriber.sourceProductName,
    subscriber.lastProductViewed,
    subscriber.usedProducts.join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone: 'blue' | 'emerald' | 'orange' | 'slate';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'bg-[#eef5ff] text-[#2B63D9]'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'orange'
          ? 'bg-orange-50 text-orange-700'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClassName}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function SubscriberActivityCard({
  activity,
  onOpen,
}: {
  activity: SubscriberActivityRecord;
  onOpen: (activity: SubscriberActivityRecord) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(activity)}
      className="w-full rounded-[1.6rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">{activity.fullName || activity.email}</p>
          <p className="mt-1 text-sm text-slate-600">{formatSubscriberActivityLabel(activity)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {formatTime(activity.createdAt)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{getActivityDescription(activity)}</p>
    </button>
  );
}

function SubscriberMobileCard({
  subscriber,
  onOpen,
}: {
  subscriber: AdminSubscriberProfile;
  onOpen: (subscriber: AdminSubscriberProfile) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(subscriber)}
      className="w-full rounded-[1.7rem] border border-slate-200 bg-white p-5 text-left shadow-[0_16px_38px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">
            {subscriber.record.fullName || subscriber.record.email}
          </p>
          <p className="mt-1 text-sm text-slate-600">{subscriber.record.email}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(subscriber.status)}`}>
          {subscriber.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSegmentClassName(subscriber.segment)}`}>
          {subscriber.segment.replace('-', ' ')}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {subscriber.record.token}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Orders</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.totalOrders}</p>
        </div>
        <div className="rounded-[1.2rem] bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Remaining</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.record.remainingUses}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{formatDate(subscriber.lastActiveAt)}</p>
        <p className="text-sm font-semibold text-slate-900">Manage</p>
      </div>
    </button>
  );
}

export function Subscribers() {
  const { isDarkMode } = useAppTheme();
  const [snapshot, setSnapshot] = useState<AdminSubscriberSnapshot>({
    subscribers: [],
    todayActivities: [],
    metrics: {
      totalSubscribers: 0,
      activeToday: 0,
      returningCustomers: 0,
      tokenUsers: 0,
      totalEmailList: 0,
      newToday: 0,
      subscriberRevenue: 0,
    },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriberLifecycleStatus>('all');
  const [segmentFilter, setSegmentFilter] = useState<'all' | SubscriberSegment>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active_today' | 'used_token' | 'returning' | 'dormant'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubscriber, setSelectedSubscriber] = useState<AdminSubscriberProfile | null>(null);

  useEffect(() => {
    const loadSnapshot = async () => {
      setSnapshot(await readAdminSubscribersSnapshot());
    };

    void loadSnapshot();

    const intervalId = window.setInterval(() => {
      void loadSnapshot();
    }, 20000);
    const handleStorage = () => {
      void loadSnapshot();
    };
    const handleFocus = () => {
      void loadSnapshot();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener(SUBSCRIBER_DATA_CHANGE_EVENT, handleStorage as EventListener);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SUBSCRIBER_DATA_CHANGE_EVENT, handleStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, segmentFilter, activityFilter]);

  const filteredSubscribers = useMemo(() => {
    return snapshot.subscribers.filter((subscriber) => {
      if (!matchesSubscriberSearch(subscriber, searchQuery)) {
        return false;
      }

      if (statusFilter !== 'all' && subscriber.status !== statusFilter) {
        return false;
      }

      if (segmentFilter !== 'all' && subscriber.segment !== segmentFilter) {
        return false;
      }

      if (activityFilter === 'active_today' && !isSameLocalDay(subscriber.lastActiveAt, new Date())) {
        return false;
      }

      if (activityFilter === 'used_token' && subscriber.discountedOrders === 0) {
        return false;
      }

      if (activityFilter === 'returning' && !subscriber.isReturningCustomer) {
        return false;
      }

      if (
        activityFilter === 'dormant' &&
        Date.now() - new Date(subscriber.lastActiveAt).getTime() < 7 * 24 * 60 * 60 * 1000
      ) {
        return false;
      }

      return true;
    });
  }, [activityFilter, searchQuery, segmentFilter, snapshot.subscribers, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / DIRECTORY_PAGE_SIZE));
  const paginatedSubscribers = filteredSubscribers.slice(
    (currentPage - 1) * DIRECTORY_PAGE_SIZE,
    currentPage * DIRECTORY_PAGE_SIZE,
  );

  const handleCopyEmailList = async () => {
    const emails = filteredSubscribers.map((subscriber) => subscriber.record.email).join(', ');
    await navigator.clipboard.writeText(emails);
  };

  const handleExportCsv = () => {
    const csvContent = buildSubscribersCsv(filteredSubscribers);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = 'subscriber-list.csv';
    link.click();
    URL.revokeObjectURL(csvUrl);
  };

  const handleOpenActivitySubscriber = (activity: SubscriberActivityRecord) => {
    const matchedSubscriber = snapshot.subscribers.find(
      (subscriber) => subscriber.record.token === activity.token,
    );

    if (matchedSubscriber) {
      setSelectedSubscriber(matchedSubscriber);
    }
  };

  const handleSaveManagement = async (
    token: string,
    update: {
      status: SubscriberLifecycleStatus;
      notes: string;
    },
  ) => {
    updateSubscriberManagementRecord(token, update);
    const nextSnapshot = await readAdminSubscribersSnapshot();
    setSnapshot(nextSnapshot);
    setSelectedSubscriber(
      nextSnapshot.subscribers.find((subscriber) => subscriber.record.token === token) ?? null,
    );
  };

  return (
    <div className="space-y-8">
      <div
        className={`rounded-[2rem] border p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-7 ${
          isDarkMode
            ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(43,99,217,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,124,123,0.18),transparent_32%),linear-gradient(135deg,#0f141b,rgba(21,27,34,0.98))]'
            : 'border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(239,246,255,0.95))]'
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white ${isDarkMode ? 'bg-white/10' : 'bg-slate-950'}`}>
              <Users className="h-3.5 w-3.5" />
              Subscriber Control
            </div>
            <h1 className={`mt-4 text-3xl font-black tracking-tight md:text-4xl ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
              Grow, monitor, and manage your entire subscriber audience from one premium workspace
            </h1>
            <p className={`mt-3 max-w-xl text-sm leading-6 md:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Track signups, returning customers, token usage, product interest, and subscriber behavior while keeping your email list organized for future automations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => void handleCopyEmailList()} className="rounded-2xl">
              <Copy className="h-4 w-4" />
              Copy Email List
            </Button>
            <Button type="button" variant="secondary" onClick={handleExportCsv} className="rounded-2xl">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-6">
          <MetricCard label="Subscribers" value={String(snapshot.metrics.totalSubscribers)} icon={Users} tone="blue" />
          <MetricCard label="Active today" value={String(snapshot.metrics.activeToday)} icon={Activity} tone="emerald" />
          <MetricCard label="Returning" value={String(snapshot.metrics.returningCustomers)} icon={Repeat2} tone="orange" />
          <MetricCard label="Token users" value={String(snapshot.metrics.tokenUsers)} icon={Ticket} tone="blue" />
          <MetricCard label="Email list" value={String(snapshot.metrics.totalEmailList)} icon={Mail} tone="slate" />
          <MetricCard label="Revenue" value={formatCurrency(snapshot.metrics.subscriberRevenue)} icon={ShieldCheck} tone="emerald" />
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Today&apos;s Subscriber Activity</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Fresh visits, package selections, token usage, and signups update here automatically.
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">New today</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{snapshot.metrics.newToday}</p>
          </div>
        </div>

        {snapshot.todayActivities.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {snapshot.todayActivities.slice(0, 6).map((activity) => (
              <SubscriberActivityCard
                key={activity.id}
                activity={activity}
                onOpen={handleOpenActivitySubscriber}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-bold text-slate-950">No subscriber activity recorded today</h3>
            <p className="mt-2 text-sm text-slate-600">
              New site behavior, token activity, and subscriptions will appear here automatically.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] md:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Subscriber Directory</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Search by name, email, token, product source, location, or viewed products. Click any subscriber to manage their lifecycle and review behavior.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_200px_200px_220px]">
            <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500">
              <Search className="h-4 w-4 flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search subscribers, products or tokens"
                className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SubscriberLifecycleStatus)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="paused">Paused</option>
              <option value="blocked">Blocked</option>
            </select>

            <select
              value={segmentFilter}
              onChange={(event) => setSegmentFilter(event.target.value as 'all' | SubscriberSegment)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            >
              <option value="all">All segments</option>
              <option value="new">New</option>
              <option value="returning">Returning</option>
              <option value="token-user">Token user</option>
              <option value="high-value">High value</option>
            </select>

            <select
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value as typeof activityFilter)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            >
              <option value="all">All activity</option>
              <option value="active_today">Active today</option>
              <option value="used_token">Used token</option>
              <option value="returning">Returning</option>
              <option value="dormant">Dormant 7d+</option>
            </select>
          </div>
        </div>

        <div className="mt-6 lg:hidden">
          {paginatedSubscribers.length > 0 ? (
            <div className="space-y-3">
              {paginatedSubscribers.map((subscriber) => (
                <SubscriberMobileCard key={subscriber.record.token} subscriber={subscriber} onOpen={setSelectedSubscriber} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.7rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-slate-950">No subscribers matched your filters</h3>
              <p className="mt-2 text-sm text-slate-600">
                Try a broader search term or reset the lifecycle filters.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-[1.6rem] border border-slate-200 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Subscriber</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Source</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Orders</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Remaining</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Last activity</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Segment</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paginatedSubscribers.length > 0 ? (
                  paginatedSubscribers.map((subscriber) => (
                    <tr
                      key={subscriber.record.token}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => setSelectedSubscriber(subscriber)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {subscriber.record.fullName || subscriber.record.email}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{subscriber.record.email}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {subscriber.record.token}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {subscriber.sourceProductName || 'Direct signup'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {subscriber.record.location || 'No location'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{subscriber.totalOrders}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {subscriber.discountedOrders} discounted order(s)
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{subscriber.record.remainingUses}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">{formatDate(subscriber.lastActiveAt)}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {subscriber.lastProductViewed || subscriber.lastVisitedPath || 'No recent page'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSegmentClassName(subscriber.segment)}`}>
                          {subscriber.segment.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(subscriber.status)}`}>
                          {subscriber.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <p className="text-lg font-bold text-slate-950">No subscribers matched your filters</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Try a broader search term or reset the lifecycle filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredSubscribers.length > DIRECTORY_PAGE_SIZE ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Showing {(currentPage - 1) * DIRECTORY_PAGE_SIZE + 1}-
              {Math.min(currentPage * DIRECTORY_PAGE_SIZE, filteredSubscribers.length)} of {filteredSubscribers.length} subscribers
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-2xl"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-2xl"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <SubscriberDetailModal
        subscriber={selectedSubscriber}
        onClose={() => setSelectedSubscriber(null)}
        onSaveManagement={handleSaveManagement}
      />
    </div>
  );
}
