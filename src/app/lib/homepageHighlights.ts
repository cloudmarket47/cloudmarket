export const DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES = [
  '/marketplace/ecommerce/ecommerce-01.jpg',
  '/marketplace/ecommerce/ecommerce-02.jpg',
  '/marketplace/ecommerce/ecommerce-03.jpg',
  '/marketplace/ecommerce/ecommerce-04.jpg',
  '/marketplace/ecommerce/ecommerce-05.jpg',
  '/marketplace/ecommerce/ecommerce-06.jpg',
  '/marketplace/ecommerce/ecommerce-07.jpg',
  '/marketplace/ecommerce/ecommerce-08.jpg',
  '/marketplace/ecommerce/ecommerce-09.jpg',
  '/marketplace/ecommerce/ecommerce-10.jpg',
];

export function normalizeHomepageHighlightImages(images?: string[] | null) {
  const cleaned = (images ?? [])
    .map((image) => image.trim())
    .filter(Boolean);

  return cleaned.length
    ? Array.from(new Set(cleaned))
    : [...DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES];
}
