import { ImageWithFallback } from './figma/ImageWithFallback';
import { ScrollReveal } from './animations/ScrollReveal';
import type { Product } from '../types';

interface SolutionProps {
  product: Product;
  onBuyNow: (source?: string) => void;
}

export function Solution({ product, onBuyNow }: SolutionProps) {
  const section = product.sections.solution;
  const ctaLabel = section.ctaText.trim() || product.sections.hero.ctaText || 'Buy Now';

  if (!section.title.trim() && !section.description.trim()) {
    return null;
  }

  return (
    <ScrollReveal>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="image-3d rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src={section.image || product.image}
                  alt={section.title || product.name}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-block">
                <span className="badge-3d">
                  {section.badge}
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
                {section.title}
              </h2>

              <p className="text-xl text-gray-700 leading-relaxed">
                {section.description}
              </p>

              <div className="space-y-4">
                {section.features.map((feature, index) => (
                  <div key={`${feature}-${index}`} className="card-3d p-6">
                    <p className="text-lg text-gray-800">
                      <span className="font-bold text-[#0E7C7B]">{feature}</span>
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onBuyNow('solution_buy_now')}
                className="btn-3d btn-3d-orange w-full md:w-auto"
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
