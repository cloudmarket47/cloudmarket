import { forwardRef } from 'react';
import { Link2, Mail, Phone, Receipt, ShieldCheck, User } from 'lucide-react';
import type { FinanceReceiptRecord, FinanceSettings } from '../../lib/adminFinance';
import { formatCurrency, formatDate } from '../../lib/utils';

interface FinanceReceiptPreviewProps {
  receipt: FinanceReceiptRecord;
  settings: FinanceSettings;
}

export const FinanceReceiptPreview = forwardRef<HTMLDivElement, FinanceReceiptPreviewProps>(
  function FinanceReceiptPreview({ receipt, settings }, ref) {
    const companyInitials = settings.companyShortName.trim() || settings.companyName.slice(0, 2).toUpperCase();

    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-8"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] flex-col items-center gap-5 opacity-[0.06]">
            <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-slate-300 bg-white shadow-sm">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.companyName} className="h-24 w-24 rounded-[1.5rem] object-cover" />
              ) : (
                <span className="text-4xl font-black tracking-tight text-slate-900">{companyInitials}</span>
              )}
            </div>
            <p className="text-5xl font-black uppercase tracking-[0.32em] text-slate-900">{settings.companyName}</p>
          </div>
        </div>

        <div className="relative z-10 border-b border-slate-200 pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] text-xl font-black text-white shadow-[0_14px_30px_rgba(43,99,217,0.22)]">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.companyName} className="h-full w-full object-cover" />
            ) : (
              companyInitials
            )}
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Company Receipt</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{settings.companyName}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This branded purchase receipt confirms the completed sale and can be shared with the customer.
          </p>
        </div>

        <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Receipt No.</p>
            <p className="mt-3 text-base font-bold text-slate-950">{receipt.receiptNumber}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Order Ref.</p>
            <p className="mt-3 text-base font-bold text-slate-950">{receipt.orderNumber || 'Direct sale'}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Issue Date</p>
            <p className="mt-3 text-base font-bold text-slate-950">{formatDate(receipt.createdAt)}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payment Status</p>
            <p className="mt-3 text-base font-bold text-emerald-700">Paid / Settled</p>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-center">
            <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-slate-950">
              <User className="h-5 w-5 text-[#2B63D9]" />
              Customer Details
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customer Name</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{receipt.customerName || 'Customer'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phone Number</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{receipt.customerPhone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email Address</p>
                <p className="mt-2 break-words text-base font-semibold text-slate-950">{receipt.customerEmail || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Location</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{receipt.location || 'Not provided'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Address / Note</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {receipt.customerAddress || receipt.note || 'No address or extra note recorded'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-center shadow-sm">
            <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-slate-950">
              <Receipt className="h-5 w-5 text-[#FF7A00]" />
              Purchase Details
            </h3>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{receipt.productName || 'Product sale'}</p>
              </div>
              <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Package / Sale Type</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{receipt.packageTitle || receipt.sourceLabel}</p>
                <p className="mt-1 text-sm text-slate-600">{receipt.sourceLabel}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quantity</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{receipt.quantity}</p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Final Amount</p>
                  <p className="mt-2 text-base font-bold text-slate-950">
                    {formatCurrency(receipt.amount, receipt.localeCountryCode)}
                  </p>
                </div>
              </div>
              <div className="rounded-[1.35rem] bg-gradient-to-br from-[#eff6ff] to-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assurance</p>
                <p className="mt-2 flex items-center justify-center gap-2 text-base font-semibold text-slate-950">
                  <ShieldCheck className="h-4 w-4 text-[#2B63D9]" />
                  Company-branded verified receipt
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Phone className="h-4 w-4" />
              Company Phone
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{settings.companyPhone || 'Not set'}</p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Mail className="h-4 w-4" />
              Business Email
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-slate-950">{settings.companyEmail || 'Not set'}</p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Link2 className="h-4 w-4" />
              Website URL
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-[#2B63D9]">{settings.companyWebsite || 'Not set'}</p>
          </div>
        </div>

        <p className="relative z-10 mt-5 text-center text-sm leading-6 text-slate-600">
          Thank you for doing business with {settings.companyName}. This receipt can be printed, shared, or saved for future reference.
        </p>
      </div>
    );
  },
);
