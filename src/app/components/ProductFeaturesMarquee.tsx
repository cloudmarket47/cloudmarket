import { useMemo } from 'react';
import type { Product } from '../types';
import { ScrollReveal } from './animations/ScrollReveal';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductFeaturesMarqueeProps {
  product: Product;
}

export function ProductFeaturesMarquee({ product }: ProductFeaturesMarqueeProps) {
  const imagePool = useMemo(() => {
    const allImages = [
      product.sections.hero.image,
      product.image,
      ...product.sections.showcase.images,
      product.sections.solution.image,
    ].filter(Boolean);

    return allImages.filter((image, index) => allImages.indexOf(image) === index);
  }, [product]);

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

  if (topRowImages.length === 0 || bottomRowImages.length === 0) {
    return null;
  }

  const renderTrackImages = (images: string[]) => {
    return [...images, ...images].map((image, index) => {
      return (
        <div
          key={`${image}-${index}`}
          className="w-[180px] shrink-0 rounded-[1.8rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:w-[205px] lg:w-[220px]"
        >
          <div className="aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-slate-100">
            <ImageWithFallback
              src={image}
              alt={`${product.name} feature view ${index + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      );
    });
  };

  return (
    <ScrollReveal>
      <section className="bg-gradient-to-b from-white via-slate-50 to-white py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-[#d7e6ff] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#2B7FFF] shadow-sm">
              Product Features
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              See exactly what makes this brush worth it
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
              Two continuous marquee rows highlight the real features, built-in benefits and daily
              use advantages that shoppers care about most.
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
  );
}
