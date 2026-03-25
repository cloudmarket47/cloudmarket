import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ScrollReveal } from "./animations/ScrollReveal";

interface SolutionProps {
  onBuyNow: (source?: string) => void;
}

export function Solution({ onBuyNow }: SolutionProps) {
  return (
    <ScrollReveal>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="image-3d rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1630325459372-36f3f86281cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwZGV0YWlsJTIwd29ya3xlbnwxfHx8fDE3NzA5OTgyMTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Crevice Cleaning Brush in action"
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-block">
                <span className="badge-3d">
                  The Solution
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
                Meet the Crevice Cleaning Brush <span className="text-[#0E7C7B]">for Deep Cleaning</span>
              </h2>

              <p className="text-xl text-gray-700 leading-relaxed">
                This slim brush reaches narrow gaps with ease, helping you clean tile lines, corners and edges more effectively.
              </p>

              <div className="space-y-4">
                <div className="card-3d p-6">
                  <p className="text-lg text-gray-800">
                    <span className="font-bold text-[#0E7C7B]">Strong bristles</span> that hold their shape during regular use
                  </p>
                </div>
                <div className="card-3d p-6">
                  <p className="text-lg text-gray-800">
                    <span className="font-bold text-[#0E7C7B]">Slim design</span> that fits into narrow corners and tracks
                  </p>
                </div>
                <div className="card-3d p-6">
                  <p className="text-lg text-gray-800">
                    <span className="font-bold text-[#0E7C7B]">Comfortable handle</span> for a steadier grip while scrubbing
                  </p>
                </div>
              </div>

              <button
                onClick={() => onBuyNow('solution_buy_now')}
                className="btn-3d btn-3d-orange w-full md:w-auto"
              >
                Buy Now - Pay on Delivery
              </button>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
