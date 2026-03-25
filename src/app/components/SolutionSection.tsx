import { CheckCircle2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function SolutionSection() {
  const scrollToOrder = () => {
    document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-white py-12 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Meet the Crevice Cleaning Brush – Your Cleaning Padi
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Image */}
          <div className="order-2 lg:order-1">
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1765556556784-7656ee0a1bd8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMGtpdGNoZW4lMjB0aWxlc3xlbnwxfHx8fDE3NzA5OTc4NDF8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Clean kitchen with Crevice Brush"
                className="w-full h-auto rounded-3xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-[#0E7C7B] text-white px-6 py-4 rounded-xl shadow-lg">
                <p className="font-bold text-2xl">100% Effective!</p>
              </div>
            </div>
          </div>

          {/* Right: Text */}
          <div className="space-y-6 order-1 lg:order-2">
            <div className="bg-gradient-to-br from-[#0E7C7B]/10 to-[#2B7FFF]/10 p-8 rounded-2xl">
              <p className="text-xl md:text-2xl text-gray-800 leading-relaxed">
                No wahala again! This brush go reach every small gap, make your house dey shine proper proper. E strong, durable, and easy to use.
              </p>
            </div>

            <div className="space-y-4">
              {[
                'Works for bathroom, kitchen, tiles, everywhere',
                'Strong bristles wey no go bend',
                'Reach places wey you never fit clean before',
                'Save your time and energy'
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0E7C7B] flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">{benefit}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={scrollToOrder}
              className="w-full bg-[#FF7A00] hover:bg-[#e66d00] text-white px-8 py-5 rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Grab Yours Now – Pay on Delivery
            </button>

            <p className="text-center text-gray-600 text-sm">
              ⚡ Over 5,000+ Ghanaians don buy this brush already!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
