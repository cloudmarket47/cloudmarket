import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './design-system/Button';
import type { Product } from '../types';
import { ScrollReveal } from './animations/ScrollReveal';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductFeaturesMarqueeProps {
  product: Product;
  onBuyNow: (source?: string) => void;
}

export function ProductFeaturesMarquee({ product, onBuyNow }: ProductFeaturesMarqueeProps) {
  const marqueeSection = product.sections.featureMarquee;
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const imagePool = useMemo(() => {
    const configuredImages = marqueeSection.images.filter(Boolean);
    const allImages =
      configuredImages.length > 0
        ? configuredImages
        : [
            product.sections.hero.image,
            product.image,
            ...product.sections.showcase.images,
            product.sections.solution.image,
          ].filter(Boolean);

    return allImages.filter((image, index) => allImages.indexOf(image) === index);
  }, [marqueeSection.images, product]);

  const topRowImages = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => {
      return imagePool[index % imagePool.length] ?? product.image;
    });
  }, [imagePool, product]);

  const bottomRowImages = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => {
      return imagePool[(index + 2) % imagePool.length] ?? product.image;
    });
  }, [imagePool, product]);

  useEffect(() => {
    if (selectedImageIndex === null) {
      return;
    }

    setSelectedImageIndex((current) => {
      if (current === null) {
        return null;
      }

      return Math.min(current, Math.max(imagePool.length - 1, 0));
    });
  }, [imagePool.length, selectedImageIndex]);

  const stepImage = (direction: -1 | 1) => {
    setSelectedImageIndex((current) => {
      if (current === null || imagePool.length === 0) {
        return current;
      }

      return (current + direction + imagePool.length) % imagePool.length;
    });
  };

  useEffect(() => {
    if (selectedImageIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImageIndex(null);
        return;
      }

      if (event.key === 'ArrowLeft') {
        stepImage(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        stepImage(1);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedImageIndex, imagePool.length]);

  if (topRowImages.length === 0 || bottomRowImages.length === 0) {
    return null;
  }

  const renderTrackImages = (images: string[]) => {
    return [...images, ...images].map((image, index) => {
      const imageIndex = imagePool.indexOf(image);

      return (
        <button
          type="button"
          key={`${image}-${index}`}
          onClick={() => setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0)}
          className="w-[180px] shrink-0 rounded-[1.8rem] border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.14)] focus:outline-none focus:ring-2 focus:ring-[#2B63D9]/40 sm:w-[205px] lg:w-[220px]"
          aria-label={`Open ${product.name} image ${(imageIndex >= 0 ? imageIndex : index) + 1} in full screen`}
        >
          <div className="aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-slate-100">
            <ImageWithFallback
              src={image}
              alt={`${product.name} feature view ${(imageIndex >= 0 ? imageIndex : index) + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        </button>
      );
    });
  };

  return (
    <>
      <ScrollReveal>
        <section className="bg-gradient-to-b from-white via-slate-50 to-white py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full border border-[#d7e6ff] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#2B7FFF] shadow-sm">
                Feature Marquee
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {marqueeSection.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
                {marqueeSection.subtitle}
              </p>
            </div>

            <div className="feature-marquee-shell mt-10 flex flex-col gap-4 md:gap-6">
              <div className="feature-marquee-row">
                <div className="feature-marquee-track feature-marquee-track-left">
                  {renderTrackImages(topRowImages)}
                </div>
              </div>

              <div className="feature-marquee-row">
                <div className="feature-marquee-track feature-marquee-track-right">
                  {renderTrackImages(bottomRowImages)}
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {selectedImageIndex !== null ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/96 px-4 py-5 backdrop-blur-md sm:px-6 sm:py-6">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedImageIndex(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/16"
                aria-label="Close full screen image"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center py-4 sm:py-6">
              <div
                className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
                onTouchStart={(event) => {
                  touchStartXRef.current = event.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                  const touchStartX = touchStartXRef.current;
                  const touchEndX = event.changedTouches[0]?.clientX ?? null;

                  if (touchStartX === null || touchEndX === null) {
                    touchStartXRef.current = null;
                    return;
                  }

                  const deltaX = touchEndX - touchStartX;

                  if (Math.abs(deltaX) >= 40) {
                    stepImage(deltaX > 0 ? -1 : 1);
                  }

                  touchStartXRef.current = null;
                }}
              >
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${selectedImageIndex * 100}%)` }}
                >
                  {imagePool.map((image, index) => (
                    <div key={`${image}-fullscreen-${index}`} className="w-full shrink-0">
                      <ImageWithFallback
                        src={image}
                        alt={`${product.name} full screen preview ${index + 1}`}
                        className="max-h-[72vh] w-full object-contain"
                      />
                    </div>
                  ))}
                </div>

                {imagePool.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => stepImage(-1)}
                      className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white transition hover:bg-black/55"
                      aria-label="View previous marquee image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepImage(1)}
                      className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white transition hover:bg-black/55"
                      aria-label="View next marquee image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/88">
                      {selectedImageIndex + 1} / {imagePool.length}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {imagePool.length > 1 ? (
              <div className="mx-auto mb-4 flex w-full max-w-5xl gap-3 overflow-x-auto pb-1">
                {imagePool.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-thumb-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-20 w-16 shrink-0 overflow-hidden rounded-[1.1rem] border transition ${
                      index === selectedImageIndex
                        ? 'border-[#2B63D9] ring-2 ring-[#2B63D9]/35'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`View marquee image ${index + 1}`}
                  >
                    <ImageWithFallback
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-1 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  setSelectedImageIndex(null);
                  onBuyNow('feature_marquee_fullscreen_buy_now');
                }}
                className="rounded-2xl bg-[#2B63D9] hover:bg-[#1f4fb3] focus:ring-[#2B63D9]"
              >
                Buy Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setSelectedImageIndex(null)}
                className="rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/16"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
