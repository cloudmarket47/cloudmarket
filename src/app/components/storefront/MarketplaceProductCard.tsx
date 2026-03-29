import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProductCategoryDisplay } from '../../lib/productCategories';
import type { Product } from '../../types';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  getMarketplaceProductImage,
  getMarketplaceProductPricing,
} from './marketplaceShared';

interface MarketplaceProductCardProps {
  product: Product;
  formatPrice: (amount: number, sourceCurrency?: Product['currencyCode']) => string;
  onOpenProduct: (product: Product, section: string) => void;
}

export function MarketplaceProductCard({
  product,
  formatPrice,
  onOpenProduct,
}: MarketplaceProductCardProps) {
  const pricing = getMarketplaceProductPricing(product);

  return (
    <article className="group rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-[0_12px_26px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(15,23,42,0.1)] sm:rounded-[1.65rem] sm:p-2.5 dark:border-slate-800 dark:bg-slate-950">
      <Link
        to={`/product/${product.slug}`}
        onClick={() => onOpenProduct(product, 'homepage_product_card')}
        className="block"
      >
        <div className="relative overflow-hidden rounded-[1.05rem] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)] dark:bg-[linear-gradient(180deg,#0d203f_0%,#10284d_100%)] sm:rounded-[1.25rem]">
          <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#ff7c45] px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[11px]">
            -{pricing.discountPercentage}%
          </div>
          <div className="aspect-[5/3] overflow-hidden rounded-[1.05rem] sm:aspect-[4/3] sm:rounded-[1.25rem]">
            <ImageWithFallback
              src={getMarketplaceProductImage(product)}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      </Link>

      <div className="space-y-2 px-1 pb-1 pt-2.5 sm:space-y-3 sm:pt-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">
            {getProductCategoryDisplay(product)}
          </p>
          <Link
            to={`/product/${product.slug}`}
            onClick={() => onOpenProduct(product, 'homepage_product_title')}
            className="line-clamp-2 block text-[0.94rem] font-bold leading-5 text-slate-950 transition group-hover:text-[#2B63D9] sm:text-[1.05rem] sm:leading-6 dark:text-white dark:group-hover:text-[#9fc0ff]"
          >
            {product.name}
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-1.5 sm:gap-2">
          <span className="text-[1rem] font-black tracking-tight text-[#d73d32] sm:text-lg">
            {formatPrice(pricing.currentPrice, product.currencyCode)}
          </span>
          <span className="text-[0.78rem] font-medium text-slate-400 line-through dark:text-slate-500 sm:text-sm">
            {formatPrice(pricing.oldPrice, product.currencyCode)}
          </span>
        </div>

        <Link
          to={`/product/${product.slug}`}
          onClick={() => onOpenProduct(product, 'homepage_view_product')}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#2B63D9] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(43,99,217,0.2)] transition duration-200 hover:bg-[#1f56c6] active:scale-[0.98] sm:h-11"
        >
          <span>View Product</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
