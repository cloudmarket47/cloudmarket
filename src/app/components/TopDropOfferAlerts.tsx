import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ShoppingBag, Tag } from 'lucide-react';

interface TopDropOfferAlertsProps {
  enabled?: boolean;
}

type AlertKind = 'offer' | 'stock' | 'order';

interface OfferAlertItem {
  id: string;
  kind: AlertKind;
  title: string;
  message: string;
  badge: string;
}

const ALERT_VISIBLE_MS = 6000;
const ALERT_CYCLE_MS = 7600;
const ALERT_TRANSITION_SECONDS = 0.55;

function getAlertStyles(kind: AlertKind) {
  if (kind === 'stock') {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-white" />,
      iconWrapClass: 'bg-[#ef4444]',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    };
  }

  if (kind === 'order') {
    return {
      icon: <ShoppingBag className="h-4 w-4 text-white" />,
      iconWrapClass: 'bg-[#0E7C7B]',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }

  return {
    icon: <Tag className="h-4 w-4 text-white" />,
    iconWrapClass: 'bg-[#2B63D9]',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
}

export function TopDropOfferAlerts({ enabled = true }: TopDropOfferAlertsProps) {
  const alerts = useMemo<OfferAlertItem[]>(
    () => [
      {
        id: 'offer-1',
        kind: 'offer',
        title: 'Limited Time Deal',
        message: 'Buy 1 Get 1 FREE now at promo price. Offer may end soon.',
        badge: 'Offer',
      },
      {
        id: 'stock-1',
        kind: 'stock',
        title: 'Limited Stock Alert',
        message: 'Only 60 left. Hurry now and order yours before you see sold out.',
        badge: 'Stock',
      },
      {
        id: 'order-1',
        kind: 'order',
        title: 'Recent Order',
        message: 'A customer from Abuja just ordered 2 sets.',
        badge: 'New Order',
      },
      {
        id: 'offer-2',
        kind: 'offer',
        title: 'Bundle Offer Active',
        message: 'Buy 2 Get 2 FREE is still available with free delivery across Nigeria.',
        badge: 'Promo',
      },
      {
        id: 'order-2',
        kind: 'order',
        title: 'Recent Order',
        message: 'Two customers from Lagos just ordered 5 minutes ago.',
        badge: 'New Order',
      },
      {
        id: 'stock-2',
        kind: 'stock',
        title: 'Stock Moving Fast',
        message: 'Demand is high right now. Secure your package before stock runs out.',
        badge: 'Hot',
      },
      {
        id: 'offer-3',
        kind: 'offer',
        title: 'Best Value Deal',
        message: 'Buy 3 Get 3 FREE gives the highest savings on this page.',
        badge: 'Best Value',
      },
      {
        id: 'order-3',
        kind: 'order',
        title: 'Recent Order',
        message: 'A customer from Port Harcourt just confirmed an order.',
        badge: 'New Order',
      },
      {
        id: 'order-4',
        kind: 'order',
        title: 'Recent Order',
        message: 'A customer from Ibadan just ordered 1 package.',
        badge: 'New Order',
      },
      {
        id: 'stock-3',
        kind: 'stock',
        title: 'Final Reminder',
        message: 'Only 60 left. Place your order now to avoid missing this batch.',
        badge: 'Urgent',
      },
      {
        id: 'offer-4',
        kind: 'offer',
        title: 'Today\'s Flash Offer',
        message: 'Extra value is live now. Pick your package before this deal rotates out.',
        badge: 'Flash',
      },
      {
        id: 'order-5',
        kind: 'order',
        title: 'Recent Order',
        message: 'A customer from Enugu just ordered 3 sets.',
        badge: 'New Order',
      },
      {
        id: 'order-6',
        kind: 'order',
        title: 'Recent Order',
        message: 'A customer from Kano just completed a 2-set order.',
        badge: 'New Order',
      },
      {
        id: 'stock-4',
        kind: 'stock',
        title: 'Inventory Alert',
        message: 'Only 60 left in this batch. Order now before it shows sold out.',
        badge: 'Low Stock',
      },
      {
        id: 'offer-5',
        kind: 'offer',
        title: 'Free Delivery Offer',
        message: 'All active packages still include free delivery across Nigeria.',
        badge: 'Delivery',
      },
      {
        id: 'order-7',
        kind: 'order',
        title: 'Recent Order',
        message: 'A customer from Benin City just ordered 1 set.',
        badge: 'New Order',
      },
    ],
    [],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled || alerts.length === 0) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, ALERT_VISIBLE_MS);

    const nextTimer = window.setTimeout(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % alerts.length);
    }, ALERT_CYCLE_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(nextTimer);
    };
  }, [activeIndex, alerts.length, enabled]);

  if (!enabled || alerts.length === 0) {
    return null;
  }

  const activeAlert = alerts[activeIndex];
  const styles = getAlertStyles(activeAlert.kind);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[95] flex justify-center px-3 sm:top-4">
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key={`${activeAlert.id}-${activeIndex}`}
            initial={{ opacity: 0, y: -120, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -120, scale: 0.97 }}
            transition={{ duration: ALERT_TRANSITION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#FF7A00]/75 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur-md"
          >
            <div className="flex items-start gap-3 p-3.5 sm:p-4">
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${styles.iconWrapClass}`}>
                {styles.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5 text-slate-900">{activeAlert.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{activeAlert.message}</p>
              </div>

              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles.badgeClass}`}>
                {activeAlert.badge}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
