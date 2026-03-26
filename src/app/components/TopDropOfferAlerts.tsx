import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ShoppingBag, Tag } from 'lucide-react';
import type { Product } from '../types';

interface TopDropOfferAlertsProps {
  enabled?: boolean;
  items?: Product['sections']['alerts']['items'];
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

export function TopDropOfferAlerts({ enabled = true, items = [] }: TopDropOfferAlertsProps) {
  const alerts = useMemo<OfferAlertItem[]>(
    () =>
      items
        .filter((item) => item.title.trim() || item.message.trim() || item.badge.trim())
        .map((item, index) => ({
          id: `${item.kind}-${index}-${item.title}`,
          ...item,
        })),
    [items],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [alerts.length]);

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
