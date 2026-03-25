import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, Mail, MessageCircleMore, Receipt, X } from 'lucide-react';
import { downloadElementAsImage, saveElementAsPdf } from '../../lib/domExport';
import type { FinanceReceiptRecord, FinanceSettings } from '../../lib/adminFinance';
import { FinanceReceiptPreview } from './FinanceReceiptPreview';
import { formatCurrency, formatDate } from '../../lib/utils';

interface FinanceReceiptModalProps {
  receipt: FinanceReceiptRecord | null;
  settings: FinanceSettings;
  onClose: () => void;
}

function buildReceiptShareText(receipt: FinanceReceiptRecord, settings: FinanceSettings) {
  return [
    `${settings.companyName} Purchase Receipt`,
    `Receipt Number: ${receipt.receiptNumber}`,
    `Order Reference: ${receipt.orderNumber || 'Direct sale'}`,
    `Date: ${formatDate(receipt.createdAt)}`,
    `Customer: ${receipt.customerName || 'Customer'}`,
    `Product: ${receipt.productName || 'Product sale'}`,
    `Package: ${receipt.packageTitle || receipt.sourceLabel}`,
    `Quantity: ${receipt.quantity}`,
    `Amount Paid: ${formatCurrency(receipt.amount, receipt.localeCountryCode)}`,
    `Company Phone: ${settings.companyPhone || 'Not set'}`,
    `Website: ${settings.companyWebsite || 'Not set'}`,
  ].join('\n');
}

export function FinanceReceiptModal({ receipt, settings, onClose }: FinanceReceiptModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!receipt) {
      return;
    }

    setCopyFeedback('');
  }, [receipt]);

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

  const shareText = useMemo(() => {
    if (!receipt) {
      return '';
    }

    return buildReceiptShareText(receipt, settings);
  }, [receipt, settings]);

  if (!receipt) {
    return null;
  }

  const handleDownloadImage = async () => {
    if (!slipRef.current) {
      return;
    }

    setIsDownloadingImage(true);

    try {
      await downloadElementAsImage(
        slipRef.current,
        `${receipt.receiptNumber.toLowerCase().replace(/\s+/g, '-')}.png`,
      );
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
      saveElementAsPdf(slipRef.current, `${receipt.receiptNumber} Receipt`);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopyFeedback('Receipt summary copied');
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleEmailShare = () => {
    const emailAddress = receipt.customerEmail || '';
    const subject = encodeURIComponent(`${settings.companyName} Receipt ${receipt.receiptNumber}`);
    const body = encodeURIComponent(shareText);
    window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`, '_self');
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm md:items-center md:p-6">
      <button type="button" aria-label="Close finance receipt modal" className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Receipt Portal</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{receipt.receiptNumber}</h2>
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
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#2B63D9]" />
                  <h3 className="text-lg font-bold text-slate-950">Receipt actions</h3>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Summary
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <MessageCircleMore className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleEmailShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={isDownloadingImage}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isDownloadingImage ? 'Preparing...' : 'Image'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePdf}
                    disabled={isSavingPdf}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {isSavingPdf ? 'Preparing...' : 'Print / PDF'}
                  </button>
                </div>

                {copyFeedback ? (
                  <p className="mt-3 text-sm font-semibold text-[#2B63D9]">{copyFeedback}</p>
                ) : null}
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Receipt summary</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1.2rem] bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{receipt.customerName || 'Customer'}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{receipt.productName}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Amount</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatCurrency(receipt.amount, receipt.localeCountryCode)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-[#f8fafc] p-3 md:p-4">
              <FinanceReceiptPreview ref={slipRef} receipt={receipt} settings={settings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
