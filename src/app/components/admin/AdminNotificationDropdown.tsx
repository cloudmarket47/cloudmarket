import {
  AlertTriangle,
  Bell,
  BellOff,
  Boxes,
  CheckCheck,
  Package,
  ReceiptText,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  AdminNotificationItem,
  AdminNotificationSnapshot,
} from '../../lib/adminNotifications';

interface AdminNotificationDropdownProps {
  isOpen: boolean;
  isLoading: boolean;
  notificationsEnabled: boolean;
  snapshot: AdminNotificationSnapshot | null;
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: AdminNotificationItem) => void;
}

function formatNotificationTime(dateValue: string) {
  return new Date(dateValue).toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getToneClasses(tone: AdminNotificationItem['tone']) {
  switch (tone) {
    case 'blue':
      return 'bg-blue-50 text-blue-700';
    case 'orange':
      return 'bg-orange-50 text-orange-700';
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700';
    case 'rose':
      return 'bg-rose-50 text-rose-700';
    case 'violet':
      return 'bg-violet-50 text-violet-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function NotificationGlyph({ notification }: { notification: AdminNotificationItem }) {
  const className = `h-4 w-4 ${getToneClasses(notification.tone)} rounded-full p-0.5`;

  switch (notification.kind) {
    case 'order':
      return <Package className={className} />;
    case 'subscriber':
      return <Users className={className} />;
    case 'finance':
      return <ReceiptText className={className} />;
    case 'product':
      return <Boxes className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function AdminNotificationDropdown({
  isOpen,
  isLoading,
  notificationsEnabled,
  snapshot,
  onClose,
  onMarkAllRead,
  onOpenNotification,
}: AdminNotificationDropdownProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-0 top-[calc(100%+0.85rem)] z-50 w-[min(92vw,26rem)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Admin Notifications
          </p>
          <p className="mt-1 text-base font-bold text-slate-950">
            {snapshot?.unreadCount ?? 0} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notificationsEnabled && (snapshot?.unreadCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
            aria-label="Close notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!notificationsEnabled ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <BellOff className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-950">Notifications are paused</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Re-enable admin notifications from the settings page when you want live alerts again.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 px-5 py-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`notification-skeleton-${index + 1}`}
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : snapshot && snapshot.notifications.length > 0 ? (
        <div className="max-h-[70vh] overflow-y-auto px-3 py-3">
          <div className="space-y-2">
            {snapshot.notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => onOpenNotification(notification)}
                className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                  notification.unread
                    ? 'border-[#2B63D9]/20 bg-[#f8fbff] hover:border-[#2B63D9]/35'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <NotificationGlyph notification={notification} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {notification.title}
                      </p>
                      {notification.unread ? (
                        <span className="inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#2B63D9]" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-slate-400">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {notification.ctaLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-950">No notifications right now</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Fresh order, subscriber, finance, and product alerts will show up here automatically.
          </p>
        </div>
      )}
    </div>
  );
}
