import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    if (!selectedImage) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedImage]);

  if (topRowImages.length === 0 || bottomRowImages.length === 0) {
    return null;
  }

  const renderTrackImages = (images: string[]) => {
    return [...images, ...images].map((image, index) => {
      return (
        <button
          type="button"
          key={`${image}-${index}`}
          onClick={() => setSelectedImage(image)}
          className="w-[180px] shrink-0 rounded-[1.8rem] border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.14)] focus:outline-none focus:ring-2 focus:ring-[#2B63D9]/40 sm:w-[205px] lg:w-[220px]"
          aria-label={`Open ${product.name} image ${index + 1} in full screen`}
        >
          <div className="aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-slate-100">
            <ImageWithFallback
              src={image}
              alt={`${product.name} feature view ${index + 1}`}
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

      {selectedImage ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/96 px-4 py-5 backdrop-blur-md sm:px-6 sm:py-6">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/16"
                aria-label="Close full screen image"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center py-4 sm:py-6">
              <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
                <ImageWithFallback
                  src={selectedImage}
                  alt={`${product.name} full screen preview`}
                  className="max-h-[72vh] w-full object-contain"
                />
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-1 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  setSelectedImage(null);
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
                onClick={() => setSelectedImage(null)}
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
