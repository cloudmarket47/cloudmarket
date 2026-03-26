import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Car,
  Home,
  Laptop,
  LayoutGrid,
  Menu,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../../lib/analyticsTelemetry';
import {
  type ProductCategoryIconName,
  type ResolvedCategoryFilter,
} from '../../lib/productCategories';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const MARKETPLACE_HERO_SLIDE_MS = 4000;
const MARKETPLACE_HERO_SLIDE_TARGET = 10;
const MARKETPLACE_HERO_TILE_BACKGROUNDS = [
  '#cbe7ff',
  '#f9bfd4',
  '#ffe092',
  '#d8c6ff',
  '#bce9d1',
  '#ffd7a6',
  '#c4f0ef',
  '#f4d1ff',
  '#d6e7ff',
  '#ffd6ca',
];

const themeLabels: Record<Product['theme'], string> = {
  classic: 'Daily essential',
  modern: 'Modern find',
  bold: 'Bold drop',
  premium: 'Premium pick',
};

const categoryIconMap: Record<ProductCategoryIconName, typeof Smartphone> = {
  Smartphone,
  Laptop,
  Home,
  ShoppingBag,
  Sparkles,
  Car,
  Activity,
};

interface MarketplaceCategoryMenuItem {
  id: string;
  name: string;
  slug: string;
  icon: ProductCategoryIconName;
  productCount: number;
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
    productCount: number;
  }>;
}

interface MarketplaceHeroProps {
  products: Product[];
  searchQuery: string;
  suggestions: MarketplaceSearchSuggestion[];
  activeFilter: ResolvedCategoryFilter;
  categoryFilters: MarketplaceCategoryMenuItem[];
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  onCategorySelect: (filterSlug: string | null, label: string) => void;
  onSearchSubmit?: () => void;
  onSuggestionSelect?: (suggestion: MarketplaceSearchSuggestion) => void;
}

export interface MarketplaceSearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface HeroSlide {
  id: string;
  name: string;
  description: string;
  image: string;
  link: string;
  badge: string;
  price: number;
  theme: string;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const didCopy = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error('Copy failed');
  }
}

function buildHeroSlides(products: Product[]) {
  const baseSlides: HeroSlide[] = products.flatMap((product) => {
    const uniqueImages = [
      product.image,
      product.sections.hero.image,
      ...product.sections.showcase.images,
      product.sections.solution.image,
    ].filter((image, index, array): image is string => Boolean(image) && array.indexOf(image) === index);

    const imageLimit = products.length >= 3 ? 1 : Math.min(3, uniqueImages.length);

    return uniqueImages.slice(0, imageLimit).map((image, index) => ({
      id: `${product.id}-${index}`,
      name: product.name,
      description: product.shortDescription,
      image,
      link: `/product/${product.slug}`,
      badge: product.sections.offer.badge,
      price: product.price,
      theme: themeLabels[product.theme],
    }));
  });

  if (!baseSlides.length) {
    return [];
  }

  if (baseSlides.length >= MARKETPLACE_HERO_SLIDE_TARGET) {
    return baseSlides.slice(0, MARKETPLACE_HERO_SLIDE_TARGET);
  }

  return Array.from({ length: MARKETPLACE_HERO_SLIDE_TARGET }, (_, index) => {
    const slide = baseSlides[index % baseSlides.length];

    return {
      ...slide,
      id: `${slide.id}-slot-${index}`,
    };
  });
}

