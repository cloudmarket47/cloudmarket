import { Droplets, AlertTriangle, Flame } from "lucide-react";
import { ScrollReveal } from "./animations/ScrollReveal";
import { StaggeredReveal } from "./animations/StaggeredReveal";

export function Problem() {
  const problems = [
    {
      icon: AlertTriangle,
      title: "Dirt builds up inside tile gaps",
      description: "Even after scrubbing, grime can remain trapped in narrow lines and corners."
    },
    {
      icon: Droplets,
      title: "Bathroom corners collect mold",
      description: "Moisture makes it easy for mold and residue to settle into hard-to-reach areas."
    },
    {
      icon: Flame,
      title: "Kitchen edges trap grease",
      description: "Oil and food residue stick around sink edges, stovetops and cabinet lines."
    }
  ];

  return (
    <ScrollReveal>
      <section className="bg-gray-100 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Still Struggling to Clean Tight Corners?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Standard brushes and sponges often miss the narrow spaces where dirt hides.
            </p>
          </div>

          <StaggeredReveal className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8" staggerDelay={100}>
            {problems.map((problem, index) => {
              const Icon = problem.icon;
              return (
                <div
                  key={index}
                  className="card-3d p-8 stagger-item"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-red-600" />
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
