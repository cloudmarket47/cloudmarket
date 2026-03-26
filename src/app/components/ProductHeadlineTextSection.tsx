import type { Product } from '../types';
import { ScrollReveal } from './animations/ScrollReveal';

interface ProductHeadlineTextSectionProps {
  product: Product;
}

export function ProductHeadlineTextSection({ product }: ProductHeadlineTextSectionProps) {
  const headline = product.sections.headline.title || product.name;
  const supportingText = product.sections.headline.description || product.shortDescription;
  const eyebrow = product.sections.headline.eyebrow || 'Product Headline';

  return (
    <ScrollReveal>
      <section className="bg-white py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-6 py-8 text-center shadow-[0_12px_34px_rgba(15,23,42,0.06)] md:px-10 md:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#2B63D9]">
              {eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
              {headline}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              {supportingText}
            </p>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