export function MarketplaceHero({
  products,
  searchQuery,
  suggestions,
  activeFilter,
  categoryFilters,
  onSearchChange,
  onOpenSidebar,
  onCategorySelect,
  onSearchSubmit,
  onSuggestionSelect,
}: MarketplaceHeroProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);

  const slides = useMemo(() => buildHeroSlides(products), [products]);
  const homepageUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/';
    }

    return new URL('/', window.location.origin).toString();
  }, []);
  const orderedSlides = useMemo(() => {
    if (!slides.length) {
      return [];
    }

    return slides.map((_, index) => slides[(index + activeSlide) % slides.length]);
  }, [slides, activeSlide]);

  useEffect(() => {
    setActiveSlide(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % slides.length);
    }, MARKETPLACE_HERO_SLIDE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slides.length]);

  useEffect(() => {
    if (!shareFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShareFeedback(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shareFeedback]);

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryMenuOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit?.();
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const shouldShowSuggestions = searchQuery.trim().length > 0 && suggestions.length > 0;

  const handleShareSite = async () => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: 'homepage_share_site',
      buttonLabel: 'Share site',
    });

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'CloudMarket',
          text: 'Browse products on CloudMarket.',
          url: homepageUrl,
        });
        trackAnalyticsEvent({
          type: 'share_action',
          pagePath: '/',
          pageType: 'marketplace',
          buttonId: 'homepage_native_share',
          buttonLabel: 'Share site',
          metadata: {
            method: 'native',
          },
        });
        setShareFeedback('Shared');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await copyTextToClipboard(homepageUrl);
      trackAnalyticsEvent({
        type: 'share_action',
        pagePath: '/',
        pageType: 'marketplace',
        buttonId: 'homepage_copy_share_link',
        buttonLabel: 'Copy site link',
        metadata: {
          method: 'copy',
        },
      });
      setShareFeedback('Link copied');
    } catch {
      setShareFeedback('Unable to share');
    }
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200 bg-white">
      <div className="marketplace-hero-ecosystem" aria-hidden="true">
        <div className="marketplace-hero-ecosystem-fade">
          <div className="marketplace-hero-ecosystem-plane">
            <div className="marketplace-hero-ecosystem-grid">
              {orderedSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="marketplace-hero-ecosystem-tile"
                  style={{ '--tile-accent': MARKETPLACE_HERO_TILE_BACKGROUNDS[index % MARKETPLACE_HERO_TILE_BACKGROUNDS.length] } as CSSProperties}
                >
                  <div className="marketplace-hero-ecosystem-tile-frame">
                    <div className="marketplace-hero-ecosystem-tile-media">
                      <ImageWithFallback
                        src={slide.image}
                        alt=""
                        className="marketplace-hero-ecosystem-image"
                      />
                    </div>
                    <div className="marketplace-hero-ecosystem-caption">
                      <span className="marketplace-hero-ecosystem-tag">{slide.theme}</span>
                      <p>{slide.name}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="marketplace-hero-ecosystem-label-card">
                <p className="marketplace-hero-ecosystem-label-title">
                  PHYSICAL
                  <br />
                  ECOSYSTEM
                </p>
                <p className="marketplace-hero-ecosystem-label-copy">
                  Every product, arranged inside one clean and easy shop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:py-14">
        <div className="mx-auto mb-10 flex max-w-5xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/88 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-md transition-colors hover:bg-white"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>

          <Link
            to="/"
            className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold tracking-[0.16em] text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.05)] backdrop-blur-md"
          >
            CLOUDMARKET
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={handleShareSite}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/88 text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-md transition-colors hover:bg-white"
              aria-label="Share site"
              title="Share site"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {shareFeedback ? (
              <div className="absolute right-0 top-[calc(100%+0.65rem)] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
                {shareFeedback}
              </div>
            ) : null}
          </div>
        </div>

        <div className="marketplace-hero-copy-halo mx-auto max-w-[860px] text-center">
          <span className="inline-flex rounded-full border border-[#d7e3ff] bg-white/94 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9] shadow-[0_16px_36px_rgba(15,23,42,0.06)] backdrop-blur-md">
            Marketplace overview
          </span>

          <h1 className="mt-6 text-4xl font-black tracking-[-0.02em] text-slate-950 sm:text-5xl lg:text-[4rem] lg:leading-[1.02]">
            Browse{' '}
            <span className="font-serif text-[#2B63D9] italic font-semibold">stress-free</span>{' '}
            through products picked for everyday needs.
          </h1>

          <p className="mt-6 text-base font-normal leading-[1.6] text-slate-600 sm:text-lg">
            The homepage is built for easy browsing. Shoppers land here first, search products,
            filter by category, and move into the right offer from one clean starting point.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 flex flex-col items-center justify-center gap-3"
          >
            <div className="flex w-full max-w-[500px] items-center justify-between gap-3">
              <div ref={categoryMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen((current) => !current)}
                  aria-label="Open category navigation"
                  aria-expanded={isCategoryMenuOpen}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/94 text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors hover:bg-white"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>

                {isCategoryMenuOpen ? (
                  <div className="absolute left-1/2 top-[calc(100%+0.75rem)] z-30 w-[min(92vw,42rem)] -translate-x-1/2 overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white/96 p-3 text-left shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(43,99,217,0.09),rgba(14,124,123,0.08))] px-4 py-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Category navigation
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Pick a category or drill into a subcategory from here.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onCategorySelect(null, 'All categories');
                          setIsCategoryMenuOpen(false);
                        }}
                        className={cn(
                          'rounded-full border px-4 py-2 text-xs font-semibold transition',
                          activeFilter.kind === 'all'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                        )}
                      >
                        All categories
                      </button>
                    </div>

                    <div className="mt-3 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
                      {categoryFilters.map((category) => {
                        const Icon = categoryIconMap[category.icon];
                        const isCategoryActive = activeFilter.category?.id === category.id;

                        return (
                          <div
                            key={category.id}
                            className={cn(
                              'rounded-[1.5rem] border p-3 transition',
                              isCategoryActive
                                ? 'border-[#bfd5ff] bg-[#f5f9ff]'
                                : 'border-slate-200 bg-white',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onCategorySelect(category.slug, category.name);
                                setIsCategoryMenuOpen(false);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-[1.2rem] px-2 py-2 text-left transition hover:bg-white/70"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span
                                  className={cn(
                                    'flex h-11 w-11 items-center justify-center rounded-2xl',
                                    isCategoryActive && activeFilter.kind === 'category'
                                      ? 'bg-[#2B63D9] text-white'
                                      : 'bg-[#eef4ff] text-[#2B63D9]',
                                  )}
                                >
                                  <Icon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-slate-950">
                                    {category.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-500">
                                    {category.subcategories.length} subcategories
                                  </span>
                                </span>
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {category.productCount}
                              </span>
                            </button>

                            <div className="mt-3 flex flex-wrap gap-2 px-2 pb-1">
                              {category.subcategories.map((subcategory) => {
                                const isSubcategoryActive =
                                  activeFilter.kind === 'subcategory' &&
                                  activeFilter.subcategory?.slug === subcategory.slug;

                                return (
                                  <button
                                    key={subcategory.id}
                                    type="button"
                                    onClick={() => {
                                      onCategorySelect(subcategory.slug, subcategory.name);
                                      setIsCategoryMenuOpen(false);
                                    }}
                                    className={cn(
                                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition',
                                      isSubcategoryActive
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white',
                                    )}
                                  >
                                    <span>{subcategory.name}</span>
                                    <span
                                      className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[10px]',
                                        isSubcategoryActive
                                          ? 'bg-white/14 text-white'
                                          : 'bg-white text-slate-500',
                                      )}
                                    >
                                      {subcategory.productCount}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white/94 px-4 py-2.5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Category
                </span>
                <span className="truncate text-sm font-semibold text-slate-800">
                  {activeFilter.label}
                </span>
              </div>
            </div>

            <div className="relative w-full max-w-[500px]">
              <label className="flex h-14 w-full items-center gap-3 rounded-full border border-slate-200 bg-white/94 px-5 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
                <Search className="h-4.5 w-4.5 flex-shrink-0" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search products"
                  className="h-full w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>

              {shouldShowSuggestions ? (
                <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white/96 p-2 text-left shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                  <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Suggestions
                  </p>
                  <div className="space-y-1">
                    {suggestions.map((suggestion) => (
                      <Link
                        key={suggestion.id}
                        to={suggestion.href}
                        onClick={() => onSuggestionSelect?.(suggestion)}
                        className="flex items-start justify-between gap-3 rounded-[1.15rem] px-3 py-3 transition hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {suggestion.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {suggestion.subtitle}
                          </p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex w-full max-w-[500px] justify-center sm:justify-start">
              <button
                type="submit"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#2B63D9] px-8 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(43,99,217,0.25)] transition-colors hover:bg-[#1f56c6]"
              >
                Browse products
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          <p className="mt-4 text-sm text-slate-500">
            Products appear here automatically, then flow into the highlights and product grid
            below.
          </p>
        </div>
      </div>
    </section>
  );
}
