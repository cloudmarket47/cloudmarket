import { useEffect, useMemo, useState } from 'react';
import { ScrollReveal } from './animations/ScrollReveal';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getOptimizedMedia } from '../lib/media';

interface ProductVideoPlaceholderProps {
  title: string;
  subtitle: string;
  poster: string;
  videoSrc?: string;
  aspectRatio?: '16:9' | '4:5' | '1:1' | '3:4';
  carouselImages?: string[];
}

const VIDEO_RATIO_CLASS_MAP = {
  '16:9': 'aspect-video',
  '4:5': 'aspect-[4/5]',
  '1:1': 'aspect-square',
  '3:4': 'aspect-[3/4]',
} as const;

export function ProductVideoPlaceholder({
  title,
  subtitle,
  poster,
  videoSrc,
  aspectRatio = '16:9',
  carouselImages = [],
}: ProductVideoPlaceholderProps) {
  const ratioClassName = VIDEO_RATIO_CLASS_MAP[aspectRatio] ?? 'aspect-video';
  const fadeImages = useMemo(() => {
    return [poster, ...carouselImages]
      .map((image) => image?.trim() ?? '')
      .filter(Boolean)
      .filter((image, index, collection) => collection.indexOf(image) === index)
      .slice(0, 5);
  }, [carouselImages, poster]);
  const fadeImageSignature = fadeImages.join('|');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [fadeImageSignature]);

  useEffect(() => {
    if (videoSrc || fadeImages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % fadeImages.length);
    }, 2800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fadeImageSignature, fadeImages.length, videoSrc]);

  return (
    <ScrollReveal>
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                {title}
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                {subtitle}
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className={`relative overflow-hidden bg-slate-100 ${ratioClassName}`}>
                {videoSrc ? (
                  <video
                    src={getOptimizedMedia(videoSrc)}
                    poster={poster ? getOptimizedMedia(poster) : undefined}
                    controls
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    playsInline
                    preload="none"
                    className="h-full w-full bg-black object-cover"
                  />
                ) : (
                  <>
                    {fadeImages.length > 0 ? (
                      <div className="absolute inset-0">
                        {fadeImages.map((image, index) => (
                          <ImageWithFallback
                            key={`${image}-${index}`}
                            src={image}
                            alt={`${title || 'Product media'} ${index + 1}`}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                              index === activeImageIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/25 via-transparent to-slate-950/30" />

                    {fadeImages.length > 1 ? (
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950/35 px-3 py-2 backdrop-blur-md">
                        {fadeImages.map((image, index) => (
                          <span
                            key={`${image}-dot-${index}`}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === activeImageIndex ? 'w-7 bg-white' : 'w-2 bg-white/45'
                            }`}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
