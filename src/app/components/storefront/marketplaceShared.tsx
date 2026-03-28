import {
  Activity,
  Baby,
  BookOpen,
  Car,
  Gamepad2,
  Hammer,
  Home,
  Laptop,
  PawPrint,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Trees,
} from 'lucide-react';
import type { ProductCategoryIconName } from '../../lib/productCategories';
import type { Product } from '../../types';

export interface CategoryFilterItem {
  id: string;
  name: string;
  slug: string;
  icon: ProductCategoryIconName;
  productCount: number;
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
    productCount: number;
  }>;
}

export interface ProductPricingSnapshot {
  currentPrice: number;
  oldPrice: number;
  discountPercentage: number;
  badgeLabel: string;
}

export const marketplaceCategoryIconMap: Record<
  ProductCategoryIconName,
  typeof Smartphone
> = {
  Smartphone,
  Laptop,
  Home,
  ShoppingBag,
  Sparkles,
  Car,
  Activity,
  Hammer,
  ShoppingBasket,
  Baby,
  Gamepad2,
  BookOpen,
  PawPrint,
  Trees,
};

export const marketplaceCategorySurfaceMap: Record<ProductCategoryIconName, string> = {
  Smartphone: 'from-[#eaf3ff] via-[#dcecff] to-[#f7fbff]',
  Laptop: 'from-[#eef0ff] via-[#e5ebff] to-[#f7f8ff]',
  Home: 'from-[#fff0c9] via-[#fff6db] to-[#fffaf0]',
  ShoppingBag: 'from-[#ffe6ef] via-[#ffeef4] to-[#fff7fb]',
  Sparkles: 'from-[#f7e8ff] via-[#fbf2ff] to-[#fff9ff]',
  Car: 'from-[#fff0e4] via-[#fff5ee] to-[#fffaf7]',
  Activity: 'from-[#e3fbf6] via-[#edfffb] to-[#f7fffd]',
  Hammer: 'from-[#fef1e8] via-[#fff6ef] to-[#fffaf7]',
  ShoppingBasket: 'from-[#eef8df] via-[#f6fbe9] to-[#fbfff4]',
  Baby: 'from-[#ffe8f3] via-[#fff1f7] to-[#fff8fb]',
  Gamepad2: 'from-[#edeaff] via-[#f4f2ff] to-[#faf9ff]',
  BookOpen: 'from-[#f7eddc] via-[#fbf5e9] to-[#fffaf2]',
  PawPrint: 'from-[#ffe9dc] via-[#fff2ea] to-[#fff9f5]',
  Trees: 'from-[#e3f7ea] via-[#edfdf2] to-[#f7fff9]',
};

const TRENDING_KEYWORD_FALLBACK = ['iPhone', 'Sneakers', 'Hair', 'Laptop'];

export function getMarketplaceProductImage(product: Product) {
  return (
    product.image ||
    product.sections.hero.image ||
    product.sections.seeInAction.poster ||
    product.sections.solution.image ||
    product.sections.showcase.images[0] ||
    ''
  );
}

export function getMarketplaceProductPricing(product: Product): ProductPricingSnapshot {
  const primaryPackage = product.sections.offer.packages.find((bundle) => bundle.price > 0) ?? null;
  const currentPrice = primaryPackage?.price ?? product.price;
  const rawOldPrice = primaryPackage?.oldPrice ?? Math.round(currentPrice * 1.22);
  const oldPrice = rawOldPrice > currentPrice ? rawOldPrice : Math.round(currentPrice * 1.18);
  const discountPercentage = Math.max(
    6,
    Math.min(65, Math.round(((oldPrice - currentPrice) / oldPrice) * 100)),
  );

  return {
    currentPrice,
    oldPrice,
    discountPercentage,
    badgeLabel: product.sections.offer.badge,
  };
}

export function buildMarketplaceTrendingKeywords(products: Product[]) {
  const stopWords = new Set([
    'with',
    'from',
    'your',
    'this',
    'that',
    'daily',
    'smart',
    'product',
    'offer',
  ]);

  const dynamicKeywords = products.flatMap((product) =>
    [product.name, product.category, product.subcategory ?? '']
      .join(' ')
      .split(/[\s/&-]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 4 && !stopWords.has(item.toLowerCase())),
  );

  return Array.from(new Set([...dynamicKeywords, ...TRENDING_KEYWORD_FALLBACK])).slice(0, 4);
}

export function formatMarketplaceCountdownParts(timeRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(timeRemaining / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return { hours, minutes, seconds };
}
