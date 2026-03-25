import { ScrollReveal } from "./animations/ScrollReveal";
import { Carousel3D } from "./animations/Carousel3D";

export function ProductShowcase() {
  const images = [
    "https://images.unsplash.com/photo-1675050861806-d5a2b7ce3898?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwY3JldmljZSUyMHRvb2x8ZW58MXx8fHwxNzcwOTk4MjE1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "https://images.unsplash.com/photo-1630325459372-36f3f86281cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwZGV0YWlsJTIwd29ya3xlbnwxfHx8fDE3NzA5OTgyMTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "https://images.unsplash.com/photo-1628602813558-8c6ad5eafe4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMGJhdGhyb29tJTIwdGlsZXN8ZW58MXx8fHwxNzcwOTk4MjE1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "https://images.unsplash.com/photo-1675050861806-d5a2b7ce3898?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwY3JldmljZSUyMHRvb2x8ZW58MXx8fHwxNzcwOTk4MjE1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "https://images.unsplash.com/photo-1630325459372-36f3f86281cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMGJydXNoJTIwZGV0YWlsJTIwd29ya3xlbnwxfHx8fDE3NzA5OTgyMTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "https://images.unsplash.com/photo-1628602813558-8c6ad5eafe4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMGJhdGhyb29tJTIwdGlsZXN8ZW58MXx8fHwxNzcwOTk4MjE1fDA&ixlib=rb-4.1.0&q=80&w=1080"
  ];

  return (
    <ScrollReveal>
      <section className="bg-gradient-to-b from-white to-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              See the <span className="text-[#0E7C7B]">Quality for Yourself</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              View the brush from multiple angles and inspect the finishing details.
            </p>
          </div>

          <Carousel3D images={images} />

          <div className="text-center mt-8">
            <p className="text-gray-600">Tap the side cards or use the arrows below to inspect every angle.</p>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
