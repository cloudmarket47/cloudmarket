import { ArrowRight, type LucideIcon, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface MarketplacePromoHeroProps {
  brandName: string;
  heroVisuals: Array<{
    image: string;
    name: string;
    href: string;
  }>;
  heroBenefitItems: Array<{
    icon: LucideIcon;
    label: string;
  }>;
  announcementItems: Array<{
    icon: LucideIcon;
    label: string;
  }>;
  onShopNow: () => void;
  onExploreCategories: () => void;
}

const heroBadgePalette = [
  'border-[#ffd6b0] bg-white/90 text-[#c25a00]',
  'border-[#cde1ff] bg-white/90 text-[#2159d8]',
  'border-[#d7f4e9] bg-white/90 text-[#08715c]',
];

const HERO_CAROUSEL_INTERVAL_MS = 4800;

export function MarketplacePromoHero({
  brandName,
  heroVisuals,
  heroBenefitItems,
  announcementItems,
  onShopNow,
  onExploreCategories,
}: MarketplacePromoHeroProps) {
  const filteredHeroVisuals = useMemo(
    () => heroVisuals.filter((visual) => visual.image.trim()),
    [heroVisuals],
  );
  const [activeVisualIndex, setActiveVisualIndex] = useState(0);

  useEffect(() => {
    setActiveVisualIndex(0);
  }, [filteredHeroVisuals.length]);

  useEffect(() => {
    if (filteredHeroVisuals.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveVisualIndex((currentIndex) => (currentIndex + 1) % filteredHeroVisuals.length);
    }, HERO_CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [filteredHeroVisuals.length]);

  const marqueeItems = useMemo(
    () => [...announcementItems, ...announcementItems],
    [announcementItems],
  );

  return (
    <section id="hero" className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] border border-[#d8e6ff] bg-[linear-gradient(140deg,#fefeff_0%,#f3f8ff_38%,#eef4ff_100%)] shadow-[0_24px_60px_rgba(43,99,217,0.1)] dark:border-[#30363d] dark:bg-[linear-gradient(140deg,#0d1117_0%,#11161d_45%,#0d1117_100%)]">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/86 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2B63D9] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-[#9fc0ff]">
              <Sparkles className="h-3.5 w-3.5" />
              {brandName} picks
            </div>

            <div className="space-y-3">
              <h1 className="max-w-sm text-[2.35rem] font-black leading-[1.05] tracking-[-0.05em] text-slate-950 sm:text-[2.75rem] dark:text-white">
                Shop smarter, faster, better
              </h1>
              <p className="max-w-sm text-base leading-7 text-slate-600 dark:text-slate-300">
                Discover top deals on everyday essentials and jump into products people are buying now.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onShopNow}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2B63D9] px-6 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(43,99,217,0.28)] transition duration-200 hover:bg-[#1f56c6] active:scale-[0.98]"
              >
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onExploreCategories}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Explore Categories
              </button>
            </div>

            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              {heroBenefitItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className={`rounded-[1.2rem] border px-4 py-3 backdrop-blur-sm ${heroBadgePalette[index % heroBadgePalette.length]}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold leading-5">{item.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[300px] overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(43,99,217,0.14),transparent_44%),linear-gradient(160deg,#ffffff_0%,#f7f9fe_55%,#edf3ff_100%)] sm:min-h-[340px] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_42%),linear-gradient(160deg,#0d1117_0%,#11161d_52%,#0d1117_100%)]">
            <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-[#c9dcff] blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[#ffe5b8] blur-3xl" aria-hidden="true" />

            <div className="relative h-full min-h-[300px] w-full overflow-hidden sm:min-h-[340px]">
              {filteredHeroVisuals.length > 0 ? (
                filteredHeroVisuals.map((visual, index) => {
                  const isActive = index === activeVisualIndex;

                  return (
                    <Link
                      key={`${visual.image}-${index}`}
                      to={visual.href}
                      aria-hidden={!isActive}
                      tabIndex={isActive ? 0 : -1}
                      className={cn(
                        'absolute inset-0 block overflow-hidden transition-opacity duration-[1100ms] ease-in-out',
                        isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
                      )}
                    >
                      <ImageWithFallback
                        src={visual.image}
                        alt={visual.name}
                        className="h-full w-full object-cover"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                      />
                    </Link>
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  Add homepage carousel images in admin settings.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/88 px-0 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/92">
        <div className="flex w-max items-center gap-3 whitespace-nowrap [animation:marketplace-announcement-marquee_38s_linear_infinite] hover:[animation-play-state:paused]">
          {marqueeItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={`${item.label}-${index}`}
                className="flex min-w-max items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/80"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2B63D9] shadow-sm dark:bg-slate-900 dark:text-[#9fc0ff]">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
