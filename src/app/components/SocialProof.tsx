import { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { getDeterministicCustomerNameForIndex } from '../lib/customerIdentityPools';
import type { Product } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ScrollReveal } from './animations/ScrollReveal';
import { StaggeredReveal } from './animations/StaggeredReveal';

interface SocialProofProps {
  product: Product;
}

function AnimatedStat({
  label,
  target,
  decimals = 0,
  prefix = '',
  suffix = '',
  isActive,
}: {
  label: string;
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  isActive: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let animationFrameId = 0;
    const startedAt = performance.now();
    const durationMs = 1200;

    const updateValue = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(target * easedProgress);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(updateValue);
      }
    };

    animationFrameId = window.requestAnimationFrame(updateValue);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, target]);

  const formattedValue =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString('en-NG');

  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-[#0E7C7B] md:text-5xl">
        {prefix}
        {formattedValue}
        {suffix}
      </p>
      <p className="mt-2 text-gray-600">{label}</p>
    </div>
  );
}

export function SocialProof({ product }: SocialProofProps) {
  const { countryCode } = useLocale();
  const reviews = product.sections.testimonials.reviews;
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [shouldAnimateStats, setShouldAnimateStats] = useState(false);
  const resolvedReviews = useMemo(() => {
    return reviews.map((review, index) => ({
      ...review,
      displayName: getDeterministicCustomerNameForIndex({
        customerIdentityPools: product.customerIdentityPools,
        countryCode,
        genderTarget: product.genderTarget,
        index,
        seed: `${product.id}-${product.slug}-${review.text}`,
        fallbackName: review.name || 'Verified Customer',
      }),
    }));
  }, [countryCode, product.customerIdentityPools, product.genderTarget, product.id, product.slug, reviews]);

  useEffect(() => {
    const targetNode = statsRef.current;

    if (!targetNode || shouldAnimateStats) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldAnimateStats(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(targetNode);

    return () => {
      observer.disconnect();
    };
  }, [shouldAnimateStats]);

  return (
    <ScrollReveal>
      <section className="bg-[#f8f5ef] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
              {product.sections.testimonials.title}
            </h2>
            <p className="text-xl text-gray-600">
              {product.sections.testimonials.subtitle}
            </p>
          </div>

          <StaggeredReveal className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8" staggerDelay={120}>
            {resolvedReviews.map((review, index) => (
              <article
                key={`${review.displayName}-${index}`}
                className="stagger-item relative min-h-[420px] overflow-hidden rounded-[2.25rem] shadow-[0_22px_50px_rgba(15,23,42,0.16)]"
              >
                <ImageWithFallback
                  src={review.image}
                  alt={review.displayName}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 h-[40%] bg-gradient-to-t from-black via-[#17110e]/92 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 z-20 flex h-[40%] flex-col justify-end p-6 md:p-7">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: review.rating }).map((_, starIndex) => (
                      <Star
                        key={`${review.name}-star-${starIndex}`}
                        className="h-5 w-5 fill-[#FF7A00] text-[#FF7A00]"
                      />
                    ))}
                  </div>

                  <p className="mb-5 text-sm leading-7 text-white/88 md:text-base">
                    "{review.text}"
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-white/35 shadow-md">
                      <ImageWithFallback
                        src={review.avatar ?? review.image}
                        alt={`${review.displayName} avatar`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="font-semibold text-white">{review.displayName}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </StaggeredReveal>

          <div ref={statsRef} className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            <AnimatedStat label="Happy Customers" target={5000} suffix="+" isActive={shouldAnimateStats} />
            <AnimatedStat label="Average Rating" target={4.9} decimals={1} suffix="/5" isActive={shouldAnimateStats} />
            <AnimatedStat label="Would Recommend" target={98} suffix="%" isActive={shouldAnimateStats} />
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
