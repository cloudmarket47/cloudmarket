import { ScrollReveal } from './animations/ScrollReveal';
import { StaggeredReveal } from './animations/StaggeredReveal';
import { resolveProductSectionIcon } from '../lib/productSectionIcons';
import type { Product } from '../types';

interface FeaturesProps {
  product: Product;
}

export function Features({ product }: FeaturesProps) {
  const section = product.sections.features;

  if (section.items.length === 0) {
    return null;
  }

  return (
    <ScrollReveal>
      <section id="product-feature-details" className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              {section.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {section.subtitle}
            </p>
          </div>

          <StaggeredReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" staggerDelay={100}>
            {section.items.map((feature, index) => {
              const Icon = resolveProductSectionIcon(feature.icon);
              return (
                <div
                  key={index}
                  className="card-3d p-8 stagger-item"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] rounded-xl flex items-center justify-center mb-4">
                    {Icon ? (
                      <Icon className="w-8 h-8 text-white" />
                    ) : (
                      <span className="text-3xl text-white">{feature.icon}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </StaggeredReveal>
        </div>
      </section>
    </ScrollReveal>
  );
}
