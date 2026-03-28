import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ShoppingBag, Tag } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import {
  getCustomerNamePoolForContext,
  LOCATION_POOLS,
  type CustomerGenderTarget,
  type CustomerIdentityPools,
} from '../lib/customerIdentityPools';
import type { Product } from '../types';

interface TopDropOfferAlertsProps {
  enabled?: boolean;
  items?: Product['sections']['alerts']['items'];
  currentProductName: string;
  genderTarget?: CustomerGenderTarget;
  customerIdentityPools?: CustomerIdentityPools;
}

type AlertKind = 'offer' | 'stock' | 'order';

interface OfferAlertItem {
  id: string;
  kind: AlertKind;
  title: string;
  message: string;
  badge: string;
}

interface ActiveAlert {
  id: string;
  kind: AlertKind;
  badge: string;
  title: string;
  message: string;
  timestampLabel?: string;
}

interface AlertCandidate extends ActiveAlert {
  signature: string;
}

const ALERT_HISTORY_SESSION_KEY = 'cloudmarket.social-proof-history';
const ALERT_VISIBLE_MS = 5000;
const ALERT_INTERVAL_MIN_MS = 15000;
const ALERT_INTERVAL_MAX_MS = 25000;
const ALERT_TRANSITION_SECONDS = 0.55;
const DEFAULT_AUTOMATED_ALERTS: OfferAlertItem[] = [
  {
    id: 'default-order-1',
    kind: 'order',
    badge: 'Hot Orders',
    title: '{name} in {city}',
    message: 'just ordered {quantity} {itemLabel} of {product}.',
  },
  {
    id: 'default-order-2',
    kind: 'order',
    badge: 'Verified',
    title: '{name} near {city}',
    message: 'placed an order for {quantity} {itemLabel} of {product}.',
  },
  {
    id: 'default-order-3',
    kind: 'order',
    badge: 'Dispatch',
    title: 'Dispatch queued for {name}',
    message: '{quantity} {itemLabel} of {product} just entered the delivery queue.',
  },
  {
    id: 'default-order-4',
    kind: 'order',
    badge: 'Nearby Order',
    title: 'A new order near {city}',
    message: '{name} just checked out {quantity} {itemLabel} of {product}.',
  },
  {
    id: 'default-order-5',
    kind: 'order',
    badge: 'Checkout Pulse',
    title: '{name} just checked out',
    message: '{quantity} {itemLabel} of {product} were added to a pay-on-delivery order.',
  },
  {
    id: 'default-order-6',
    kind: 'order',
    badge: 'Local Buyer',
    title: '{name} from {city}',
    message: 'confirmed {quantity} {itemLabel} of {product} from this page.',
  },
  {
    id: 'default-order-7',
    kind: 'order',
    badge: 'Fast Move',
    title: 'Fresh order in {city}',
    message: '{name} just reserved {quantity} {itemLabel} of {product}.',
  },
  {
    id: 'default-order-8',
    kind: 'order',
    badge: 'Demand Signal',
    title: '{name} placed a new order',
    message: '{product} just picked up another checkout for {quantity} {itemLabel}.',
  },
  {
    id: 'default-order-9',
    kind: 'order',
    badge: 'Queue Update',
    title: '{name} is next in line',
    message: '{quantity} {itemLabel} of {product} just moved into processing.',
  },
  {
    id: 'default-order-10',
    kind: 'order',
    badge: 'Recent Purchase',
    title: '{name} in {city}',
    message: 'just completed an order for {quantity} {itemLabel} of {product}.',
  },
  {
    id: 'default-stock-1',
    kind: 'stock',
    badge: 'Low Stock',
    title: 'Stock running low',
    message: 'Only about {stockCount} units are left in the current batch of {product}.',
  },
  {
    id: 'default-stock-2',
    kind: 'stock',
    badge: 'Almost Gone',
    title: 'This batch is moving fast',
    message: '{product} is down to roughly {stockCount} units for this stock window.',
  },
  {
    id: 'default-stock-3',
    kind: 'stock',
    badge: 'Batch Alert',
    title: 'Inventory pressure rising',
    message: 'Demand is eating into the last {stockCount} units available right now.',
  },
  {
    id: 'default-stock-4',
    kind: 'stock',
    badge: 'Restock Watch',
    title: 'Restock may be needed soon',
    message: '{product} has only around {stockCount} units left before the next refill.',
  },
  {
    id: 'default-stock-5',
    kind: 'stock',
    badge: 'Limited Units',
    title: 'Current stock window is tightening',
    message: 'This page is working through the final {stockCount} units in the active batch.',
  },
  {
    id: 'default-offer-1',
    kind: 'offer',
    badge: 'Flash Deal',
    title: 'Promo window is still live',
    message: 'Customers can still unlock up to {discount}% savings on {product} today.',
  },
  {
    id: 'default-offer-2',
    kind: 'offer',
    badge: 'Free Delivery',
    title: 'Delivery perk is active',
    message: 'This page still includes free delivery support on qualifying orders.',
  },
  {
    id: 'default-offer-3',
    kind: 'offer',
    badge: 'Bundle Save',
    title: 'Bundle buyers are saving more',
    message: 'Multi-pack orders are still unlocking stronger savings on {product}.',
  },
  {
    id: 'default-offer-4',
    kind: 'offer',
    badge: 'Weekend Drop',
    title: 'Short pricing window live',
    message: '{product} is still running a short promo push for today’s visitors.',
  },
  {
    id: 'default-offer-5',
    kind: 'offer',
    badge: 'Launch Deal',
    title: 'Offer still open',
    message: 'Early shoppers can still grab {product} before this pricing window resets.',
  },
];

