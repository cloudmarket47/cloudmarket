import { useEffect, useMemo, useState } from 'react';
import { useAppTheme } from '../context/AppThemeContext';

interface StickyMobileCTAProps {
  onBuyNow: (source?: string) => void;
  captions?: string[];
}

const DEFAULT_ROTATING_CAPTIONS = [
  'Order Now - Pay on Delivery',
  'Claim Today\'s Free Delivery Offer',
  'Get the Bundle Before It Sells Out',
  'Unlock the Best Promo Package Now',
  'Tap to Reserve Your Discounted Order',
];

export function StickyMobileCTA({ onBuyNow, captions }: StickyMobileCTAProps) {
  const { isDarkMode } = useAppTheme();
  const resolvedCaptions = useMemo(() => {
    const source = captions?.filter((item) => item.trim().length > 0) ?? [];
    return source.length > 0 ? source : DEFAULT_ROTATING_CAPTIONS;
  }, [captions]);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);
  const [copyAnimationKey, setCopyAnimationKey] = useState(0);
  const [isFingerVisible, setIsFingerVisible] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  useEffect(() => {
    setActiveCaptionIndex(0);
    setCopyAnimationKey((current) => current + 1);
  }, [resolvedCaptions]);

  useEffect(() => {
    const rotationId = window.setInterval(() => {
      setActiveCaptionIndex((current) => (current + 1) % resolvedCaptions.length);
      setCopyAnimationKey((current) => current + 1);
    }, 7000);

    return () => {
      window.clearInterval(rotationId);
    };
  }, [resolvedCaptions]);

  useEffect(() => {
    let scrollIdleTimeout = 0;

    const handleScroll = () => {
      setIsUserScrolling(true);
      setIsFingerVisible(false);
      window.clearTimeout(scrollIdleTimeout);
      scrollIdleTimeout = window.setTimeout(() => {
        setIsUserScrolling(false);
      }, 900);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(scrollIdleTimeout);
    };
  }, []);

  useEffect(() => {
    if (isUserScrolling) {
      return;
    }

    const fingerCycleId = window.setInterval(() => {
      setIsFingerVisible(true);

      window.setTimeout(() => {
        setIsFingerVisible(false);
      }, 1150);
    }, 3000);

    return () => {
      window.clearInterval(fingerCycleId);
    };
  }, [isUserScrolling]);

  const activeCaption = resolvedCaptions[activeCaptionIndex] ?? DEFAULT_ROTATING_CAPTIONS[0];

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t shadow-[0_-12px_26px_rgba(15,23,42,0.08)] md:hidden ${
        isDarkMode
          ? 'border-white/10 bg-[#0d1117]/95 backdrop-blur-xl'
          : 'border-slate-200 bg-white/95 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="relative">
          {isFingerVisible ? (
            <div
              aria-hidden="true"
              className={`sticky-cta-finger pointer-events-none absolute -left-1 top-1/2 z-10 -translate-y-1/2 text-3xl drop-shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${
                isDarkMode ? 'brightness-110' : ''
              }`}
            >
              {'\u{1F449}'}
            </div>
          ) : null}

          <button
            onClick={() => onBuyNow('sticky_mobile_order_now')}
            className="btn-3d btn-3d-orange relative flex w-full min-h-[4.25rem] items-center justify-center overflow-hidden px-5 py-4 text-center text-lg"
          >
            <span
              key={copyAnimationKey}
              className="sticky-cta-copy inline-flex max-w-[18rem] items-center justify-center leading-6"
            >
              {activeCaption}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
