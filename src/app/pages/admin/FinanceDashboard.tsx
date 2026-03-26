import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileDown,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../../components/design-system/Button';
import { FinanceReceiptModal } from '../../components/admin/FinanceReceiptModal';
import {
  FINANCE_DATA_CHANGE_EVENT,
  readFinanceSnapshot,
  recordFinanceExpense,
  recordManualSale,
  updateFinanceSettings,
  type FinanceExpenseCategory,
  type FinanceLedgerRecord,
  type FinanceReceiptRecord,
  type FinanceSnapshot,
} from '../../lib/adminFinance';
import { formatDraftCurrency, getCurrencyLabel, type AdminCurrency } from '../../lib/adminProductDrafts';
import { formatCurrency, formatDate } from '../../lib/utils';

const RECEIPTS_PAGE_SIZE = 8;
const JOURNAL_PAGE_SIZE = 10;
const CHART_COLORS = ['#0f766e', '#2563eb', '#f97316', '#8b5cf6'];
const EXPENSE_CATEGORY_OPTIONS: Array<{ value: FinanceExpenseCategory; label: string }> = [
  { value: 'inventory', label: 'Inventory / Product purchase' },
  { value: 'ads', label: 'Advertising / Media spend' },
  { value: 'delivery', label: 'Delivery / Dispatch' },
  { value: 'operations', label: 'Operations' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salary', label: 'Salary / Staffing' },
  { value: 'other', label: 'Other' },
];
const FINANCE_CURRENCY_OPTIONS: AdminCurrency[] = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];

