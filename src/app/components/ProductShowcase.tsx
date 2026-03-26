import { ScrollReveal } from './animations/ScrollReveal';
import { Carousel3D } from './animations/Carousel3D';
import type { Product } from '../types';

interface ProductShowcaseProps {
  product: Product;
}

export function ProductShowcase({ product }: ProductShowcaseProps) {
  const section = product.sections.showcase;
  const images = section.images.filter(Boolean);

  if (images.length === 0) {
    return null;
  }

  return (
    <ScrollReveal>
      <section className="bg-gradient-to-b from-white to-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              {section.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {section.subtitle}
            </p>
          </div>

          <Carousel3D images={images} />

          <div className="text-center mt-8">
            <p className="text-gray-600">Tap the side cards or use the arrows below to inspect every angle.</p>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
