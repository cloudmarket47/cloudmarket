import { forwardRef } from 'react';
import {
  CalendarDays,
  Link2,
  MapPin,
  Package2,
  Phone,
  Receipt,
  Tag,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { PlacedOrder } from '../../types';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface OrderSlipPreviewProps {
  order: PlacedOrder;
  companyName: string;
  companyShortName: string;
  companyPhone: string;
  websiteUrl: string;
  logoUrl?: string;
  productImage?: string;
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950 sm:text-base">{value}</p>
    </div>
  );
}

export const OrderSlipPreview = forwardRef<HTMLDivElement, OrderSlipPreviewProps>(
  function OrderSlipPreview(
    {
      order,
      companyName,
      companyShortName,
      companyPhone,
      websiteUrl,
      logoUrl,
      productImage,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-left shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
      >
        <div className="bg-[linear-gradient(135deg,#f7fbff_0%,#eef5ff_46%,#ffffff_100%)] px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] text-xl font-black text-white shadow-[0_16px_32px_rgba(43,99,217,0.24)]">
                {logoUrl ? (
                  <ImageWithFallback
                    src={logoUrl}
                    alt={`${companyName} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  companyShortName
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2B63D9]">
                  Premium Order Slip
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  {order.productName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{companyName}</p>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[#cfe0ff] bg-white px-4 py-3 shadow-sm sm:max-w-[13rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Order Number
              </p>
              <p className="mt-2 text-base font-bold text-slate-950">{order.orderNumber}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 rounded-[1.6rem] border border-white/70 bg-white/90 p-4 shadow-[0_16px_40px_rgba(43,99,217,0.08)] sm:flex-row sm:items-center">
            <div className="overflow-hidden rounded-[1.25rem] bg-slate-100 sm:h-24 sm:w-24">
              {productImage ? (
                <ImageWithFallback
                  src={productImage}
                  alt={order.productName}
                  className="h-28 w-full object-cover sm:h-24 sm:w-24"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-slate-100 text-slate-400 sm:h-24 sm:w-24">
                  <Package2 className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Ordered Package
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-950">{order.packageTitle}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{order.packageDescription}</p>
            </div>

            <div className="rounded-[1.25rem] bg-slate-950 px-4 py-3 text-white sm:min-w-[11rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Final Total
              </p>
              <p className="mt-2 text-xl font-black">
                {formatCurrency(order.finalAmount, order.localeCountryCode)}
              </p>
              <p className="mt-1 text-xs text-white/70">Pay on Delivery</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <InfoTile label="Order Date" value={formatDate(order.createdAt)} />
          <InfoTile label="Payment Method" value="Pay on Delivery" />
          <InfoTile label="Quantity" value={String(order.quantity)} />
          <InfoTile label="Sets Included" value={order.setsIncluded} />
        </div>

        <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-950 sm:text-lg">
              <User className="h-5 w-5 text-[#2B63D9]" />
              Customer Details
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoTile label="Customer Name" value={order.customerName} />
              <InfoTile label="Phone Number" value={order.customerPhone} />
              <div className="sm:col-span-2">
                <InfoTile label="Delivery Address" value={order.customerAddress} />
              </div>
              <InfoTile label="City / State" value={order.city} />
              <InfoTile
                label="Delivery Message"
                value={order.shortDeliveryMessage || 'No delivery note provided'}
              />
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-950 sm:text-lg">
              <Receipt className="h-5 w-5 text-[#FF7A00]" />
              Payment Summary
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-[1.2rem] bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="text-sm font-semibold text-slate-950">
                  {formatCurrency(order.baseAmount, order.localeCountryCode)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[1.2rem] bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Discount</span>
                <span className="text-sm font-semibold text-slate-950">
                  {order.discountAmount > 0
                    ? `-${formatCurrency(order.discountAmount, order.localeCountryCode)}`
                    : 'No discount'}
                </span>
              </div>
              <div className="rounded-[1.25rem] bg-[linear-gradient(135deg,#0f172a_0%,#1f3b73_100%)] px-4 py-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Amount Due on Delivery
                </p>
                <p className="mt-2 text-2xl font-black">
                  {formatCurrency(order.finalAmount, order.localeCountryCode)}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-3 border-t border-slate-200 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <InfoTile label="Product" value={order.productName} />
          <InfoTile label="Discount Token" value={order.customerToken || 'No token used'} />
          <InfoTile label="Company Phone" value={companyPhone} />
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
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

        <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              Keep this slip for reference
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <MapPin className="h-4 w-4 text-slate-500" />
              Delivery confirmation follows by phone call
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <Tag className="h-4 w-4 text-slate-500" />
              Dispatch starts after call confirmation
            </span>
          </div>
        </div>
      </div>
    );
  },
);
