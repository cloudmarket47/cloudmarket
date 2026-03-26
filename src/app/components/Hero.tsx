import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../lib/analyticsTelemetry';
import { useLocale } from '../context/LocaleContext';
import { getProductCategoryHeroLabel } from '../lib/productCategories';
import type { Product } from '../types';
import { cn } from '../lib/utils';
import { Button } from './design-system/Button';
import { ImageWithFallback } from './figma/ImageWithFallback';

const HERO_SLIDE_DURATION_MS = 8000;

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

interface HeroProps {
  product: Product;
  onBuyNow: (source?: string) => void;
}

export function Hero({ product, onBuyNow }: HeroProps) {
  const navigate = useNavigate();
  const { formatPrice } = useLocale();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);
  const sharePanelRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);

  const heroImages = [
    product.sections.hero.image,
    product.image,
    ...product.sections.showcase.images,
  ].filter((image, index, collection): image is string => {
    return Boolean(image) && collection.indexOf(image) === index;
  });

  const slides = heroImages.length > 0 ? heroImages : [product.image];
  const heroCategoryLabel = useMemo(
    () =>
      getProductCategoryHeroLabel({
        category: product.category,
        categoryId: product.categoryId,
        categorySlug: product.categorySlug,
        subcategory: product.subcategory,
        subcategorySlug: product.subcategorySlug,
      }),
    [product.category, product.categoryId, product.categorySlug, product.subcategory, product.subcategorySlug],
  );
  const canonicalProductUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/product/${product.slug}`;
    }

    return new URL(`/product/${product.slug}`, window.location.origin).toString();
  }, [product.slug]);
  const shouldUseDirectShare = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(pointer: coarse)').matches;
  }, []);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % slides.length);
    }, HERO_SLIDE_DURATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slides.length]);

  useEffect(() => {
    if (!isSharePanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (
        sharePanelRef.current?.contains(target) ||
        shareButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsSharePanelOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isSharePanelOpen]);

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
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 12) {
        setAreControlsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (scrollDelta > 8) {
        setAreControlsVisible(false);
        setIsSharePanelOpen(false);
      } else if (scrollDelta < -8) {
        setAreControlsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleBack = () => {
    trackAnalyticsButtonClick({
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: 'product_back_button',
      buttonLabel: 'Back',
    });

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleCopyLink = async () => {
    try {
      await copyTextToClipboard(canonicalProductUrl);
      trackAnalyticsEvent({
        type: 'share_action',
        pagePath: `/product/${product.slug}`,
        pageType: 'product',
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        buttonId: 'product_copy_url',
        buttonLabel: 'Copy URL',
        metadata: {
          method: 'copy',
        },
      });
      setShareFeedback('Product link copied');
    } catch {
      setShareFeedback('Unable to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on CloudMarket.`,
          url: canonicalProductUrl,
        });
        trackAnalyticsEvent({
          type: 'share_action',
          pagePath: `/product/${product.slug}`,
          pageType: 'product',
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          buttonId: 'product_native_share',
          buttonLabel: 'Share URL',
          metadata: {
            method: 'native',
          },
        });
        setIsSharePanelOpen(false);
        setShareFeedback(null);
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return true;
        }
      }
    }

    return false;
  };

  const handleShareLink = async () => {
    if (typeof navigator.share === 'function') {
      const didHandleNatively = await handleNativeShare();

      if (didHandleNatively) {
        return;
      }
    }

    await handleCopyLink();
  };

  const handleShareButtonClick = async () => {
    setShareFeedback(null);
    trackAnalyticsButtonClick({
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: 'product_share_button',
      buttonLabel: 'Share',
    });

    if (shouldUseDirectShare && typeof navigator.share === 'function') {
      await handleNativeShare();
      return;
    }

    setIsSharePanelOpen((currentState) => !currentState);
  };

  return (
    <section className="relative isolate h-[80vh] overflow-hidden bg-[#f6f4ef] px-3 py-3 md:h-[700px] md:px-6 md:py-6">
      <div
        className={cn(
          'hero-controls-wrap pointer-events-none fixed inset-x-0 top-0 z-[60] px-4 pt-4 md:px-6 md:pt-6',
          !areControlsVisible && 'hero-controls-wrap-hidden'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="hero-icon-button hero-fixed-action pointer-events-auto"
            aria-label="Go back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="pointer-events-auto relative">
            <button
              ref={shareButtonRef}
              type="button"
              onClick={handleShareButtonClick}
              className="hero-icon-button hero-fixed-action"
              aria-label="Share product page"
              aria-expanded={isSharePanelOpen}
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {isSharePanelOpen ? (
              <div
                ref={sharePanelRef}
                className="hero-share-panel pointer-events-auto absolute right-0 top-[calc(100%+0.85rem)] w-[min(20rem,calc(100vw-2rem))] rounded-[1.6rem] border border-white/80 bg-white/95 p-4 text-left text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Share this product
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use this direct product URL for sharing, copying or paid ad traffic.
                </p>

                <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                  {canonicalProductUrl}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    Copy URL
                  </button>

                  <button
                    type="button"
                    onClick={handleShareLink}
                    className="btn-3d btn-3d-orange rounded-full px-4 py-3 text-sm font-semibold text-white"
                  >
                    Share URL
                  </button>
                </div>

                {shareFeedback ? (
                  <p className="mt-3 text-xs font-semibold text-[#FF7A00]">{shareFeedback}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto h-full max-w-7xl">
        <div className="hero-frame relative h-full overflow-hidden rounded-[2.5rem] md:rounded-[3rem]">
          <div className="hero-carousel-media absolute inset-0">
            {slides.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className={cn('hero-carousel-slide absolute inset-0', index === activeSlide && 'is-active')}
              >
                <ImageWithFallback
                  src={image}
                  alt={`${product.name} view ${index + 1}`}
                  className="hero-carousel-image h-full w-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                />
              </div>
            ))}
          </div>

          <div className="hero-vignette pointer-events-none absolute inset-0 z-10" />

          <div className="relative z-20 flex h-full items-end">
            <div className="mx-auto flex h-full w-full max-w-6xl items-end p-5 md:p-10">
              <div className="hero-copy-shell relative max-w-[36rem] space-y-4 pt-2 md:space-y-6 md:pt-4">
                <div className="hero-copy-pocket absolute inset-x-[-1rem] top-[-8rem] bottom-[-1.75rem] -z-10 rounded-[2.2rem] md:inset-x-[-1.5rem] md:top-[-10rem] md:bottom-[-2rem] md:rounded-[2.6rem]" />

                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/58 md:text-sm">
                  {product.sections.hero.badge}
                </p>

                <div className="space-y-2 md:space-y-3">
                  <h1 className="max-w-[10ch] font-sans text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl md:max-w-[11ch] md:text-6xl">
                    {product.name}
                  </h1>
                  <p className="text-sm font-medium text-white/52 sm:text-base">
                    {heroCategoryLabel}
                  </p>
                  <p className="max-w-xl text-base leading-relaxed text-white/82 sm:text-lg">
                    {product.sections.hero.subtitle}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="inline-flex flex-col rounded-full border border-[#7fb2ff]/40 bg-gradient-to-br from-[#2B7FFF] to-[#1450b8] px-5 py-3 text-white shadow-[0_18px_40px_rgba(20,80,184,0.34)]">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                      Price
                    </span>
                    <span className="text-lg font-bold leading-none md:text-xl">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  <Button
                    onClick={() => onBuyNow('hero_buy_now')}
                    size="lg"
                    className="w-full rounded-full border border-white/70 bg-white px-7 py-4 text-base font-semibold text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.18)] hover:bg-white/92 focus:ring-white sm:w-auto"
                  >
                    Buy Now
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
