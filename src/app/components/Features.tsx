import { Zap, Maximize2, Hand, Sparkles } from "lucide-react";
import { ScrollReveal } from "./animations/ScrollReveal";
import { StaggeredReveal } from "./animations/StaggeredReveal";

export function Features() {
  const features = [
    {
      icon: Zap,
      title: "Ultra-Strong Bristles",
      description: "Durable bristles help loosen stubborn dirt without flattening quickly."
    },
    {
      icon: Maximize2,
      title: "Slim Edge Design",
      description: "The narrow head reaches tile lines, sink edges and window tracks with ease."
    },
    {
      icon: Hand,
      title: "Comfortable Grip",
      description: "The handle stays comfortable in hand during longer cleaning sessions."
    },
    {
      icon: Sparkles,
      title: "Multi-Surface Cleaning",
      description: "Use it across bathrooms, kitchens, tiles, fixtures and other tight spaces."
    }
  ];

  return (
    <ScrollReveal>
      <section id="product-feature-details" className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Why This Brush <span className="text-[#0E7C7B]">Stands Out</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              It is built to clean the areas that standard tools usually miss.
            </p>
          </div>

          <StaggeredReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" staggerDelay={100}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="card-3d p-8 stagger-item"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
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
