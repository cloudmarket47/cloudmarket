import { useEffect, useState } from 'react';
import { Clock, Gift, Zap } from 'lucide-react';

const offers = [
  {
    title: 'Buy 1 Get 1 FREE',
    originalPrice: 'GHS 300',
    price: 'GHS 150',
    total: "That's 2 Brushes Total!",
    savings: 'You Save GHS 150!',
    isBestValue: false,
  },
  {
    title: 'Buy 2 Get 2 FREE',
    originalPrice: 'GHS 600',
    price: 'GHS 300',
    total: "That's 4 Brushes Total!",
    savings: 'You Save GHS 300!',
    isBestValue: false,
  },
  {
    title: 'Buy 3 Get 3 FREE',
    originalPrice: 'GHS 900',
    price: 'GHS 450',
    total: "That's 6 Brushes Total!",
    savings: 'You Save GHS 450!',
    isBestValue: true,
  },
];

export function OffersSection() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  const scrollToOrder = () => {
    document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] px-4 py-12 md:py-20">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FF7A00] px-6 py-3">
            <Zap className="h-6 w-6 text-white" />
            <span className="text-lg font-bold text-white">LIMITED TIME OFFER!</span>
          </div>

          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Grab Your Crevice Brush Before Offer Finish!
          </h2>
          <p className="text-xl text-white/90">This special price no go last! Order now before stock finish!</p>
        </div>

        <div className="mb-8 rounded-2xl bg-white/10 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Clock className="h-6 w-6 text-white" />
            <p className="text-lg font-bold text-white">Offer Ends In:</p>
          </div>
          <div className="flex justify-center gap-4">
            <div className="min-w-[80px] rounded-xl bg-white p-4 text-center">
              <div className="text-3xl font-bold text-[#0E7C7B] md:text-4xl">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="text-sm font-medium text-gray-600">Hours</div>
            </div>
            <div className="flex items-center text-3xl font-bold text-white">:</div>
            <div className="min-w-[80px] rounded-xl bg-white p-4 text-center">
              <div className="text-3xl font-bold text-[#0E7C7B] md:text-4xl">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="text-sm font-medium text-gray-600">Minutes</div>
            </div>
            <div className="flex items-center text-3xl font-bold text-white">:</div>
            <div className="min-w-[80px] rounded-xl bg-white p-4 text-center">
              <div className="text-3xl font-bold text-[#0E7C7B] md:text-4xl">{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div className="text-sm font-medium text-gray-600">Seconds</div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <div
              key={offer.title}
              className={`relative rounded-2xl bg-white p-8 shadow-2xl transition-transform duration-300 hover:scale-105 ${
                offer.isBestValue ? 'border-4 border-[#FF7A00]' : ''
              }`}
            >
              {offer.isBestValue && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#FF7A00] px-6 py-2 font-bold text-white">
                  BEST VALUE!
                </div>
              )}

              <div className="mb-6 flex items-center justify-center">
                <Gift className="h-12 w-12 text-[#FF7A00]" />
              </div>
              <h3 className="mb-3 text-center text-2xl font-bold text-gray-900 md:text-3xl">{offer.title}</h3>
              <div className="mb-6 text-center">
                <div className="text-xl text-gray-400 line-through">{offer.originalPrice}</div>
                <div className="text-5xl font-bold text-[#0E7C7B]">{offer.price}</div>
                <div className="mt-2 text-lg text-gray-600">{offer.total}</div>
              </div>
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
                <p className="text-center font-semibold text-green-700">{offer.savings}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={scrollToOrder}
            className="w-full rounded-2xl bg-[#FF7A00] px-12 py-6 text-xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-[#e66d00] md:w-auto md:text-2xl"
          >
            Get Yours Today - Free Delivery + Pay on Delivery
          </button>
          <p className="mt-4 text-lg text-white">
            Free Delivery to ALL regions in Ghana | Pay When E Reach You
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 text-center text-white md:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md">
            <p className="text-lg font-bold">100% Satisfaction Guaranteed</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md">
            <p className="text-lg font-bold">Nationwide Delivery 2-3 Days</p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-md">
            <p className="text-lg font-bold">No Payment Until Delivery</p>
          </div>
        </div>
      </div>
    </section>
  );
}
