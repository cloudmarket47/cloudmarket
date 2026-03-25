import { Play, Video } from 'lucide-react';
import { ScrollReveal } from './animations/ScrollReveal';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductVideoPlaceholderProps {
  title: string;
  subtitle: string;
  poster: string;
  badge: string;
}

export function ProductVideoPlaceholder({
  title,
  subtitle,
  poster,
  badge,
}: ProductVideoPlaceholderProps) {
  return (
    <ScrollReveal>
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
                <Video className="h-3.5 w-3.5" />
                {badge}
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                {title}
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                {subtitle}
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={poster}
                  alt={title}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/35 to-slate-950/65" />

                <div className="absolute left-4 top-4 rounded-full bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 backdrop-blur-md">
                  Video Placeholder
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-white/16 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-md">
                    <Play className="ml-1 h-8 w-8 fill-white text-white" />
                  </div>

                  <p className="mt-6 text-xl font-semibold text-white md:text-2xl">
                    Your demo video will appear here
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 md:text-base">
                    Replace this poster block with an embedded product demo, customer testimonial, or walkthrough video.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
