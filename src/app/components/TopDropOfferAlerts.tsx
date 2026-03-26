import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ShoppingBag, Tag } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import type { SupportedCountryCode } from '../lib/localeData';
import type { Product } from '../types';

interface TopDropOfferAlertsProps {
  enabled?: boolean;
  items?: Product['sections']['alerts']['items'];
  currentProductName: string;
  productNames?: string[];
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

const LOCATION_POOLS: Record<SupportedCountryCode | 'DEFAULT', string[]> = {
  NG: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu'],
  GH: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Tema'],
  US: ['New York', 'Houston', 'Los Angeles', 'Atlanta', 'Miami', 'Chicago'],
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
  DEFAULT: ['London', 'Dubai', 'Toronto', 'Berlin'],
};

const NAME_POOLS: Record<SupportedCountryCode | 'DEFAULT', string[]> = {
  NG: ['Aisha', 'Chinedu', 'Tolu', 'Amaka', 'Ibrahim', 'Kemi', 'Uche', 'Sade'],
  GH: ['Kwame', 'Abena', 'Kofi', 'Akosua', 'Kojo', 'Efua', 'Nana', 'Ama'],
  US: ['Mia', 'Jordan', 'Noah', 'Sophia', 'Marcus', 'Ava', 'Taylor', 'Olivia'],
  KE: ['Amina', 'Brian', 'Njeri', 'Otieno', 'Joy', 'Kevin', 'Wanjiku', 'Achieng'],
  ZA: ['Thabo', 'Lerato', 'Naledi', 'Anele', 'Kabelo', 'Ayanda', 'Zanele', 'Sibusiso'],
  DEFAULT: ['Maya', 'Daniel', 'Layla', 'Lucas', 'Emma', 'Ethan', 'Sofia', 'Leo'],
};

const ALERT_HISTORY_SESSION_KEY = 'cloudmarket.social-proof-history';
const ALERT_VISIBLE_MS = 5000;
const ALERT_INTERVAL_MIN_MS = 15000;
const ALERT_INTERVAL_MAX_MS = 25000;
const ALERT_TRANSITION_SECONDS = 0.55;

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]) {
  return items[getRandomInt(0, items.length - 1)];
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
  productNames = [],
}: TopDropOfferAlertsProps) {
  const { countryCode } = useLocale();
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

  const productPool = useMemo(() => {
    const seen = new Set<string>();
    const normalizedNames = [currentProductName, ...productNames]
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .filter((name) => {
        const key = name.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });

    return normalizedNames.length > 0 ? normalizedNames : ['this product'];
  }, [currentProductName, productNames]);

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
    if (!enabled || alerts.length === 0) {
      setIsVisible(false);
      setActiveAlert(null);
      return;
    }

    let isCancelled = false;
    let showTimer = 0;
    let hideTimer = 0;

    const buildDynamicOrderAlert = (template: OfferAlertItem) => {
      const cityPool = LOCATION_POOLS[countryCode] ?? LOCATION_POOLS.DEFAULT;
      const namePool = NAME_POOLS[countryCode] ?? NAME_POOLS.DEFAULT;
      let nextName = namePool[0];
      let nextCity = cityPool[0];
      let nextProduct = productPool[0];
      let nextMinutesAgo = 2;
      let nextSignature = '';

      for (let attempt = 0; attempt < 24; attempt += 1) {
        nextName = pickRandom(namePool);
        nextCity = pickRandom(cityPool);
        nextProduct = pickRandom(productPool);
        nextMinutesAgo = getRandomInt(2, 59);
        nextSignature = `${nextName}|${nextCity}|${nextProduct}|${nextMinutesAgo}`;

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
        title: `${nextName} from ${nextCity}`,
        message: `purchased ${nextProduct}`,
        timestampLabel: `${nextMinutesAgo} mins ago`,
      } satisfies AlertCandidate;
    };

    const buildStaticAlert = (template: OfferAlertItem) => {
      const signature = `${template.kind}|${template.badge}|${template.title}|${template.message}`;

      return {
        id: `${template.id}-${Date.now()}`,
        signature,
        kind: template.kind,
        badge: template.badge,
        title: template.title,
        message: template.message,
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
  }, [alerts, countryCode, enabled, productPool]);

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
            className="pointer-events-auto relative w-full max-w-[24rem] overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.9),rgba(255,255,255,0.1))]" />
            <div className="absolute -left-10 top-0 h-24 w-24 rounded-full bg-[#2B63D9]/10 blur-3xl" aria-hidden="true" />

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
