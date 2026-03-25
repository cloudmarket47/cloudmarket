import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useBrandingSettings } from '../../lib/branding';

const MARKETPLACE_COLLECTION_ROW_SIZE = 5;

function buildRowImages(imagePool: string[], startOffset: number) {
  return Array.from({ length: MARKETPLACE_COLLECTION_ROW_SIZE }, (_, index) => {
    return imagePool[(index + startOffset) % imagePool.length];
  });
}

export function MarketplaceCollectionsCarousel() {
  const branding = useBrandingSettings();
  const images = branding.homepageHighlightImages;

  if (!images.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <p className="text-lg font-bold text-slate-950">Highlights coming soon</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Featured gallery tiles will appear here after highlight images are added.
        </p>
      </div>
    );
  }

  const topRowImages = buildRowImages(images, 0);
  const bottomRowImages = buildRowImages(images, Math.max(1, Math.floor(images.length / 2)));

  const renderTrackImages = (images: string[], rowKey: string) => {
    return [...images, ...images].map((image, index) => (
      <div
        key={`${rowKey}-${image}-${index}`}
        className="w-[190px] shrink-0 rounded-[1.8rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:w-[220px] lg:w-[240px]"
      >
        <div className="aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-slate-100">
          <ImageWithFallback
            src={image}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    ));
  };

  return (
    <div className="feature-marquee-shell flex flex-col gap-4 md:gap-6">
      <div className="feature-marquee-row">
        <div className="feature-marquee-track feature-marquee-track-left">
          {renderTrackImages(topRowImages, 'top')}
        </div>
      </div>

      <div className="feature-marquee-row">
        <div className="feature-marquee-track feature-marquee-track-right">
          {renderTrackImages(bottomRowImages, 'bottom')}
        </div>
      </div>
    </div>
  );
}