type AlertAudioContextConstructor = typeof AudioContext;
let sharedAlertAudioContext: AudioContext | null = null;

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]) {
  return items[getRandomInt(0, items.length - 1)];
}

function resolveAlertTemplate(
  value: string,
  context: Record<string, string | number>,
) {
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(context[key] ?? ''));
}

function playAlertPopSound() {
  if (typeof window === 'undefined') {
    return;
  }

  const extendedWindow = window as Window &
    typeof globalThis & {
      webkitAudioContext?: AlertAudioContextConstructor;
    };
  const AudioContextCtor =
    extendedWindow.AudioContext ?? extendedWindow.webkitAudioContext ?? null;

  if (!AudioContextCtor) {
    return;
  }

  if (!sharedAlertAudioContext) {
    sharedAlertAudioContext = new AudioContextCtor();
  }

  const audioContext = sharedAlertAudioContext;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => undefined);
  }

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(680, now);
  oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.08);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.035, now + 0.014);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function readAlertHistory() {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const saved = window.sessionStorage.getItem(ALERT_HISTORY_SESSION_KEY);

    if (!saved) {
      return new Set<string>();
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? new Set(parsed.filter((value) => typeof value === 'string')) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function writeAlertHistory(history: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      ALERT_HISTORY_SESSION_KEY,
      JSON.stringify(Array.from(history).slice(-80)),
    );
  } catch {
    // Ignore storage write failures. Alerts still work without session persistence.
  }
}

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

