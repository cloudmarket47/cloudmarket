import { Star } from 'lucide-react';
import type { Product } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ScrollReveal } from './animations/ScrollReveal';
import { StaggeredReveal } from './animations/StaggeredReveal';

interface SocialProofProps {
  product: Product;
}

export function SocialProof({ product }: SocialProofProps) {
  const reviews = product.sections.testimonials.reviews;

  return (
    <ScrollReveal>
      <section className="bg-[#f8f5ef] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              {product.sections.testimonials.title}
            </h2>
            <p className="text-xl text-gray-600">
              {product.sections.testimonials.subtitle}
            </p>
          </div>

          <StaggeredReveal className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8" staggerDelay={120}>
            {reviews.map((review, index) => (
              <article
                key={`${review.name}-${index}`}
                className="stagger-item relative min-h-[420px] overflow-hidden rounded-[2.25rem] shadow-[0_22px_50px_rgba(15,23,42,0.16)]"
              >
                <ImageWithFallback
                  src={review.image}
                  alt={review.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 z-10 h-[40%] bg-gradient-to-t from-black via-[#17110e]/92 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 z-20 flex h-[40%] flex-col justify-end p-6 md:p-7">
                  <div className="flex gap-1 mb-4">
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
                        alt={`${review.name} avatar`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="font-semibold text-white">{review.name}</p>
                      <p className="text-sm text-white/66">{review.location}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </StaggeredReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#0E7C7B] mb-2">5,000+</p>
              <p className="text-gray-600">Happy Customers</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#0E7C7B] mb-2">4.9/5</p>
              <p className="text-gray-600">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#0E7C7B] mb-2">98%</p>
              <p className="text-gray-600">Would Recommend</p>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
