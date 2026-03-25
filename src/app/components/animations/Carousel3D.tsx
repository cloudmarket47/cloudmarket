import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Carousel3DProps {
  images: string[];
}

const AUTO_ADVANCE_MS = 4500;

function getRelativeOffset(index: number, activeIndex: number, totalSlides: number) {
  const rawOffset = index - activeIndex;
  const halfSlides = Math.floor(totalSlides / 2);

  if (rawOffset > halfSlides) {
    return rawOffset - totalSlides;
  }

  if (rawOffset < -halfSlides) {
    return rawOffset + totalSlides;
  }

  return rawOffset;
}

export function Carousel3D({ images }: Carousel3DProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const displayImages = useMemo(() => {
    const carouselImages = [...images];

    while (carouselImages.length < 3) {
      carouselImages.push(images[carouselImages.length % images.length] || '');
    }

    return carouselImages;
  }, [images]);

  useEffect(() => {
    if (displayImages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % displayImages.length);
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [displayImages.length]);

  const goToPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + displayImages.length) % displayImages.length);
  };

  const goToNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % displayImages.length);
  };

  return (
    <div className="carousel-3d-container">
      <div className="carousel-3d-viewport">
        <div className="carousel-3d-stage">
          {displayImages.map((image, index) => {
            const offset = getRelativeOffset(index, activeIndex, displayImages.length);
            const slideState =
              offset === 0 ? 'active' : offset === -1 ? 'left' : offset === 1 ? 'right' : 'hidden';

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                className={`carousel-3d-slide is-${slideState}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show product view ${index + 1}`}
                aria-current={offset === 0}
              >
                <div className="carousel-3d-card">
                  <ImageWithFallback
                    src={image}
                    alt={`Product view ${index + 1}`}
                    className="carousel-3d-image"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="carousel-3d-controls">
        <div className="carousel-3d-arrows">
          <button
            type="button"
            className="carousel-3d-nav-button"
            onClick={goToPrevious}
            aria-label="Previous product image"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="carousel-3d-nav-button"
            onClick={goToNext}
            aria-label="Next product image"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="carousel-3d-dots" role="tablist" aria-label="Product image selector">
          {displayImages.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`carousel-3d-dot ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to product image ${index + 1}`}
              aria-selected={index === activeIndex}
              role="tab"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
