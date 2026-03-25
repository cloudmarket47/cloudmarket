import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { ScrollReveal } from './animations/ScrollReveal';

export function FAQ() {
  const faqs = [
    {
      question: 'Is pay on delivery available?',
      answer: 'Yes. You can pay when your order is delivered, so there is no need for advance payment.',
    },
    {
      question: 'How long does delivery take?',
      answer: 'Orders to major Nigerian cities usually arrive within 1 to 3 working days, while other locations may take 3 to 5 working days.',
    },
    {
      question: 'Can it clean bathroom tiles?',
      answer: 'Yes. It is ideal for bathroom tiles, grout lines and corners where mold and residue often collect.',
    },
    {
      question: 'Is the brush durable?',
      answer: 'Yes. The bristles are designed for repeated use and keep their shape well when used properly.',
    },
    {
      question: 'Can I return it if it does not work for me?',
      answer: 'Yes. We offer a 7-day satisfaction guarantee. Contact us and we will help with a return or replacement.',
    },
    {
      question: 'How do I place an order?',
      answer: 'Tap any Buy Now button for quick checkout, or choose a package in the offer section to jump to the main order form near the footer. Complete the form and we will call you to confirm the order.',
    },
    {
      question: 'Is the promotion genuine?',
      answer: 'Yes. The current offer includes Buy 1 Get 1 Free, Buy 2 Get 2 Free, and Buy 3 Get 3 Free package options while stock lasts.',
    },
    {
      question: 'Can it remove kitchen grease?',
      answer: 'Yes. It works well on greasy kitchen edges, stovetop corners and other hard-to-reach spots.',
    },
  ];

  return (
    <ScrollReveal>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
                Frequently Asked <span className="text-[#0E7C7B]">Questions</span>
              </h2>
              <p className="text-xl text-gray-600">Everything you need to know before placing your order.</p>
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
