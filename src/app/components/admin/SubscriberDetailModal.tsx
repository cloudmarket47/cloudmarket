import { useEffect, useState } from 'react';
import { Copy, Mail, NotebookPen, ShieldCheck, Ticket, UserRound, X } from 'lucide-react';
import type { AdminSubscriberProfile } from '../../lib/adminSubscribers';
import {
  formatSubscriberActivityLabel,
  type SubscriberActivityRecord,
  type SubscriberLifecycleStatus,
} from '../../lib/subscriberTelemetry';
import { formatCurrency, formatDate } from '../../lib/utils';

interface SubscriberDetailModalProps {
  subscriber: AdminSubscriberProfile | null;
  onClose: () => void;
  onSaveManagement: (
    token: string,
    update: {
      status: SubscriberLifecycleStatus;
      notes: string;
    },
  ) => void;
}

function formatTime(dateValue: string) {
  return new Date(dateValue).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getActivityDescription(activity: SubscriberActivityRecord) {
  if (activity.type === 'page_view') {
    return activity.pagePath || 'Visited a storefront page';
  }

  if (activity.type === 'product_view') {
    return activity.productName || activity.productSlug || 'Viewed a product page';
  }

  if (activity.type === 'package_selected') {
    return activity.packageTitle || activity.productName || 'Selected a package';
  }

  if (activity.type === 'token_applied') {
    return activity.productName
      ? `Applied token on ${activity.productName}`
      : 'Applied discount token';
  }

  if (activity.type === 'order_submitted') {
    return activity.orderNumber
      ? `Order ${activity.orderNumber} for ${activity.productName || 'product'}`
      : 'Submitted an order';
  }

  if (activity.type === 'token_redeemed') {
    return activity.productName
      ? `Discount used on ${activity.productName}`
      : 'Redeemed subscriber token';
  }

  if (activity.type === 'subscription_created') {
    return activity.productName
      ? `Subscribed from ${activity.productName}`
      : 'Joined the subscriber list';
  }

  return 'Recovered subscriber token';
}

function copySubscriberProfile(subscriber: AdminSubscriberProfile) {
  const lines = [
    `Subscriber: ${subscriber.record.fullName || 'Customer'}`,
    `Email: ${subscriber.record.email}`,
    `Token: ${subscriber.record.token}`,
    `Status: ${subscriber.status}`,
    `Segment: ${subscriber.segment}`,
    `Location: ${subscriber.record.location || 'Not set'}`,
    `Source Product: ${subscriber.sourceProductName || 'Direct'}`,
    `Remaining Uses: ${subscriber.record.remainingUses}`,
    `Total Orders: ${subscriber.totalOrders}`,
    `Discounted Orders: ${subscriber.discountedOrders}`,
    `Total Spent: ${formatCurrency(subscriber.totalSpent)}`,
    `Last Active: ${formatDate(subscriber.lastActiveAt)} ${formatTime(subscriber.lastActiveAt)}`,
  ];

  return navigator.clipboard.writeText(lines.join('\n'));
}

export function SubscriberDetailModal({
  subscriber,
  onClose,
  onSaveManagement,
}: SubscriberDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<SubscriberLifecycleStatus>('active');
  const [notes, setNotes] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!subscriber) {
      return;
    }

    setSelectedStatus(subscriber.status);
    setNotes(subscriber.notes);
    setCopyFeedback('');
  }, [subscriber]);

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

  if (!subscriber) {
    return null;
  }

  const recentOrders = subscriber.matchedOrders.slice(0, 6);
  const activityFeed = subscriber.recentActivity.slice(0, 12);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm md:items-center md:p-6">
      <button type="button" aria-label="Close subscriber detail" className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Subscriber Control Panel
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {subscriber.record.fullName || subscriber.record.email}
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
              <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(238,245,255,0.98))] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Subscriber profile
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-950">
                      {subscriber.record.fullName || 'Customer'}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4" />
                      {subscriber.record.email}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      {subscriber.status}
                    </span>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {subscriber.segment.replace('-', ' ')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Token</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.record.token}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Remaining Uses</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.record.remainingUses}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Location</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {subscriber.record.location || 'Not set'}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Source Product</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {subscriber.sourceProductName || 'Direct signup'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Orders</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{subscriber.totalOrders}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Discount Uses</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{subscriber.discountedOrders}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Spent</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatCurrency(subscriber.totalSpent)}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Last Active</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(subscriber.lastActiveAt)}</p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#2B63D9]" />
                  <h3 className="text-lg font-bold text-slate-950">Manage subscriber</h3>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Lifecycle status</label>
                    <select
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value as SubscriberLifecycleStatus)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                    >
                      <option value="active">Active</option>
                      <option value="vip">VIP</option>
                      <option value="paused">Paused</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Internal notes</label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Save delivery preferences, campaign notes, loyalty observations or support issues."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onSaveManagement(subscriber.record.token, { status: selectedStatus, notes })}
                    className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Save Subscriber Status
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(subscriber.record.email);
                      setCopyFeedback('Email copied');
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Mail className="h-4 w-4" />
                    Copy Email
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(subscriber.record.token);
                      setCopyFeedback('Token copied');
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Ticket className="h-4 w-4" />
                    Copy Token
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await copySubscriberProfile(subscriber);
                      setCopyFeedback('Subscriber summary copied');
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Profile
                  </button>
                </div>

                {copyFeedback ? (
                  <p className="mt-3 text-sm font-semibold text-[#2B63D9]">{copyFeedback}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-5 w-5 text-[#2B63D9]" />
                  <h3 className="text-lg font-bold text-slate-950">Behavior timeline</h3>
                </div>

                {activityFeed.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {activityFeed.map((activity) => (
                      <div key={activity.id} className="rounded-[1.25rem] bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {formatSubscriberActivityLabel(activity)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {getActivityDescription(activity)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {formatDate(activity.createdAt)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{formatTime(activity.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <p className="text-base font-bold text-slate-950">No activity captured yet</p>
                    <p className="mt-2 text-sm text-slate-600">
                      This subscriber will appear here once they browse, apply a token, or place an order.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-[#2B63D9]" />
                  <h3 className="text-lg font-bold text-slate-950">Order and token usage</h3>
                </div>

                {recentOrders.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.orderNumber} className="rounded-[1.25rem] bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{order.productName}</p>
                            <p className="mt-1 text-sm text-slate-600">{order.packageTitle}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {order.orderNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-950">
                              {formatCurrency(order.finalAmount, order.localeCountryCode)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <p className="text-base font-bold text-slate-950">No linked orders yet</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Orders tied to this subscriber token will appear here automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
