import { BadgeCheck, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const offerHighlights = [
  { title: 'Buy 1 Set, Get 1 Free', price: 'Only GHS 150' },
  { title: 'Buy 2 Sets, Get 2 Free', price: 'Only GHS 300' },
  { title: 'Buy 3 Sets, Get 3 Free', price: 'Only GHS 450' },
];

export function HeroSection() {
  const scrollToOrder = () => {
    document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-white px-4 py-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-block rounded-full bg-gradient-to-r from-orange-100 to-orange-50 px-4 py-2">
              <span className="text-sm font-semibold text-[#FF7A00] md:text-base">
                Limited Time Offer - Grab Am Quick!
              </span>
            </div>

            <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
              Make Every Corner Shine - No Stress, No Wahala!
            </h1>

            <p className="text-lg leading-relaxed text-gray-600 md:text-xl">
              The Crevice Cleaning Brush go reach all those tight corners wey your normal brush no fit touch.
            </p>

            <div className="space-y-3">
              {[
                'Reaches narrow gaps',
                'Strong, durable bristles',
                'Perfect for kitchen, bathroom & tiles',
                'Comfortable grip',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-[#0E7C7B]" />
                  <span className="text-base text-gray-700 md:text-lg">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-2xl bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] p-6 text-white">
              {offerHighlights.map((offer) => (
                <div key={offer.title} className="flex items-center gap-2">
                  <BadgeCheck className="h-8 w-8" />
                  <div>
                    <p className="text-xl font-bold md:text-2xl">{offer.title}</p>
                    <p className="text-lg">{offer.price}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={scrollToOrder}
              className="w-full rounded-xl bg-[#FF7A00] px-8 py-5 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e66d00] hover:shadow-xl md:w-auto md:text-xl"
            >
              Order Now - Pay on Delivery + Free Delivery Anywhere in Ghana
            </button>

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Truck className="h-6 w-6 text-[#0E7C7B]" />
                <span className="text-sm font-medium text-gray-700">Nationwide Delivery</span>
              </div>
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <BadgeCheck className="h-6 w-6 text-[#0E7C7B]" />
                <span className="text-sm font-medium text-gray-700">Pay on Delivery</span>
              </div>
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <ShieldCheck className="h-6 w-6 text-[#0E7C7B]" />
                <span className="text-sm font-medium text-gray-700">7-Day Guarantee</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-gradient-to-br from-[#0E7C7B]/10 to-[#2B7FFF]/10 p-8">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1654166604842-d414ea1884cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwY3JldmljZSUyMG5hcnJvdyUyMGNvcm5lcnxlbnwxfHx8fDE3NzA5OTc4NDB8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Crevice Cleaning Brush"
                className="h-auto w-full rounded-2xl shadow-2xl"
              />
            </div>

            <div className="absolute -right-4 -top-4 rotate-12 rounded-full bg-[#FF7A00] px-6 py-3 text-white shadow-lg">
              <p className="text-lg font-bold">Free Delivery!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