export function TopDropOfferAlerts({
  enabled = true,
  items = [],
  currentProductName,
  genderTarget = 'all',
  customerIdentityPools,
}: TopDropOfferAlertsProps) {
  const { countryCode } = useLocale();
  const alerts = useMemo<OfferAlertItem[]>(() => {
    const configuredAlerts = items
      .filter((item) => item.title.trim() || item.message.trim() || item.badge.trim())
      .map((item, index) => ({
        id: `${item.kind}-${index}-${item.title}`,
        ...item,
      }));

    return configuredAlerts.length > 0 ? configuredAlerts : DEFAULT_AUTOMATED_ALERTS;
  }, [items]);

  const productPool = useMemo(() => {
    const normalizedName = currentProductName.trim();

    return normalizedName ? [normalizedName] : ['this product'];
  }, [currentProductName]);

  const historyRef = useRef<Set<string>>(readAlertHistory());
  const previousAlertKeyRef = useRef<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    historyRef.current = readAlertHistory();
  }, []);

  useEffect(() => {
    previousAlertKeyRef.current = null;
    historyRef.current = readAlertHistory();
    setActiveAlert(null);
  }, [alerts, currentProductName, productPool]);

  useEffect(() => {
    if (isVisible && activeAlert) {
      playAlertPopSound();
    }
  }, [activeAlert, isVisible]);

  useEffect(() => {
    if (!enabled || alerts.length === 0) {
      setIsVisible(false);
      setActiveAlert(null);
      return;
    }

    let isCancelled = false;
    let showTimer = 0;
    let hideTimer = 0;

    const buildAlertContext = () => {
      const cityPool = LOCATION_POOLS[countryCode] ?? LOCATION_POOLS.DEFAULT;
      const namePool = getCustomerNamePoolForContext({
        customerIdentityPools,
        countryCode,
        genderTarget,
      });
      const product = productPool[0] ?? 'this product';
      const quantity = getRandomInt(1, 6);
      const unitWord = pickRandom(['unit', 'pack', 'set']);
      const minutesAgo = getRandomInt(2, 59);

      return {
        name: pickRandom(namePool),
        city: pickRandom(cityPool),
        product,
        quantity,
        itemLabel: `${unitWord}${quantity === 1 ? '' : 's'}`,
        minutesAgo,
        stockCount: getRandomInt(6, 35),
        discount: getRandomInt(5, 18),
      };
    };

    const buildDynamicOrderAlert = (template: OfferAlertItem) => {
      let nextContext = buildAlertContext();
      let nextSignature = '';

      for (let attempt = 0; attempt < 24; attempt += 1) {
        nextContext = buildAlertContext();
        nextSignature = [
          template.id,
          nextContext.name,
          nextContext.city,
          nextContext.product,
          nextContext.quantity,
          nextContext.minutesAgo,
        ].join('|');

        if (
          nextSignature !== previousAlertKeyRef.current &&
          !historyRef.current.has(nextSignature)
        ) {
          break;
        }
      }

      return {
        id: `${template.id}-${nextSignature}-${Date.now()}`,
        signature: nextSignature,
        kind: template.kind,
        badge: template.badge || 'Recent purchase',
        title: resolveAlertTemplate(template.title, nextContext),
        message: resolveAlertTemplate(template.message, nextContext),
        timestampLabel: `${nextContext.minutesAgo} mins ago`,
      } satisfies AlertCandidate;
    };

    const buildStaticAlert = (template: OfferAlertItem) => {
      const nextContext = buildAlertContext();
      const title = resolveAlertTemplate(template.title, nextContext);
      const message = resolveAlertTemplate(template.message, nextContext);
      const signature = `${template.kind}|${template.badge}|${title}|${message}`;

      return {
        id: `${template.id}-${Date.now()}`,
        signature,
        kind: template.kind,
        badge: template.badge,
        title,
        message,
      } satisfies AlertCandidate;
    };

    const commitCandidate = (candidate: AlertCandidate) => {
      previousAlertKeyRef.current = candidate.signature;
      historyRef.current.add(candidate.signature);
      writeAlertHistory(historyRef.current);

      return {
        id: candidate.id,
        kind: candidate.kind,
        badge: candidate.badge,
        title: candidate.title,
        message: candidate.message,
        timestampLabel: candidate.timestampLabel,
      } satisfies ActiveAlert;
    };

    const createNextAlert = () => {
      if (alerts.length === 1) {
        const onlyAlert = alerts[0].kind === 'order'
          ? buildDynamicOrderAlert(alerts[0])
          : buildStaticAlert(alerts[0]);

        return commitCandidate(onlyAlert);
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const selectedTemplate = pickRandom(alerts);
        const nextAlert =
          selectedTemplate.kind === 'order'
            ? buildDynamicOrderAlert(selectedTemplate)
            : buildStaticAlert(selectedTemplate);

        if (nextAlert.signature !== previousAlertKeyRef.current) {
          return commitCandidate(nextAlert);
        }
      }

      const fallbackTemplate = alerts[0];
      const fallbackAlert = fallbackTemplate.kind === 'order'
        ? buildDynamicOrderAlert(fallbackTemplate)
        : buildStaticAlert(fallbackTemplate);

      return commitCandidate(fallbackAlert);
    };

    const scheduleNextAlert = (delayMs: number) => {
      showTimer = window.setTimeout(() => {
        if (isCancelled) {
          return;
        }

        setActiveAlert(createNextAlert());
        setIsVisible(true);

        hideTimer = window.setTimeout(() => {
          if (isCancelled) {
            return;
          }

          setIsVisible(false);
          scheduleNextAlert(getRandomInt(ALERT_INTERVAL_MIN_MS, ALERT_INTERVAL_MAX_MS));
        }, ALERT_VISIBLE_MS);
      }, delayMs);
    };

    scheduleNextAlert(getRandomInt(ALERT_INTERVAL_MIN_MS, ALERT_INTERVAL_MAX_MS));

    return () => {
      isCancelled = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [alerts, countryCode, customerIdentityPools, enabled, genderTarget, productPool]);

  if (!enabled || alerts.length === 0 || !activeAlert) {
    return null;
  }

  const styles = getAlertStyles(activeAlert.kind);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[95] flex justify-center px-3 sm:top-6 sm:px-6">
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key={activeAlert.id}
            initial={{ opacity: 0, y: -22, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: ALERT_TRANSITION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
            aria-live="polite"
            className="pointer-events-auto relative w-full max-w-[24rem] overflow-hidden rounded-[1.7rem] border border-[#FF7A00]/65 bg-white/82 shadow-[0_20px_60px_rgba(255,122,0,0.18)] backdrop-blur-xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(255,122,0,0.08),rgba(255,255,255,0.94),rgba(255,122,0,0.08))]" />
            <div className="absolute -left-10 top-0 h-24 w-24 rounded-full bg-[#2B63D9]/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -right-10 bottom-0 h-24 w-24 rounded-full bg-[#FF7A00]/12 blur-3xl" aria-hidden="true" />

            <div className="flex items-start gap-3 p-4">
              <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${styles.iconWrapClass}`}>
                {styles.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="text-sm font-bold leading-5 text-slate-900">{activeAlert.title}</p>
                  {activeAlert.timestampLabel ? (
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {activeAlert.timestampLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-5 text-slate-600">{activeAlert.message}</p>
              </div>

              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm ${styles.badgeClass}`}>
                {activeAlert.badge}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
