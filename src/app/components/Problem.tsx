import { ScrollReveal } from './animations/ScrollReveal';
import { StaggeredReveal } from './animations/StaggeredReveal';
import { resolveProductSectionIcon } from '../lib/productSectionIcons';
import type { Product } from '../types';

interface ProblemProps {
  product: Product;
}

export function Problem({ product }: ProblemProps) {
  const section = product.sections.problem;

  if (section.problems.length === 0) {
    return null;
  }

  return (
    <ScrollReveal>
      <section className="bg-gray-100 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              {section.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {section.subtitle}
            </p>
          </div>

          <StaggeredReveal className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8" staggerDelay={100}>
            {section.problems.map((problem, index) => {
              const Icon = resolveProductSectionIcon(problem.icon);
              return (
                <div
                  key={index}
                  className="card-3d p-8 stagger-item"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                    {Icon ? (
                      <Icon className="w-8 h-8 text-red-600" />
                    ) : (
                      <span className="text-3xl">{problem.icon}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {problem.title}
                  </h3>
                  <p className="text-gray-600">
                    {problem.description}
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
