import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProductCategoryDisplay, getProductCategoryTagLabel } from '../../lib/productCategories';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  getMarketplaceProductImage,
  getMarketplaceProductPricing,
} from './marketplaceShared';

interface MarketplaceProductCardProps {
  product: Product;
  formatPrice: (amount: number) => string;
  isAdded: boolean;
  onAddToCart: (product: Product) => void;
  onOpenProduct: (product: Product, section: string) => void;
}

export function MarketplaceProductCard({
  product,
  formatPrice,
  isAdded,
  onAddToCart,
  onOpenProduct,
}: MarketplaceProductCardProps) {
  const pricing = getMarketplaceProductPricing(product);

  return (
    <article className="group rounded-[1.65rem] border border-slate-200 bg-white p-2.5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-950">
      <Link
        to={`/product/${product.slug}`}
        onClick={() => onOpenProduct(product, 'homepage_product_card')}
        className="block"
      >
        <div className="relative overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)] dark:bg-[linear-gradient(180deg,#0d203f_0%,#10284d_100%)]">
          <div className="absolute left-3 top-3 z-10 rounded-full bg-[#ff7c45] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            -{pricing.discountPercentage}%
          </div>
          <div className="absolute right-3 top-3 z-10 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
            {getProductCategoryTagLabel(product)}
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-[1.25rem]">
            <ImageWithFallback
              src={getMarketplaceProductImage(product)}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      </Link>

      <div className="space-y-3 px-1 pb-1 pt-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {getProductCategoryDisplay(product)}
          </p>
          <Link
            to={`/product/${product.slug}`}
            onClick={() => onOpenProduct(product, 'homepage_product_title')}
            className="block text-[1.05rem] font-bold leading-6 text-slate-950 transition group-hover:text-[#2B63D9] dark:text-white dark:group-hover:text-[#9fc0ff]"
          >
            {product.name}
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <span className="text-lg font-black tracking-tight text-[#d73d32]">
            {formatPrice(pricing.currentPrice)}
          </span>
          <span className="text-sm font-medium text-slate-400 line-through dark:text-slate-500">
            {formatPrice(pricing.oldPrice)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddToCart(product)}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-[0_14px_30px_rgba(43,99,217,0.2)] transition duration-200 active:scale-[0.98]',
            isAdded
              ? 'bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]'
              : 'bg-[#2B63D9] text-white hover:bg-[#1f56c6]',
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {isAdded ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
