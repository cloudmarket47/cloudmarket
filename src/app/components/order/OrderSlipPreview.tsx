import { forwardRef } from 'react';
import { Link2, Phone, Receipt, Tag, User } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { PlacedOrder } from '../../types';

interface OrderSlipPreviewProps {
  order: PlacedOrder;
  companyPhone: string;
  websiteUrl: string;
}

export const OrderSlipPreview = forwardRef<HTMLDivElement, OrderSlipPreviewProps>(
  function OrderSlipPreview({ order, companyPhone, websiteUrl }, ref) {
    return (
      <div
        ref={ref}
        className="rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-8"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] text-xl font-black text-white shadow-[0_14px_30px_rgba(43,99,217,0.22)]">
            CB
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Premium Order Slip
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Crevice Brush Nigeria
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This receipt summarizes your order and confirms your delivery details.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Order Number
            </p>
            <p className="mt-3 text-lg font-bold text-slate-950">{order.orderNumber}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Order Date
            </p>
            <p className="mt-3 text-lg font-bold text-slate-950">{formatDate(order.createdAt)}</p>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Payment Method
            </p>
            <p className="mt-3 text-lg font-bold text-slate-950">Pay on Delivery</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-center">
            <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-slate-950">
              <User className="h-5 w-5 text-[#2B63D9]" />
              Customer Details
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customer Name</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phone Number</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{order.customerPhone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Delivery Address</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{order.customerAddress}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">City / State</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{order.city}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Delivery Message</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {order.shortDeliveryMessage || 'No delivery note provided'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-center shadow-sm">
            <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-slate-950">
              <Receipt className="h-5 w-5 text-[#FF7A00]" />
              Order Details
            </h3>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{order.productName}</p>
              </div>
              <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Package</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{order.packageTitle}</p>
                <p className="mt-1 text-sm text-slate-600">{order.packageDescription}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quantity</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{order.quantity}</p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sets Included</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{order.setsIncluded}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Subtotal</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {formatCurrency(order.baseAmount, order.localeCountryCode)}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Discount</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {order.discountAmount > 0
                      ? `-${formatCurrency(order.discountAmount, order.localeCountryCode)}`
                      : 'No discount applied'}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Final Total</p>
                  <p className="mt-2 text-base font-bold text-slate-950">
                    {formatCurrency(order.finalAmount, order.localeCountryCode)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Tag className="h-4 w-4" />
              Discount Token
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {order.customerToken || 'No token used'}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Phone className="h-4 w-4" />
              Company Phone
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{companyPhone}</p>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Link2 className="h-4 w-4" />
              Website URL
            </p>
            <a
              href={websiteUrl}
              className="mt-2 block break-all text-sm font-semibold text-[#2B63D9] underline underline-offset-4"
            >
              {websiteUrl}
            </a>
          </div>
        </div>

        <p className="mt-5 text-center text-sm leading-6 text-slate-600">
          Keep this order slip for reference. Our team will call to confirm delivery and dispatch your order.
        </p>
      </div>
    );
  },
);
