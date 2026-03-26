import { ScrollReveal } from './animations/ScrollReveal';
import { resolveProductSectionIcon } from '../lib/productSectionIcons';
import type { Product } from '../types';

interface HowItWorksProps {
  product: Product;
}

export function HowItWorks({ product }: HowItWorksProps) {
  const section = product.sections.howItWorks;

  if (section.steps.length === 0) {
    return null;
  }

  return (
    <ScrollReveal>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              {section.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {section.subtitle}
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {section.steps.map((detail, index) => {
                const Icon = resolveProductSectionIcon(detail.icon);
                return (
                  <div key={index}>
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] rounded-xl flex items-center justify-center shadow-lg">
                          {Icon ? (
                            <Icon className="w-8 h-8 text-white" />
                          ) : (
                            <span className="text-3xl text-white">{detail.icon}</span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900">
                        {detail.title}
                      </h3>

                      <p className="text-gray-600">
                        {detail.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
