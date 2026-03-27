import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, Phone, Receipt, X } from 'lucide-react';
import { useBrandingSettings } from '../../lib/branding';
import { downloadElementAsImage, saveElementAsPdf } from '../../lib/domExport';
import type { AdminManagedOrder, AdminOrderStatus } from '../../lib/adminOrders';
import { formatCurrency, formatDate } from '../../lib/utils';
import { OrderSlipPreview } from '../order/OrderSlipPreview';

interface OrderDetailModalProps {
  order: AdminManagedOrder | null;
  onClose: () => void;
  onDeleteOrder: (orderNumber: string) => void;
  onSaveManagement: (
    orderNumber: string,
    update: {
      status: AdminOrderStatus;
      expenseAmount?: number | null;
      expenseNote?: string;
    },
  ) => void;
}

function copyOrderDetails(order: AdminManagedOrder) {
  const lines = [
    `Order Number: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Alternative Phone: ${order.customerAlternatePhone || 'Not provided'}`,
    `Address: ${order.customerAddress}`,
    `Location: ${order.city}`,
    `Product: ${order.productName}`,
    `Package: ${order.packageTitle}`,
    `Quantity: ${order.quantity}`,
    `Final Amount: ${formatCurrency(order.finalAmount, order.localeCountryCode)}`,
    `Status: ${order.status}`,
    `Order Expense: ${
      typeof order.expenseAmount === 'number'
        ? formatCurrency(order.expenseAmount, order.localeCountryCode)
        : 'Not recorded'
    }`,
  ];

  return navigator.clipboard.writeText(lines.join('\n'));
}

export function OrderDetailModal({
  order,
  onClose,
  onDeleteOrder,
  onSaveManagement,
}: OrderDetailModalProps) {
  const branding = useBrandingSettings();
  const slipRef = useRef<HTMLDivElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderStatus>('new');
  const [deliveryExpenseInput, setDeliveryExpenseInput] = useState('');
  const [deliveryExpenseNote, setDeliveryExpenseNote] = useState('');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!order) {
      return;
    }

    setSelectedStatus(order.status);
    setDeliveryExpenseInput(
      typeof order.expenseAmount === 'number' ? String(order.expenseAmount) : '',
    );
    setDeliveryExpenseNote(order.expenseNote);
    setCopyFeedback('');
  }, [order]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyFeedback('');
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyFeedback]);

  const slipOrder = useMemo(() => {
    if (!order) {
      return null;
    }

    return {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      localeCountryCode: order.localeCountryCode,
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
      discountPercentage: order.discountPercentage,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
    };
  }, [order]);

  if (!order || !slipOrder) {
    return null;
  }

  const requiresExpense = selectedStatus !== 'new';
  const showExpenseBox = selectedStatus !== 'new';
  const canSaveManagement = !requiresExpense || deliveryExpenseInput.trim() !== '';
  const websiteUrl = typeof window === 'undefined' ? 'https://cloudmarket.ng' : window.location.origin;

  const handleDownloadImage = async () => {
    if (!slipRef.current) {
      return;
    }

    setIsDownloadingImage(true);

    try {
      await downloadElementAsImage(slipRef.current, `${order.orderNumber.toLowerCase()}-admin-slip.png`);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleSavePdf = () => {
    if (!slipRef.current) {
      return;
    }

    setIsSavingPdf(true);

    try {
      saveElementAsPdf(slipRef.current, `${order.orderNumber} Admin Order Slip`);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleSaveManagement = () => {
    onSaveManagement(order.orderNumber, {
      status: selectedStatus,
      expenseAmount:
        showExpenseBox && deliveryExpenseInput.trim() !== ''
          ? Number(deliveryExpenseInput)
          : selectedStatus === 'new'
            ? null
            : undefined,
      expenseNote: deliveryExpenseNote,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm md:items-center md:p-6">
      <button
        type="button"
        aria-label="Close order detail"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Order Detail
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {order.orderNumber}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Customer
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-950">{order.customerName}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4" />
                      {order.customerPhone}
                    </p>
                    {order.customerAlternatePhone ? (
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4" />
                        {order.customerAlternatePhone}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      order.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'confirmed'
                          ? 'bg-cyan-100 text-cyan-700'
                        : order.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : order.status === 'cancelled'
                            ? 'bg-slate-200 text-slate-700'
                          : order.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Date</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Final Amount</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatCurrency(order.finalAmount, order.localeCountryCode)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white p-4 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Address</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{order.customerAddress}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.city}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#2B63D9]" />
                  <h3 className="text-lg font-bold text-slate-950">Order Management</h3>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Update order status</label>
                    <select
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value as AdminOrderStatus)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                    >
                      <option value="new">New</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="failed">Failed</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>

                  {showExpenseBox ? (
                    <div className="space-y-4 rounded-[1.4rem] border border-dashed border-[#2B63D9]/30 bg-[#f5f9ff] p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Order expense amount
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryExpenseInput}
                          onChange={(event) => setDeliveryExpenseInput(event.target.value)}
                          placeholder="Enter total operational expense on this order"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                        />
                        {requiresExpense ? (
                          <p className="text-xs font-medium text-[#2B63D9]">
                            Expense is required before saving this order status update.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Expense note
                        </label>
                        <textarea
                          rows={3}
                          value={deliveryExpenseNote}
                          onChange={(event) => setDeliveryExpenseNote(event.target.value)}
                          placeholder="Dispatch, packaging, call cost, replacement, or any order-related expense"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                        />
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveManagement}
                    disabled={!canSaveManagement}
                    className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save Order Management
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteOrder(order.orderNumber)}
                    className="inline-flex w-full items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                  >
                    Delete Order Permanently
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await copyOrderDetails(order);
                      setCopyFeedback('Order details copied');
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Details
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={isDownloadingImage}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Download className="h-4 w-4" />
                    {isDownloadingImage ? 'Preparing...' : 'Image'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePdf}
                    disabled={isSavingPdf}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <FileDown className="h-4 w-4" />
                    {isSavingPdf ? 'Preparing...' : 'PDF'}
                  </button>
                </div>

                {copyFeedback ? (
                  <p className="mt-3 text-sm font-semibold text-[#2B63D9]">{copyFeedback}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-[#f8fafc] p-3 md:p-4">
              <OrderSlipPreview
                ref={slipRef}
                order={slipOrder}
                companyName={branding.companyName}
                companyShortName={branding.companyShortName}
                companyPhone={branding.companyPhone}
                websiteUrl={branding.companyWebsite.trim() || websiteUrl}
                logoUrl={branding.logoUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