function downloadCsvFile(fileName: string, rows: Array<Array<string | number>>) {
  const csvContent = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function matchesReceiptSearch(receipt: FinanceReceiptRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    receipt.receiptNumber,
    receipt.orderNumber,
    receipt.customerName,
    receipt.customerPhone,
    receipt.productName,
    receipt.packageTitle,
    receipt.sourceLabel,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function matchesJournalSearch(record: FinanceLedgerRecord, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [record.title, record.subtitle, record.orderNumber, record.customerName, record.statusLabel]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function toDateInputValue(dateValue: string) {
  const sourceDate = new Date(dateValue);
  const month = `${sourceDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${sourceDate.getDate()}`.padStart(2, '0');
  return `${sourceDate.getFullYear()}-${month}-${day}`;
}

function isSameLocalDay(dateValue: string, target: Date) {
  const sourceDate = new Date(dateValue);

  return (
    sourceDate.getFullYear() === target.getFullYear() &&
    sourceDate.getMonth() === target.getMonth() &&
    sourceDate.getDate() === target.getDate()
  );
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
  icon: typeof CircleDollarSign;
  tone: 'blue' | 'emerald' | 'orange' | 'slate';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'bg-[#eef5ff] text-[#2563eb]'
      : tone === 'emerald'
        ? 'bg-[#ecfdf5] text-[#0f766e]'
        : tone === 'orange'
          ? 'bg-[#fff7ed] text-[#f97316]'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
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
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
        {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function JournalTypeBadge({ type }: { type: FinanceLedgerRecord['type'] }) {
  const className =
    type === 'sale'
      ? 'bg-[#ecfdf5] text-[#0f766e]'
      : type === 'expense'
        ? 'bg-[#fff7ed] text-[#f97316]'
        : type === 'failed-order'
          ? 'bg-[#fef2f2] text-[#dc2626]'
          : 'bg-[#eff6ff] text-[#2563eb]';

  const label =
    type === 'sale'
      ? 'Sale'
      : type === 'expense'
        ? 'Expense'
        : type === 'failed-order'
          ? 'Failed'
          : 'Pending';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function ReceiptCard({
  receipt,
  onOpen,
}: {
  receipt: FinanceReceiptRecord;
  onOpen: (receipt: FinanceReceiptRecord) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(receipt)}
      className="w-full rounded-[1.7rem] border border-slate-200 bg-white p-5 text-left shadow-[0_16px_38px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{receipt.sourceLabel}</p>
          <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">{receipt.receiptNumber}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">{receipt.customerName || 'Customer'}</p>
        </div>
        <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">
          {formatCurrency(receipt.amount, receipt.localeCountryCode)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.2rem] bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Product</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{receipt.productName}</p>
        </div>
        <div className="rounded-[1.2rem] bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Date</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(receipt.createdAt)}</p>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">Tap to print, share, or download receipt</p>
    </button>
  );
}

function JournalCard({ record, reportingCountryCode }: { record: FinanceLedgerRecord; reportingCountryCode: string }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">{record.title}</p>
          <p className="mt-1 text-sm text-slate-600">{record.subtitle}</p>
        </div>
        <JournalTypeBadge type={record.type} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[1.1rem] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Amount</p>
          <p className="mt-2 text-sm font-bold text-slate-950">
            {formatCurrency(record.amount, record.localeCountryCode || (reportingCountryCode as never))}
          </p>
        </div>
        <div className="rounded-[1.1rem] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
          <p className="mt-2 text-sm font-bold text-slate-950">{record.statusLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function FinanceDashboard() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<FinanceReceiptRecord | null>(null);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptDateFilter, setReceiptDateFilter] = useState('');
  const [receiptPage, setReceiptPage] = useState(1);
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [journalDateFilter, setJournalDateFilter] = useState('');
  const [journalPage, setJournalPage] = useState(1);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    startupCapital: '0',
    companyName: 'CloudMarket',
    currency: 'NGN' as AdminCurrency,
  });
  const [expenseForm, setExpenseForm] = useState({
    productId: '',
    quantity: '1',
    title: '',
    amount: '',
    category: 'ads' as FinanceExpenseCategory,
    note: '',
  });
  const [saleForm, setSaleForm] = useState({
    linkedOrderNumber: '',
    productId: '',
    createdAt: toDateInputValue(new Date().toISOString()),
    title: '',
    productName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    quantity: '1',
    amount: '',
    note: '',
    countsTowardRevenue: true,
  });

  useEffect(() => {
    const syncSnapshot = async () => {
      const nextSnapshot = await readFinanceSnapshot();
      setSnapshot(nextSnapshot);
    };

    void syncSnapshot();

    const intervalId = window.setInterval(() => {
      void syncSnapshot();
    }, 20000);
    window.addEventListener(FINANCE_DATA_CHANGE_EVENT, syncSnapshot as EventListener);
    window.addEventListener('focus', syncSnapshot as EventListener);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(FINANCE_DATA_CHANGE_EVENT, syncSnapshot as EventListener);
      window.removeEventListener('focus', syncSnapshot as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setSettingsForm({
      startupCapital: String(snapshot.settings.startupCapital),
      companyName: snapshot.settings.companyName,
      currency: snapshot.settings.currency,
    });
  }, [snapshot]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage('');
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedbackMessage]);

  const snapshotOrders = snapshot?.orders ?? [];
  const snapshotInventory = snapshot?.inventory ?? [];
  const snapshotMonthlyReports = snapshot?.monthlyReports ?? [];
  const snapshotReceiptRecords = snapshot?.receiptRecords ?? [];
  const snapshotLedgerRecords = snapshot?.ledgerRecords ?? [];

  useEffect(() => {
    setReceiptPage(1);
  }, [receiptDateFilter, receiptSearchQuery]);

  useEffect(() => {
    setJournalPage(1);
  }, [journalDateFilter, journalSearchQuery]);

  useEffect(() => {
    if (!snapshot || !saleForm.linkedOrderNumber) {
      return;
    }

    const linkedOrder = snapshotOrders.find((order) => order.orderNumber === saleForm.linkedOrderNumber);

    if (!linkedOrder) {
      return;
    }

    setSaleForm((current) => ({
      ...current,
      productId: linkedOrder.productId,
      createdAt: toDateInputValue(new Date().toISOString()),
      title: current.title || `${linkedOrder.productName} receipt`,
      productName: linkedOrder.productName,
      customerName: linkedOrder.customerName,
      customerPhone: linkedOrder.customerPhone,
      customerAddress: linkedOrder.customerAddress,
      quantity: String(linkedOrder.quantity),
      amount: String(linkedOrder.finalAmount),
      countsTowardRevenue: false,
    }));
  }, [saleForm.linkedOrderNumber, snapshot, snapshotOrders]);

  useEffect(() => {
    if (!snapshot || !saleForm.productId || saleForm.linkedOrderNumber) {
      return;
    }

    const selectedInventoryItem = snapshotInventory.find((item) => item.productId === saleForm.productId);

    if (!selectedInventoryItem) {
      return;
    }

    const quantity = Math.max(1, Number(saleForm.quantity) || 1);

    setSaleForm((current) => ({
      ...current,
      title:
        current.title && current.title.trim().length > 0
          ? current.title
          : `${selectedInventoryItem.productName} receipt`,
      productName: selectedInventoryItem.productName,
      amount: String(selectedInventoryItem.salePrice * quantity),
    }));
  }, [saleForm.productId, saleForm.linkedOrderNumber, saleForm.quantity, snapshot, snapshotInventory]);

  useEffect(() => {
    if (!snapshot || !expenseForm.productId) {
      return;
    }

    const selectedInventoryItem = snapshotInventory.find((item) => item.productId === expenseForm.productId);

    if (!selectedInventoryItem) {
      return;
    }

    const quantity = Math.max(1, Number(expenseForm.quantity) || 1);

    setExpenseForm((current) => ({
      ...current,
      title:
        current.title && current.title.trim().length > 0
          ? current.title
          : `${selectedInventoryItem.productName} expense`,
      amount: String(selectedInventoryItem.purchaseCost * quantity),
    }));
  }, [expenseForm.productId, expenseForm.quantity, snapshot, snapshotInventory]);

  const reportingCountryCode = snapshot?.settings.reportingCountryCode ?? 'NG';
  const selectedExpenseProduct = useMemo(
    () => snapshotInventory.find((item) => item.productId === expenseForm.productId) ?? null,
    [expenseForm.productId, snapshotInventory],
  );
  const selectedSaleProduct = useMemo(
    () => snapshotInventory.find((item) => item.productId === saleForm.productId) ?? null,
    [saleForm.productId, snapshotInventory],
  );
  const linkedSaleOrder = useMemo(
    () => snapshotOrders.find((order) => order.orderNumber === saleForm.linkedOrderNumber) ?? null,
    [saleForm.linkedOrderNumber, snapshotOrders],
  );
  const today = useMemo(() => new Date(), []);
  const monthlyChartData = snapshotMonthlyReports.map((report) => ({
    label: report.label,
    sales: report.sales,
    expenses: report.expenses,
    profit: report.netProfit,
  }));
  const orderStatusChartData = [
    { name: 'Delivered', value: snapshot?.metrics.deliveredOrders ?? 0 },
    { name: 'Confirmed / Processing', value: snapshot?.metrics.processingOrders ?? 0 },
    { name: 'New', value: snapshot?.metrics.newOrders ?? 0 },
    { name: 'Failed', value: snapshot?.metrics.failedOrders ?? 0 },
  ];
  const todaySummaryChartData = [
    { name: 'Sales', value: snapshot?.todaySummary.totalSales ?? 0 },
    { name: 'Expenses', value: snapshot?.todaySummary.totalExpenses ?? 0 },
    { name: 'Pending', value: snapshot?.todaySummary.pendingSales ?? 0 },
  ];
  const filteredReceiptRecords = snapshotReceiptRecords
    .filter((receipt) => matchesReceiptSearch(receipt, receiptSearchQuery))
    .filter((receipt) => (receiptDateFilter ? toDateInputValue(receipt.createdAt) === receiptDateFilter : true));
  const totalReceiptPages = Math.max(1, Math.ceil(filteredReceiptRecords.length / RECEIPTS_PAGE_SIZE));
  const paginatedReceiptRecords = filteredReceiptRecords.slice(
    (receiptPage - 1) * RECEIPTS_PAGE_SIZE,
    receiptPage * RECEIPTS_PAGE_SIZE,
  );
  const todayLedgerRecords = snapshotLedgerRecords.filter((record) => isSameLocalDay(record.createdAt, today));
  const historicalLedgerRecords = snapshotLedgerRecords
    .filter((record) => !isSameLocalDay(record.createdAt, today))
    .filter((record) => matchesJournalSearch(record, journalSearchQuery))
    .filter((record) => (journalDateFilter ? toDateInputValue(record.createdAt) === journalDateFilter : true));
  const totalJournalPages = Math.max(1, Math.ceil(historicalLedgerRecords.length / JOURNAL_PAGE_SIZE));
  const paginatedJournalRecords = historicalLedgerRecords.slice(
    (journalPage - 1) * JOURNAL_PAGE_SIZE,
    journalPage * JOURNAL_PAGE_SIZE,
  );

  if (!snapshot) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  const exportDailySummary = () => {
    downloadCsvFile('finance-daily-summary.csv', [
      ['Metric', 'Value'],
      ['Date', formatDate(new Date().toISOString())],
      ['Total Orders', snapshot.todaySummary.totalOrders],
      ['Total Sales', snapshot.todaySummary.totalSales],
      ['Pending Sales', snapshot.todaySummary.pendingSales],
      ['Processing Orders', snapshot.todaySummary.processingOrders],
      ['New Orders', snapshot.todaySummary.newOrders],
      ['Failed Orders', snapshot.todaySummary.failedOrders],
      ['Total Expenses', snapshot.todaySummary.totalExpenses],
      ['Pure Profit', snapshot.todaySummary.pureProfit],
    ]);
  };

  const exportMonthlyReport = () => {
    downloadCsvFile('finance-monthly-report.csv', [
      ['Month', 'Sales', 'Expenses', 'Net Profit', 'Pending Income', 'Delivered Orders', 'New Orders', 'Processing Orders', 'Failed Orders'],
      ...snapshot.monthlyReports.map((report) => [
        report.label,
        report.sales,
        report.expenses,
        report.netProfit,
        report.pendingIncome,
        report.deliveredOrders,
        report.newOrders,
        report.processingOrders,
        report.failedOrders,
      ]),
    ]);
  };

  const exportJournal = () => {
    downloadCsvFile('finance-journal.csv', [
      ['Date', 'Type', 'Title', 'Subtitle', 'Amount', 'Status', 'Order Number'],
      ...snapshot.ledgerRecords.map((record) => [
        record.createdAt,
        record.type,
        record.title,
        record.subtitle,
        record.amount,
        record.statusLabel,
        record.orderNumber,
      ]),
    ]);
  };

  const handleSaveSettings = async () => {
    await updateFinanceSettings({
      startupCapital: Number(settingsForm.startupCapital) || 0,
      companyName: settingsForm.companyName,
      currency: settingsForm.currency,
    });
    setSnapshot(await readFinanceSnapshot());
    setFeedbackMessage('Finance settings updated');
  };

  const handleRecordExpense = async () => {
    if (!expenseForm.title.trim() || Number(expenseForm.amount) <= 0) {
      setFeedbackMessage('Add an expense title and a valid amount before saving.');
      return;
    }

    await recordFinanceExpense({
      title: expenseForm.title,
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      note: expenseForm.note,
      productId: selectedExpenseProduct?.productId,
      productName: selectedExpenseProduct?.productName,
      quantity: Number(expenseForm.quantity) || 1,
      unitPurchaseCost: selectedExpenseProduct?.purchaseCost ?? 0,
      unitSalePrice: selectedExpenseProduct?.salePrice ?? 0,
      localeCountryCode: snapshot.settings.reportingCountryCode,
    });
    setExpenseForm({
      productId: '',
      quantity: '1',
      title: '',
      amount: '',
      category: 'ads',
      note: '',
    });
    setSnapshot(await readFinanceSnapshot());
    setFeedbackMessage('Expense recorded');
  };

  const handleRecordSale = async () => {
    if (!saleForm.linkedOrderNumber && !saleForm.productId) {
      setFeedbackMessage('Select a product or link an order before generating a receipt.');
      return;
    }

    if (
      !saleForm.title.trim() ||
      !saleForm.customerName.trim() ||
      !saleForm.customerAddress.trim() ||
      Number(saleForm.amount) <= 0
    ) {
      setFeedbackMessage('Complete the receipt title, customer name, address, and amount before generating.');
      return;
    }

    const quantity = Math.max(1, Number(saleForm.quantity) || 1);
    const createdAtIso = saleForm.createdAt
      ? new Date(`${saleForm.createdAt}T12:00:00`).toISOString()
      : new Date().toISOString();
    const recordedSale = await recordManualSale({
      title: saleForm.title,
      amount: Number(saleForm.amount),
      productId: linkedSaleOrder?.productId ?? selectedSaleProduct?.productId,
      productSlug: linkedSaleOrder?.productSlug ?? selectedSaleProduct?.productSlug,
      productName: saleForm.productName || linkedSaleOrder?.productName || selectedSaleProduct?.productName || 'Manual Sale',
      customerName: saleForm.customerName || linkedSaleOrder?.customerName || '',
      customerPhone: saleForm.customerPhone || linkedSaleOrder?.customerPhone || '',
      customerEmail: saleForm.customerEmail,
      customerAddress: saleForm.customerAddress || linkedSaleOrder?.customerAddress || '',
      quantity,
      unitPrice:
        linkedSaleOrder && quantity > 0
          ? Math.round(linkedSaleOrder.finalAmount / quantity)
          : selectedSaleProduct?.salePrice ?? Number(saleForm.amount),
      unitCost:
        linkedSaleOrder && quantity > 0
          ? selectedSaleProduct?.purchaseCost ?? 0
          : selectedSaleProduct?.purchaseCost ?? 0,
      note: saleForm.note,
      linkedOrderNumber: saleForm.linkedOrderNumber,
      localeCountryCode: linkedSaleOrder?.localeCountryCode ?? snapshot.settings.reportingCountryCode,
      createdAt: createdAtIso,
      countsTowardRevenue: saleForm.countsTowardRevenue,
      generatedFrom: saleForm.linkedOrderNumber ? 'linked-order' : 'manual',
    });
    const refreshedSnapshot = await readFinanceSnapshot();
    const generatedReceipt =
      refreshedSnapshot.receiptRecords.find((receipt) => receipt.id === recordedSale.id) ?? null;
    setSaleForm({
      linkedOrderNumber: '',
      productId: '',
      createdAt: toDateInputValue(new Date().toISOString()),
      title: '',
      productName: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      quantity: '1',
      amount: '',
      note: '',
      countsTowardRevenue: true,
    });
    setSnapshot(refreshedSnapshot);
    setSelectedReceipt(generatedReceipt);
    setFeedbackMessage('Receipt generated successfully');
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-[#1e3a5f] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              <Landmark className="h-4 w-4" />
              Finance Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              The financial command center for sales, costs, receipts, and business health.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Track startup capital, realized sales, pending order value, expenses, business alerts, receipts, and monthly performance in one workspace that feels closer to a banking app than a spreadsheet.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[390px]">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">New order alert</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <BellRing className="h-5 w-5" />
                  {snapshot.todaySummary.newOrderAlertCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex h-4 w-4 rounded-full bg-orange-500" />
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{snapshot.todaySummary.newOrderAlertCount}</p>
                  <p className="text-sm text-white/70">new orders today</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Working balance</p>
              <p className="mt-3 text-2xl font-black text-white">
                {formatCurrency(snapshot.metrics.workingBalance, reportingCountryCode)}
              </p>
              <p className="mt-2 text-sm text-white/70">Capital + sales - total expenses</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
          <Button variant="secondary" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20" onClick={exportDailySummary}>
            <Download className="h-4 w-4" />
            Daily Summary CSV
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20" onClick={exportMonthlyReport}>
            <FileDown className="h-4 w-4" />
            Monthly Report CSV
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20" onClick={exportJournal}>
            <Receipt className="h-4 w-4" />
            Export Finance Journal
          </Button>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Startup capital"
          value={formatCurrency(snapshot.settings.startupCapital, reportingCountryCode)}
          subtitle={`${formatCurrency(snapshot.metrics.capitalReserve, reportingCountryCode)} reserve after expenses`}
          icon={PiggyBank}
          tone="blue"
        />
        <MetricCard
          label="Total sales"
          value={formatCurrency(snapshot.metrics.totalSales, reportingCountryCode)}
          subtitle={`${snapshot.metrics.deliveredOrders} delivered orders realized • ${formatCurrency(snapshot.metrics.inventoryCostOfSales, reportingCountryCode)} inventory cost`}
          icon={CircleDollarSign}
          tone="emerald"
        />
        <MetricCard
          label="Pending income"
          value={formatCurrency(snapshot.metrics.pendingIncome, reportingCountryCode)}
          subtitle={`${formatCurrency(snapshot.metrics.pendingProfitEstimate, reportingCountryCode)} estimated pending profit`}
          icon={Truck}
          tone="orange"
        />
        <MetricCard
          label="Net worth"
          value={formatCurrency(snapshot.metrics.netWorth, reportingCountryCode)}
          subtitle={`${formatCurrency(snapshot.metrics.estimatedGrossProfit, reportingCountryCode)} gross profit • ${formatCurrency(snapshot.metrics.pureProfit, reportingCountryCode)} pure profit`}
          icon={Wallet}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Business summary of the day"
        subtitle="Your briefing for today: order volume, sales movement, expense pressure, and operational status."
        action={
          <Button variant="secondary" size="sm" onClick={exportDailySummary}>
            <Download className="h-4 w-4" />
            Export Today
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today orders</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{snapshot.todaySummary.totalOrders}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today sales</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(snapshot.todaySummary.totalSales, reportingCountryCode)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today expenses</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(snapshot.todaySummary.totalExpenses, reportingCountryCode)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pending sales</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(snapshot.todaySummary.pendingSales, reportingCountryCode)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Processing / New</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {snapshot.todaySummary.processingOrders} / {snapshot.todaySummary.newOrders}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today profit</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(snapshot.todaySummary.pureProfit, reportingCountryCode)}</p>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todaySummaryChartData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                  <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0' }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {todaySummaryChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr,0.8fr]">
        <SectionCard
          title="Monthly finance performance"
          subtitle="Auto-generated monthly report tracking sales, expenses, and profitability."
          action={
            <Button variant="secondary" size="sm" onClick={exportMonthlyReport}>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          }
        >
          <div className="space-y-5">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="financeSales" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="financeExpenses" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                  <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0' }} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" stroke="#0f766e" fill="url(#financeSales)" strokeWidth={3} />
                  <Area type="monotone" dataKey="expenses" stroke="#f97316" fill="url(#financeExpenses)" strokeWidth={3} />
                  <Area type="monotone" dataKey="profit" stroke="#2563eb" fillOpacity={0} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">This month sales</p>
                <p className="mt-2 text-xl font-black text-slate-950">{formatCurrency(snapshot.metrics.monthlySales, reportingCountryCode)}</p>
              </div>
              <div className="rounded-[1.4rem] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">This month expenses</p>
                <p className="mt-2 text-xl font-black text-slate-950">{formatCurrency(snapshot.metrics.monthlyExpenses, reportingCountryCode)}</p>
              </div>
              <div className="rounded-[1.4rem] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">This month profit</p>
                <p className="mt-2 text-xl font-black text-slate-950">{formatCurrency(snapshot.metrics.monthlyNetProfit, reportingCountryCode)}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Finance alerts and guidance"
          subtitle="Automatic warnings and practical business advice based on live records."
        >
          <div className="space-y-4">
            {snapshot.alerts.length > 0 ? (
              snapshot.alerts.map((alert) => (
                <div key={alert} className="rounded-[1.5rem] border border-[#fecaca] bg-[#fef2f2] p-4">
                  <div className="flex gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-[#dc2626]" />
                    <p className="text-sm leading-6 text-[#7f1d1d]">{alert}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-[#bbf7d0] bg-[#ecfdf5] p-4">
                <div className="flex gap-3">
                  <TrendingUp className="mt-0.5 h-5 w-5 flex-none text-[#0f766e]" />
                  <p className="text-sm leading-6 text-[#065f46]">No urgent finance warning right now. Profit and capital signals are currently stable.</p>
                </div>
              </div>
            )}

            {snapshot.guidance.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-[#f97316]" />
                  <p className="text-sm leading-6 text-slate-600">{item}</p>
                </div>
              </div>
            ))}

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={orderStatusChartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>
                      {orderStatusChartData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '1rem', borderColor: '#e2e8f0' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Business settings" subtitle="Only the three finance controls that matter here: business name, startup capital, and currency.">
          <div className="space-y-4">
            <input value={settingsForm.companyName} onChange={(event) => setSettingsForm((current) => ({ ...current, companyName: event.target.value }))} placeholder="Business name" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <input value={settingsForm.startupCapital} onChange={(event) => setSettingsForm((current) => ({ ...current, startupCapital: event.target.value }))} type="number" min="0" placeholder="Startup capital" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <select value={settingsForm.currency} onChange={(event) => setSettingsForm((current) => ({ ...current, currency: event.target.value as AdminCurrency }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20">
              {FINANCE_CURRENCY_OPTIONS.map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>{currencyCode} - {getCurrencyLabel(currencyCode)}</option>
              ))}
            </select>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</p>
              <p className="mt-2 text-base font-bold text-slate-950">{settingsForm.companyName || 'Business name'}</p>
              <p className="mt-2 text-sm text-slate-600">Startup capital: {formatDraftCurrency(Number(settingsForm.startupCapital) || 0, settingsForm.currency)}</p>
            </div>
            <Button variant="primary" size="md" fullWidth onClick={handleSaveSettings}>
              <PiggyBank className="h-4 w-4" />
              Save Business Settings
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Record expense" subtitle="Select a published product from inventory and fetch its cost price and selling price before saving the expense.">
          <div className="space-y-4">
            <select value={expenseForm.productId} onChange={(event) => setExpenseForm((current) => ({ ...current, productId: event.target.value, title: '', amount: '' }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20">
              <option value="">Select product from inventory (optional)</option>
              {snapshot.inventory.map((item) => (
                <option key={item.productId} value={item.productId}>{item.productName}</option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={expenseForm.quantity} onChange={(event) => setExpenseForm((current) => ({ ...current, quantity: event.target.value }))} type="number" min="1" placeholder="Quantity" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
              <select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value as FinanceExpenseCategory }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20">
                {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            {selectedExpenseProduct ? (
              <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Purchase Cost</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatDraftCurrency(selectedExpenseProduct.purchaseCost, selectedExpenseProduct.currency)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Selling Price</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatDraftCurrency(selectedExpenseProduct.salePrice, selectedExpenseProduct.currency)}</p>
                </div>
              </div>
            ) : null}
            <input value={expenseForm.title} onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))} placeholder="Expense title" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <input value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="0" placeholder="Amount spent" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <textarea value={expenseForm.note} onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))} rows={4} placeholder="Supplier note, ad spend note, or business reason for the expense" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <Button variant="primary" size="md" fullWidth onClick={handleRecordExpense}>
              <Plus className="h-4 w-4" />
              Record Expense
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Record sale / generate receipt" subtitle="Generate a premium receipt from a linked order or build one from a selected product with date, quantity, and amount auto-filled.">
          <div className="space-y-4">
            <select value={saleForm.linkedOrderNumber} onChange={(event) => setSaleForm((current) => ({ ...current, linkedOrderNumber: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20">
              <option value="">Quick receipt from an order (optional)</option>
              {snapshot.orders.map((order) => (
                <option key={order.orderNumber} value={order.orderNumber}>
                  {order.orderNumber} • {order.customerName} • {order.productName}
                </option>
              ))}
            </select>
            <select value={saleForm.productId} onChange={(event) => setSaleForm((current) => ({ ...current, productId: event.target.value, linkedOrderNumber: '' }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20">
              <option value="">Select product for manual receipt</option>
              {snapshot.inventory.map((item) => (
                <option key={item.productId} value={item.productId}>{item.productName}</option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={saleForm.createdAt} readOnly className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-700 outline-none" />
              <input value={saleForm.quantity} onChange={(event) => setSaleForm((current) => ({ ...current, quantity: event.target.value }))} type="number" min="1" placeholder="Quantity" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            </div>
            {(linkedSaleOrder || selectedSaleProduct) ? (
              <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Auto Amount</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{saleForm.amount || '0'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cost / Sell Reference</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedSaleProduct
                      ? `${formatDraftCurrency(selectedSaleProduct.purchaseCost, selectedSaleProduct.currency)} cost / ${formatDraftCurrency(selectedSaleProduct.salePrice, selectedSaleProduct.currency)} sell`
                      : linkedSaleOrder
                        ? `${formatCurrency(linkedSaleOrder.finalAmount, linkedSaleOrder.localeCountryCode)} linked order`
                        : 'No product selected'}
                  </p>
                </div>
              </div>
            ) : null}
            <input value={saleForm.title} onChange={(event) => setSaleForm((current) => ({ ...current, title: event.target.value }))} placeholder="Sale title / receipt label" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <input value={saleForm.productName} onChange={(event) => setSaleForm((current) => ({ ...current, productName: event.target.value }))} placeholder="Product name" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <input value={saleForm.customerName} onChange={(event) => setSaleForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="Customer name" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <input value={saleForm.customerAddress} onChange={(event) => setSaleForm((current) => ({ ...current, customerAddress: event.target.value }))} placeholder="Customer address" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={saleForm.customerPhone} onChange={(event) => setSaleForm((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="Customer phone" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
              <input value={saleForm.customerEmail} onChange={(event) => setSaleForm((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="Customer email" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            </div>
            <input value={saleForm.amount} onChange={(event) => setSaleForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="0" placeholder="Sale amount" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <textarea value={saleForm.note} onChange={(event) => setSaleForm((current) => ({ ...current, note: event.target.value }))} rows={3} placeholder="Receipt note, payment context, or order comment" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <label className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" checked={saleForm.countsTowardRevenue} onChange={(event) => setSaleForm((current) => ({ ...current, countsTowardRevenue: event.target.checked }))} className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0E7C7B] focus:ring-[#0E7C7B]" />
              Count this as new realized revenue. Turn it off when you only need a quick linked-order receipt without adding new revenue twice.
            </label>
            <Button variant="primary" size="md" fullWidth onClick={handleRecordSale}>
              <Receipt className="h-4 w-4" />
              Generate Receipt
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top ordering markets" subtitle="See which country and state or region are generating the most orders and revenue.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Top country</p>
            <h3 className="mt-3 text-2xl font-black text-slate-950">{snapshot.geography.topCountry?.label ?? 'No country data yet'}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {snapshot.geography.topCountry
                ? `${snapshot.geography.topCountry.orders} orders • ${formatCurrency(snapshot.geography.topCountry.revenue, snapshot.geography.topCountry.countryCode)}`
                : 'Country order signals will appear here automatically.'}
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Top state / region</p>
            <h3 className="mt-3 text-2xl font-black text-slate-950">{snapshot.geography.topRegion?.label ?? 'No region data yet'}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {snapshot.geography.topRegion
                ? `${snapshot.geography.topRegion.countryName} • ${snapshot.geography.topRegion.orders} orders`
                : 'Order regions will populate this card as sales come in.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-950">Country ranking</p>
            <div className="mt-4 space-y-3">
              {snapshot.geography.countries.slice(0, 5).map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[1.15rem] bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.orders} orders</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.revenue, item.countryCode)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-950">State / region ranking</p>
            <div className="mt-4 space-y-3">
              {snapshot.geography.regions.slice(0, 5).map((item) => (
                <div key={`${item.countryCode}-${item.label}`} className="flex items-center justify-between rounded-[1.15rem] bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.countryName}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.orders} orders</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Fulfilled sales receipt portal"
        subtitle="Click any successful order or finance sale to print a company-branded receipt, share it, or download it."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={receiptSearchQuery} onChange={(event) => setReceiptSearchQuery(event.target.value)} placeholder="Search receipt, order, customer" className="h-11 rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            </div>
            <input type="date" value={receiptDateFilter} onChange={(event) => setReceiptDateFilter(event.target.value)} className="h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
          </div>
        }
      >
        {paginatedReceiptRecords.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              {paginatedReceiptRecords.map((receipt) => (
                <ReceiptCard key={receipt.id} receipt={receipt} onOpen={setSelectedReceipt} />
              ))}
            </div>

            <div className="flex items-center justify-between rounded-[1.4rem] bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-600">Page {receiptPage} of {totalReceiptPages}</p>
              <div className="flex gap-2">
                <button type="button" disabled={receiptPage === 1} onClick={() => setReceiptPage((current) => Math.max(1, current - 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" disabled={receiptPage === totalReceiptPages} onClick={() => setReceiptPage((current) => Math.min(totalReceiptPages, current + 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm leading-6 text-slate-500">
            No receipts match the current search or date filter.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Daily finance journal"
        subtitle="Today’s business activity first, then paginated access to older records for search and audit."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={journalSearchQuery} onChange={(event) => setJournalSearchQuery(event.target.value)} placeholder="Search journal records" className="h-11 rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            </div>
            <input type="date" value={journalDateFilter} onChange={(event) => setJournalDateFilter(event.target.value)} className="h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20" />
            <Button variant="secondary" size="sm" onClick={exportJournal}>
              <Download className="h-4 w-4" />
              Export Journal
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#2B63D9]" />
              <h3 className="text-lg font-bold text-slate-950">Today&apos;s records</h3>
            </div>
            {todayLedgerRecords.length > 0 ? (
              <>
                <div className="grid gap-4 lg:hidden">
                  {todayLedgerRecords.map((record) => (
                    <JournalCard key={record.id} record={record} reportingCountryCode={reportingCountryCode} />
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 lg:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Type</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Record</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Amount</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {todayLedgerRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-5 py-4"><JournalTypeBadge type={record.type} /></td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-950">{record.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{record.subtitle}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(record.amount, record.localeCountryCode)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{record.statusLabel}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatDate(record.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                No finance records captured yet today.
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#FF7A00]" />
              <h3 className="text-lg font-bold text-slate-950">Historical records</h3>
            </div>

            {paginatedJournalRecords.length > 0 ? (
              <div className="space-y-6">
                <div className="grid gap-4 lg:hidden">
                  {paginatedJournalRecords.map((record) => (
                    <JournalCard key={record.id} record={record} reportingCountryCode={reportingCountryCode} />
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 lg:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Type</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Record</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Amount</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {paginatedJournalRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-5 py-4"><JournalTypeBadge type={record.type} /></td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-950">{record.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{record.subtitle}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(record.amount, record.localeCountryCode)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{record.statusLabel}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatDate(record.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between rounded-[1.4rem] bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-600">Page {journalPage} of {totalJournalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={journalPage === 1} onClick={() => setJournalPage((current) => Math.max(1, current - 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={journalPage === totalJournalPages} onClick={() => setJournalPage((current) => Math.min(totalJournalPages, current + 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                No historical finance records match the current filters.
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {feedbackMessage ? (
        <div className="rounded-[1.5rem] border border-[#bfdbfe] bg-[#eff6ff] px-5 py-4 text-sm font-semibold text-[#1d4ed8]">
          {feedbackMessage}
        </div>
      ) : null}

      <FinanceReceiptModal receipt={selectedReceipt} settings={snapshot.settings} onClose={() => setSelectedReceipt(null)} />
    </div>
  );
}
