import { Layers, ShieldCheck, Sparkles } from "lucide-react";
import { ScrollReveal } from "./animations/ScrollReveal";

export function HowItWorks() {
  const productDetails = [
    {
      icon: Layers,
      title: "Engineered for tight spaces",
      description: "The slim profile reaches tile lines, sink edges, window tracks and narrow corners with better control."
    },
    {
      icon: ShieldCheck,
      title: "Durable and long-lasting",
      description: "Strong bristles and a sturdy handle are built for repeated cleaning without losing shape quickly."
    },
    {
      icon: Sparkles,
      title: "Made for everyday surfaces",
      description: "Safe and effective for bathroom tiles, kitchen corners, fixtures and other hard-to-reach spots."
    }
  ];

  return (
    <ScrollReveal>
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              About This <span className="text-[#0E7C7B]">Product</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Quick highlights of what makes this brush reliable for daily home cleaning.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {productDetails.map((detail, index) => {
                const Icon = detail.icon;
                return (
                  <div key={index}>
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] rounded-xl flex items-center justify-center shadow-lg">
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900">
                        {detail.title}
                      </h3>

                      <p className="text-gray-600">
                        {detail.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
