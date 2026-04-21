import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Download, FileDown, Sparkles } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { ScrollReveal } from '../../components/animations/ScrollReveal';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { OrderSlipPreview } from '../../components/order/OrderSlipPreview';
import { SuccessSticker } from '../../components/order/SuccessSticker';
import { StorefrontReloadNotice } from '../../components/storefront/StorefrontReloadNotice';
import { getMarketplaceProductImage, getMarketplaceProductPricing } from '../../components/storefront/marketplaceShared';
import { useAppTheme } from '../../context/AppThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useBrandingSettings } from '../../lib/branding';
import { downloadElementAsImage, saveElementAsPdf } from '../../lib/domExport';
import { filterProductsByCategory, resolveProductCategorySelection } from '../../lib/productCategories';
import { getPlacedOrder } from '../../lib/orders';
import { loadStorefrontProducts } from '../../lib/storefrontProducts';
import { formatCurrency } from '../../lib/utils';
import type { PlacedOrder, Product } from '../../types';

export function ThankYou() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { formatPrice } = useLocale();
  const { isDarkMode } = useAppTheme();
  const branding = useBrandingSettings();
  const orderNumber = searchParams.get('order');
  const routedOrder = (location.state as { order?: PlacedOrder } | null)?.order ?? null;
  const [order, setOrder] = useState<PlacedOrder | null>(routedOrder);
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>([]);
  const [isLoadingStorefrontProducts, setIsLoadingStorefrontProducts] = useState(true);
  const [isLoadingOrder, setIsLoadingOrder] = useState(() => !routedOrder && Boolean(orderNumber));
  const [storefrontError, setStorefrontError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isSlipPreviewOpen, setIsSlipPreviewOpen] = useState(false);
  const pageError = orderError ?? storefrontError;
  const isDark = isDarkMode;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let isActive = true;

    const syncProducts = async () => {
      if (isActive) {
        setStorefrontError(null);
      }

      try {
        const products = await loadStorefrontProducts();

        if (isActive) {
          setStorefrontProducts(products);
          setIsLoadingStorefrontProducts(false);
        }
      } catch {
        if (isActive) {
          setIsLoadingStorefrontProducts(false);
          setStorefrontError('We could not load this page from Supabase. Please reload the page and try again.');
        }
      }
    };

    void syncProducts();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (routedOrder) {
      setOrder(routedOrder);
      setOrderError(null);
      setIsLoadingOrder(false);
      return;
    }

    let isActive = true;

    const syncOrder = async () => {
      if (!orderNumber) {
        if (isActive) {
          setOrder(null);
          setOrderError(null);
          setIsLoadingOrder(false);
        }
        return;
      }

      if (isActive) {
        setOrderError(null);
      }

      try {
        const loadedOrder = await getPlacedOrder(orderNumber);

        if (isActive) {
          setOrder(loadedOrder);
          setOrderError(null);
          setIsLoadingOrder(false);
        }
      } catch {
        if (isActive) {
          setIsLoadingOrder(false);
          setOrderError('We could not load your order details from Supabase. Please reload the page and try again.');
        }
      }
    };

    void syncOrder();

    return () => {
      isActive = false;
    };
  }, [orderNumber, routedOrder]);

  useEffect(() => {
    if (pageError || (!isLoadingOrder && !isLoadingStorefrontProducts)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (isLoadingOrder) {
        setOrderError('We could not load your order details from Supabase. Please reload the page and try again.');
        setIsLoadingOrder(false);
      }

      if (isLoadingStorefrontProducts) {
        setStorefrontError('We could not load this page from Supabase. Please reload the page and try again.');
        setIsLoadingStorefrontProducts(false);
      }
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoadingOrder, isLoadingStorefrontProducts, pageError]);

  const orderedProduct = useMemo(() => {
    if (!order) {
      return null;
    }

    const normalizedProductName = order.productName.trim().toLowerCase();

    return (
      storefrontProducts.find(
        (product) =>
          product.id === order.productId ||
          product.slug === order.productSlug ||
          product.name.trim().toLowerCase() === normalizedProductName,
      ) ?? null
    );
  }, [order, storefrontProducts]);

  const relatedProducts = useMemo(() => {
    if (!order || !orderedProduct) {
      return [];
    }

    const categoryFilter =
      orderedProduct.categoryId || orderedProduct.categorySlug || orderedProduct.subcategorySlug || 'all';

    return filterProductsByCategory(storefrontProducts, categoryFilter)
      .filter(
        (product) =>
          product.id !== orderedProduct.id &&
          product.slug !== order.productSlug &&
          product.status === 'published',
      )
      .slice(0, 8);
  }, [order, orderedProduct, storefrontProducts]);

  const orderedCategoryLabel = useMemo(() => {
    if (!orderedProduct) {
      return '';
    }

    return resolveProductCategorySelection({
      categoryId: orderedProduct.categoryId,
      categorySlug: orderedProduct.categorySlug,
      categoryName: orderedProduct.category,
      subcategorySlug: orderedProduct.subcategorySlug,
      subcategoryName: orderedProduct.subcategory,
    }).category.name;
  }, [orderedProduct]);

  const websiteUrl =
    branding.companyWebsite.trim() ||
    (typeof window === 'undefined' ? 'https://cloudmarket.ng' : window.location.origin);

  if (pageError) {
    return (
      <StorefrontReloadNotice
        title="Unable to load this page"
        message={pageError}
        className={`min-h-screen px-4 py-12 ${isDark ? 'storefront-dark bg-[#0d1117]' : 'bg-[#f7f6f2]'}`}
      />
    );
  }

  if (isLoadingOrder || isLoadingStorefrontProducts) {
    return (
      <div className={`min-h-screen px-4 py-16 ${isDark ? 'storefront-dark bg-[#0d1117]' : 'bg-[#f7f6f2]'}`}>
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <div
            className={`w-full rounded-[2.4rem] border p-10 text-center shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl ${
              isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white/92'
            }`}
          >
            <div className={`mx-auto h-14 w-14 animate-spin rounded-full border-[3px] border-r-[#0E7C7B] border-t-[#2B63D9] ${isDark ? 'border-white/10' : 'border-[#2B63D9]/15'}`} />
            <h1 className={`mt-6 text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              Loading your order
            </h1>
            <p className={`mt-3 text-base leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Please wait while we prepare your order details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadImage = async () => {
    if (!slipRef.current || !order) {
      return;
    }

    setIsDownloadingImage(true);

    try {
      await downloadElementAsImage(slipRef.current, `${order.orderNumber.toLowerCase()}-slip.png`);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!slipRef.current || !order) {
      return;
    }

    setIsPreparingPdf(true);

    try {
      saveElementAsPdf(slipRef.current, `${order.orderNumber} Order Slip`);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (!order) {
    return (
      <div className={`min-h-screen px-4 py-16 ${isDark ? 'storefront-dark bg-[#0d1117]' : 'bg-[#f7f6f2]'}`}>
        <div
          className={`mx-auto max-w-3xl rounded-[2.5rem] border p-10 text-center shadow-[0_28px_80px_rgba(15,23,42,0.08)] ${
            isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
            Order Complete
          </p>
          <h1 className={`mt-4 text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
            Thank You for Your Order
          </h1>
          <p className={`mt-4 text-lg leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Your order was received, but the full order preview is not available in this session.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/">
              <Button variant="primary" size="lg">
                Return to Homepage
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" size="lg">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'storefront-dark bg-[#0d1117] text-white' : 'bg-[#f7f6f2] text-slate-950'}`}>
      <ScrollReveal>
        <section className="px-4 pb-12 pt-8 text-center md:pb-16 md:pt-12">
          <div
            className={`mx-auto max-w-6xl rounded-[2.75rem] border p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] md:p-10 ${
              isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mx-auto flex max-w-5xl flex-col items-center">
              <SuccessSticker />

              <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-[#eef5ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
                <Sparkles className="h-3.5 w-3.5" />
                Order Successful
              </span>

              <h1 className={`mt-6 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Thank You, {order.customerName}
              </h1>

              <p className={`mt-5 max-w-2xl text-lg leading-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Your order is confirmed, and we are already preparing delivery for {order.productName}.
              </p>

              {relatedProducts.length ? (
                <div className="mt-8 w-full text-left">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
                        You Might Like
                      </p>
                      <h2 className={`mt-2 text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        More picks from {orderedCategoryLabel || 'this category'}
                      </h2>
                      <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Since you ordered {order.productName}, here are a few related products shoppers also open next.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {relatedProducts.map((product) => {
                      const pricing = getMarketplaceProductPricing(product);

                      return (
                        <Link
                          key={product.id}
                          to={`/product/${product.slug}`}
                          className={`min-w-[15.5rem] max-w-[15.5rem] snap-start rounded-[1.65rem] border p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)] ${
                            isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div
                            className={`relative overflow-hidden rounded-[1.3rem] ${
                              isDark
                                ? 'bg-[linear-gradient(180deg,#0f1726_0%,#111c2d_100%)]'
                                : 'bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)]'
                            }`}
                          >
                            <div className="absolute left-3 top-3 z-10 rounded-full bg-[#ff7c45] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                              -{pricing.discountPercentage}%
                            </div>
                            <div className="aspect-[4/3] overflow-hidden rounded-[1.3rem]">
                              <ImageWithFallback
                                src={getMarketplaceProductImage(product)}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 px-1 pb-1 pt-3">
                            <p className={`line-clamp-2 text-base font-bold leading-6 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                              {product.name}
                            </p>
                            <div className="flex flex-wrap items-end gap-2">
                              <span className="text-lg font-black tracking-tight text-[#d73d32]">
                                {formatPrice(pricing.currentPrice, product.currencyCode)}
                              </span>
                              <span className={`text-sm line-through ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {formatPrice(pricing.oldPrice, product.currencyCode)}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#2B63D9] px-4 py-2 text-sm font-semibold text-white">
                              View Product
                              <ArrowRight className="h-4 w-4" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
                <div className={`rounded-[1.6rem] px-5 py-4 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Order Number</p>
                  <p className={`mt-3 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{order.orderNumber}</p>
                </div>
                <div className={`rounded-[1.6rem] px-5 py-4 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Final Total</p>
                  <p className={`mt-3 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    {formatCurrency(order.finalAmount, order.localeCountryCode)}
                  </p>
                </div>
                <div className={`rounded-[1.6rem] px-5 py-4 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Package</p>
                  <p className={`mt-3 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{order.packageTitle}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/">
                  <Button variant="primary" size="lg">
                    Continue Shopping
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSlipPreviewOpen((currentState) => !currentState)}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-4 text-sm font-semibold transition-colors ${
                    isDark
                      ? 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                      : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Preview Order Slip
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isSlipPreviewOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
              </div>

              {isSlipPreviewOpen ? (
                <div
                  className={`mt-8 w-full rounded-[2rem] border p-4 md:p-6 ${
                    isDark ? 'border-white/10 bg-[#111826]' : 'border-slate-200 bg-[#f8fafc]'
                  }`}
                >
                  <div className="mb-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      disabled={isDownloadingImage}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      {isDownloadingImage ? 'Preparing Image...' : 'Download as Image'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isPreparingPdf}
                      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors ${
                        isDark
                          ? 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                          : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <FileDown className="h-4 w-4" />
                      {isPreparingPdf ? 'Preparing PDF...' : 'Save as PDF'}
                    </button>
                  </div>

                  <OrderSlipPreview
                    ref={slipRef}
                    order={order}
                    companyName={branding.companyName}
                    companyShortName={branding.companyShortName}
                    companyPhone={branding.companyPhone}
                    websiteUrl={websiteUrl}
                    logoUrl={branding.logoUrl}
                    productImage={orderedProduct ? getMarketplaceProductImage(orderedProduct) : ''}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
