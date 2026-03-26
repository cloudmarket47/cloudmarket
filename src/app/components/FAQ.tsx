import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { ScrollReveal } from './animations/ScrollReveal';
import type { Product } from '../types';

interface FAQProps {
  product: Product;
}

export function FAQ({ product }: FAQProps) {
  const section = product.sections.faq;
  const faqs = section.items.filter((item) => item.question.trim() || item.answer.trim());

  if (faqs.length === 0) {
    return null;
  }

  return (
    <ScrollReveal>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
                {section.title}
              </h2>
              <p className="text-xl text-gray-600">{section.subtitle}</p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="rounded-xl border-none bg-gray-50 px-6"
                >
                  <AccordionTrigger className="py-6 text-left text-lg font-semibold text-gray-900 hover:text-[#0E7C7B]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 leading-relaxed text-gray-700">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
