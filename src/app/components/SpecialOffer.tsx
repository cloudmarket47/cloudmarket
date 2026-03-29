import { Clock, DollarSign, Gift, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { getPackagePriceBreakdown } from '../lib/packagePricing';
import type { Product } from '../types';
import { ScrollReveal } from './animations/ScrollReveal';

interface SpecialOfferProps {
  onBuyNow: (source?: string) => void;
  onSelectPackage: (quantity: string) => void;
  product: Product;
  selectedPackageQuantity: string;
}

export function SpecialOffer({
  onBuyNow,
  onSelectPackage,
  product,
  selectedPackageQuantity,
}: SpecialOfferProps) {
  const { countryName, formatPrice } = useLocale();
  const offer = product.sections.offer;
  const [timeLeft, setTimeLeft] = useState({
    hours: offer.countdownHours - 1,
    minutes: 59,
    seconds: 59,
  });

  useEffect(() => {
    setTimeLeft({
      hours: offer.countdownHours - 1,
      minutes: 59,
      seconds: 59,
    });
  }, [offer.countdownHours]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <ScrollReveal>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0E7C7B] via-[#2B7FFF] to-[#0E7C7B] py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-white blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="mb-6 text-4xl font-bold text-white md:text-6xl">{offer.title}</h2>

            <p className="mb-8 text-xl text-white/90 md:text-2xl">{offer.subtitle}</p>

            <div className="mb-12 flex justify-center gap-4">
              <div className="card-3d min-w-[80px] rounded-xl border border-white/70 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                <p className="text-4xl font-bold text-[#0E7C7B]">{String(timeLeft.hours).padStart(2, '0')}</p>
                <p className="text-sm font-medium text-slate-500">Hours</p>
              </div>
              <div className="card-3d min-w-[80px] rounded-xl border border-white/70 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                <p className="text-4xl font-bold text-[#0E7C7B]">{String(timeLeft.minutes).padStart(2, '0')}</p>
                <p className="text-sm font-medium text-slate-500">Minutes</p>
              </div>
              <div className="card-3d min-w-[80px] rounded-xl border border-white/70 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                <p className="text-4xl font-bold text-[#0E7C7B]">{String(timeLeft.seconds).padStart(2, '0')}</p>
                <p className="text-sm font-medium text-slate-500">Seconds</p>
              </div>
            </div>

            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {offer.packages.map((pkg, index) => {
                const isBestValue = pkg.isBestValue;
                const iconTone =
                  index === 0 ? 'bg-[#FF7A00]' : index === 1 ? 'bg-[#2B7FFF]' : 'bg-[#0E7C7B]';
                const packageQuantity = pkg.title.match(/buy\s+(\d+)/i)?.[1] ?? String(index + 1);
                const isSelected = packageQuantity === selectedPackageQuantity;
                const priceBreakdown = getPackagePriceBreakdown({
                  packageTitle: pkg.title,
                  promoPrice: pkg.price,
                  oldPrice: pkg.oldPrice,
                });

                return (
                  <button
                    key={pkg.title}
                    type="button"
                    onClick={() => onSelectPackage(packageQuantity)}
                    className={`card-3d relative rounded-2xl bg-white p-8 text-center shadow-2xl transition-transform hover:-translate-y-1 ${
                      isBestValue || isSelected ? 'border-4 border-[#FF7A00]' : ''
                    }`}
                  >
                    {isBestValue && (
                      <div className="badge-3d absolute -top-4 left-1/2 -translate-x-1/2">
                        BEST VALUE
                      </div>
                    )}

                    <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${iconTone}`}>
                      <Gift className="h-8 w-8 text-white" />
                    </div>

                    <h3 className="mb-2 text-2xl font-bold text-gray-900">{pkg.title}</h3>
                    <p className="text-sm font-semibold text-gray-500 line-through">
                      Old Price: {formatPrice(priceBreakdown.oldPrice, product.currencyCode)}
                    </p>
                    <p className="mb-1 text-4xl font-bold text-[#0E7C7B]">
                      Promo: {formatPrice(priceBreakdown.promoPrice, product.currencyCode)}
                    </p>
                    <p className="mb-2 text-sm font-semibold text-emerald-600">
                      You save {formatPrice(priceBreakdown.savings, product.currencyCode)}
                    </p>
                    <p className="text-gray-600">{pkg.description}</p>

                    <span className="mt-5 inline-flex rounded-full bg-[#FFF2E6] px-4 py-2 text-sm font-semibold text-[#FF7A00]">
                      Select package
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center justify-center gap-3 text-white md:justify-start">
                <Truck className="h-6 w-6 flex-shrink-0" />
                <span className="font-semibold">Fast delivery across {countryName}</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-white md:justify-start">
                <DollarSign className="h-6 w-6 flex-shrink-0" />
                <span className="font-semibold">Pay on Delivery</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-white md:justify-start">
                <Clock className="h-6 w-6 flex-shrink-0" />
                <span className="font-semibold">Fast Delivery</span>
              </div>
            </div>

            <button
              onClick={() => onBuyNow('offer_quick_checkout')}
              className="btn-3d btn-3d-orange w-full px-12 py-6 text-xl md:w-auto md:text-2xl"
            >
              Open Quick Checkout
            </button>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
