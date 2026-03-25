import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Search,
  Truck,
} from 'lucide-react';
import { OrderDetailModal } from '../../components/admin/OrderDetailModal';
import { Button } from '../../components/design-system/Button';
import {
  ensureAdminOrdersLoaded,
  readAdminOrders,
  type AdminManagedOrder,
  type AdminOrderStatus,
  updateManagedOrder,
} from '../../lib/adminOrders';
import { formatCurrency, formatDate } from '../../lib/utils';

const HISTORY_PAGE_SIZE = 10;

function isSameLocalDay(dateValue: string, target: Date) {
  const sourceDate = new Date(dateValue);

  return (
    sourceDate.getFullYear() === target.getFullYear() &&
    sourceDate.getMonth() === target.getMonth() &&
    sourceDate.getDate() === target.getDate()
  );
}

function toDateInputValue(dateValue: string) {
  const sourceDate = new Date(dateValue);
  const month = `${sourceDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${sourceDate.getDate()}`.padStart(2, '0');
  return `${sourceDate.getFullYear()}-${month}-${day}`;
}

function matchesOrderSearch(order: AdminManagedOrder, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.customerAddress,
    order.city,
    order.productName,
    order.packageTitle,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function getStatusClassName(status: AdminOrderStatus) {
  switch (status) {
    case 'confirmed':
      return 'bg-cyan-100 text-cyan-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
      return 'bg-slate-200 text-slate-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-orange-100 text-orange-700';
  }
}

function formatStatusLabel(status: AdminOrderStatus) {
  if (status === 'new') {
    return 'New';
  }

  if (status === 'cancelled') {
    return 'Cancelled';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  tone: 'blue' | 'emerald' | 'orange' | 'red';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'bg-[#eef5ff] text-[#2B63D9]'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'orange'
          ? 'bg-orange-50 text-orange-700'
          : 'bg-red-50 text-red-700';

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

function TodayOrderCard({
  order,
  onOpen,
}: {
  order: AdminManagedOrder;
  onOpen: (order: AdminManagedOrder) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      className="w-full rounded-[1.7rem] border border-slate-200 bg-white p-5 text-left shadow-[0_16px_38px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {formatDate(order.createdAt)}
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{order.orderNumber}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">{order.customerName}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(order.status)}`}>
          {formatStatusLabel(order.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.2rem] bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Package</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{order.packageTitle}</p>
        </div>
        <div className="rounded-[1.2rem] bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Final Total</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatCurrency(order.finalAmount, order.localeCountryCode)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2B63D9]">
          {order.city}
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Qty {order.quantity}
        </span>
      </div>
    </button>
  );
}

function HistoryOrderCard({
  order,
  onOpen,
}: {
  order: AdminManagedOrder;
  onOpen: (order: AdminManagedOrder) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      className="w-full rounded-[1.6rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">{order.orderNumber}</h3>
          <p className="mt-1 text-sm text-slate-600">{order.customerName}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(order.status)}`}>
          {formatStatusLabel(order.status)}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>{order.productName}</p>
        <p>{order.packageTitle}</p>
        <p>{order.city}</p>
        <p>{formatDate(order.createdAt)}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-lg font-bold text-slate-950">
          {formatCurrency(order.finalAmount, order.localeCountryCode)}
        </p>
        <p className="text-sm font-medium text-slate-500">Tap to manage</p>
      </div>
    </button>
  );
}

export function Orders() {
  const [orders, setOrders] = useState<AdminManagedOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminOrderStatus>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminManagedOrder | null>(null);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const loadOrders = async () => {
      await ensureAdminOrdersLoaded().catch(() => undefined);
      setToday(new Date());
      setOrders(readAdminOrders());
    };

    void loadOrders();

    const intervalId = window.setInterval(() => {
      void loadOrders();
    }, 20000);
    const handleStorage = () => loadOrders();
    const handleFocus = () => loadOrders();

    window.addEventListener('cloudmarket-admin-orders-change', handleStorage as EventListener);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('cloudmarket-admin-orders-change', handleStorage as EventListener);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, historyDateFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!matchesOrderSearch(order, searchQuery)) {
        return false;
      }

      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  const todayOrders = useMemo(() => {
    return filteredOrders.filter((order) => isSameLocalDay(order.createdAt, today));
  }, [filteredOrders, today]);

  const historicalOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => !isSameLocalDay(order.createdAt, today))
      .filter((order) => {
        if (!historyDateFilter) {
          return true;
        }

        return toDateInputValue(order.createdAt) === historyDateFilter;
      });
  }, [filteredOrders, historyDateFilter, today]);

  const totalPages = Math.max(1, Math.ceil(historicalOrders.length / HISTORY_PAGE_SIZE));
  const paginatedHistoryOrders = historicalOrders.slice(
    (currentPage - 1) * HISTORY_PAGE_SIZE,
    currentPage * HISTORY_PAGE_SIZE,
  );

  const metrics = useMemo(() => {
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.finalAmount, 0);

    return {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      processingOrders: orders.filter((order) => order.status === 'confirmed' || order.status === 'processing').length,
      deliveredOrders: orders.filter((order) => order.status === 'delivered').length,
      todayRevenue,
      failedOrders: orders.filter((order) => order.status === 'failed' || order.status === 'cancelled').length,
    };
  }, [orders, todayOrders]);

  const handleSaveManagement = async (
    orderNumber: string,
    update: {
      status: AdminOrderStatus;
      expenseAmount?: number | null;
      expenseNote?: string;
    },
  ) => {
    const updatedOrder = await updateManagedOrder(orderNumber, update);

    if (!updatedOrder) {
      return;
    }

    setOrders(readAdminOrders());
    setSelectedOrder(updatedOrder);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(239,246,255,0.95))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              <Clock3 className="h-3.5 w-3.5" />
              Order Operations
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Daily order tracking, fulfillment, and export in one workspace
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Review fresh submissions, search older records, update delivery progress, and export any order as a shareable slip for your operations team.
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Auto refresh
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Every 20 seconds</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
          <MetricCard label="Total orders" value={String(metrics.totalOrders)} icon={PackageCheck} tone="blue" />
          <MetricCard label="Today" value={String(metrics.todayOrders)} icon={CalendarDays} tone="orange" />
          <MetricCard label="Confirmed / Processing" value={String(metrics.processingOrders)} icon={Truck} tone="blue" />
          <MetricCard label="Delivered" value={String(metrics.deliveredOrders)} icon={PackageCheck} tone="emerald" />
          <MetricCard label="Today revenue" value={formatCurrency(metrics.todayRevenue)} icon={CircleDollarSign} tone="emerald" />
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Today&apos;s Orders</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              New submissions for today appear here first so you can act on them quickly.
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Failed Orders
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.failedOrders}</p>
          </div>
        </div>

        {todayOrders.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {todayOrders.map((order) => (
              <TodayOrderCard key={order.orderNumber} order={order} onOpen={setSelectedOrder} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-bold text-slate-950">No orders recorded today</h3>
            <p className="mt-2 text-sm text-slate-600">
              Today&apos;s order queue is empty right now. New submissions will show here automatically.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] md:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Order History</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Search by order number, customer, phone, product, package or city. Older records use pagination to keep the page fast.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px_220px]">
            <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500">
              <Search className="h-4 w-4 flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search orders, customers or products"
                className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AdminOrderStatus)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
              <option value="delivered">Delivered</option>
            </select>

            <input
              type="date"
              value={historyDateFilter}
              onChange={(event) => setHistoryDateFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            />
          </div>
        </div>

        <div className="mt-6 lg:hidden">
          {paginatedHistoryOrders.length > 0 ? (
            <div className="space-y-3">
              {paginatedHistoryOrders.map((order) => (
                <HistoryOrderCard key={order.orderNumber} order={order} onOpen={setSelectedOrder} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.7rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-slate-950">No historical records matched</h3>
              <p className="mt-2 text-sm text-slate-600">
                Adjust the search or date filter to find a previous order.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-[1.6rem] border border-slate-200 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Order</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Customer</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Package</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Expense</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paginatedHistoryOrders.length > 0 ? (
                  paginatedHistoryOrders.map((order) => (
                    <tr
                      key={order.orderNumber}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{order.orderNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.productName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{order.customerName}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.customerPhone}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.city}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{order.packageTitle}</p>
                        <p className="mt-1 text-sm text-slate-500">Qty {order.quantity}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {formatCurrency(order.finalAmount, order.localeCountryCode)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(order.status)}`}>
                          {formatStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {typeof order.expenseAmount === 'number'
                            ? formatCurrency(order.expenseAmount, order.localeCountryCode)
                            : 'Not recorded'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-600">{formatDate(order.createdAt)}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <p className="text-lg font-bold text-slate-950">No historical records matched</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Adjust the search or date filter to find a previous order.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {historicalOrders.length > HISTORY_PAGE_SIZE ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Showing {(currentPage - 1) * HISTORY_PAGE_SIZE + 1}-
              {Math.min(currentPage * HISTORY_PAGE_SIZE, historicalOrders.length)} of {historicalOrders.length} records
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

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSaveManagement={(orderNumber, update) => void handleSaveManagement(orderNumber, update)}
      />
    </div>
  );
}
