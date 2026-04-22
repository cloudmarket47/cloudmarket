import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { useLocale } from '../../context/LocaleContext';
import {
  loadStorefrontProducts,
  STOREFRONT_PRODUCTS_CHANGE_EVENT,
} from '../../lib/storefrontProducts';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

import { Hero } from '../../components/Hero';
import { ProductFeaturesMarquee } from '../../components/ProductFeaturesMarquee';
import { Problem } from '../../components/Problem';
import { Solution } from '../../components/Solution';
import { Features } from '../../components/Features';
import { HowItWorks } from '../../components/HowItWorks';
import { ProductShowcase } from '../../components/ProductShowcase';
import { ProductVideoPlaceholder } from '../../components/ProductVideoPlaceholder';
import { ProductHeadlineTextSection } from '../../components/ProductHeadlineTextSection';
import { SocialProof } from '../../components/SocialProof';
import { SpecialOffer } from '../../components/SpecialOffer';
import { FAQ } from '../../components/FAQ';
import { OrderForm } from '../../components/OrderForm';
import { Footer } from '../../components/Footer';
import { StickyMobileCTA } from '../../components/StickyMobileCTA';
import { TopDropOfferAlerts } from '../../components/TopDropOfferAlerts';
import { ScrollReveal } from '../../components/animations/ScrollReveal';
import { EmailSubscription } from '../../components/storefront/EmailSubscription';
import { FloatingStorefrontActions } from '../../components/storefront/FloatingStorefrontActions';
import { CheckoutSheet } from '../../components/CheckoutSheet';
import { StorefrontReloadNotice } from '../../components/storefront/StorefrontReloadNotice';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../../lib/analyticsTelemetry';
import { useBrandingSettings } from '../../lib/branding';
import { trackSubscriberActivity } from '../../lib/subscriberTelemetry';
import type { Product } from '../../types';

export function ProductPage() {
  const { slug } = useParams();
  const { formatPrice } = useLocale();
  const branding = useBrandingSettings();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPackageQuantity, setSelectedPackageQuantity] = useState('1');
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [storefrontError, setStorefrontError] = useState<string | null>(null);
  const product = storefrontProducts.find((p) => p.slug === slug);
  const isDark = false;
  const mobileStickyCtaCaptions = useMemo(() => {
    const fallbackCaptions = [
      'Order Now - Pay on Delivery',
      'Claim Today\'s Free Delivery Offer',
      'Get the Bundle Before It Sells Out',
      'Unlock the Best Promo Package Now',
      'Tap to Reserve Your Discounted Order',
    ];

    const productCaptions = (product?.sections.orderForm.mobileStickyCtaTexts ?? [])
      .map((item) => item.trim())
      .filter(Boolean);

    if (productCaptions.length > 0) {
      return productCaptions;
    }

    const globalCaptions = (branding.mobileStickyCtaTexts ?? [])
      .map((item) => item.trim())
      .filter(Boolean);

    if (globalCaptions.length > 0) {
      return globalCaptions;
    }

    const packageCaptions = (product?.sections.offer.packages ?? [])
      .slice(0, 5)
      .map((pkg, index) => {
        const savings = (pkg.oldPrice ?? 0) > pkg.price ? ` and save ${(pkg.oldPrice ?? 0) - pkg.price}` : '';
        return index === 0
          ? `Order ${pkg.title} now`
          : `Get ${pkg.title}${savings}`;
      });

    return packageCaptions.length > 0 ? packageCaptions : fallbackCaptions;
  }, [branding.mobileStickyCtaTexts, product]);

  useEffect(() => {
    let isActive = true;

    const syncProducts = async (force = false) => {
      if (isActive) {
        setStorefrontError(null);
      }

      try {
        const products = await loadStorefrontProducts(force);

        if (isActive) {
          setStorefrontError(null);
          setStorefrontProducts(products);
          setIsLoadingProducts(false);
        }
      } catch {
        if (isActive) {
          setIsLoadingProducts(false);
          setStorefrontError('We could not load this product page from Supabase. Please reload the page and try again.');
        }
      }
    };

    void syncProducts(true);

    const handleStorefrontProductsChange = () => {
      void syncProducts(true);
    };

    window.addEventListener(
      STOREFRONT_PRODUCTS_CHANGE_EVENT,
      handleStorefrontProductsChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        STOREFRONT_PRODUCTS_CHANGE_EVENT,
        handleStorefrontProductsChange as EventListener,
      );
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoadingProducts || storefrontError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoadingProducts(false);
      setStorefrontError('We could not load this product page from Supabase. Please reload the page and try again.');
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoadingProducts, storefrontError]);

  useEffect(() => {
    if (!product) {
      return;
    }

    trackAnalyticsEvent({
      type: 'product_view',
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
    });

    trackSubscriberActivity({
      type: 'product_view',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      pagePath: `/product/${product.slug}`,
    });
  }, [product]);

  if (storefrontError) {
    return (
      <StorefrontReloadNotice
        title="Unable to load this product page"
        message={storefrontError}
        className="min-h-screen bg-white"
      />
    );
  }

  if (isLoadingProducts) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <section
          className={`relative overflow-hidden px-3 py-3 md:px-6 md:py-6 ${
            isDark ? 'bg-[#0d1117]' : 'bg-[#f6f4ef]'
          }`}
        >
          <div className="mx-auto h-[80vh] max-w-7xl md:h-[700px]">
            <div
              className={`relative h-full overflow-hidden rounded-[2.5rem] md:rounded-[3rem] ${
                isDark
                  ? 'bg-[linear-gradient(135deg,#08111f_0%,#0c1728_45%,#101b2f_100%)]'
                  : 'bg-[linear-gradient(135deg,#dfe9f7_0%,#f4f6f2_50%,#d9e6f7_100%)]'
              }`}
            >
              <div
                className={`absolute inset-0 animate-pulse ${
                  isDark
                    ? 'bg-[radial-gradient(circle_at_top,rgba(122,174,255,0.12),transparent_55%)]'
                    : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_55%)]'
                }`}
              />
              <div className="relative z-10 flex h-full items-end">
                <div className="mx-auto flex h-full w-full max-w-6xl items-end p-5 md:p-10">
                  <div className="w-full max-w-[36rem] space-y-4 md:space-y-6">
                    <div className={`h-5 w-28 animate-pulse rounded-full ${isDark ? 'bg-white/10' : 'bg-white/80'}`} />
                    <div className="space-y-3">
                      <div className={`h-14 w-full max-w-[22rem] animate-pulse rounded-[1.8rem] md:h-16 ${isDark ? 'bg-white/12' : 'bg-white/85'}`} />
                      <div className={`h-5 w-40 animate-pulse rounded-full ${isDark ? 'bg-white/10' : 'bg-white/75'}`} />
                      <div className={`h-4 w-full max-w-[28rem] animate-pulse rounded-full ${isDark ? 'bg-white/10' : 'bg-white/70'}`} />
                      <div className={`h-4 w-full max-w-[24rem] animate-pulse rounded-full ${isDark ? 'bg-white/8' : 'bg-white/60'}`} />
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className={`h-16 w-40 animate-pulse rounded-full ${isDark ? 'bg-white/12' : 'bg-white/85'}`} />
                      <div className={`h-14 w-full animate-pulse rounded-full sm:w-44 ${isDark ? 'bg-white/12' : 'bg-white/90'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto space-y-8 px-4 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={`product-page-skeleton-card-${index}`}
                className={`rounded-[2rem] border p-6 ${
                  isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className={`h-5 w-24 animate-pulse rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className={`mt-4 h-6 w-full animate-pulse rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className={`mt-3 h-4 w-5/6 animate-pulse rounded-full ${isDark ? 'bg-white/8' : 'bg-slate-200'}`} />
                <div className={`mt-8 h-48 animate-pulse rounded-[1.5rem] ${isDark ? 'bg-white/8' : 'bg-slate-200'}`} />
              </div>
            ))}
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="mx-auto mb-6 max-w-lg text-gray-600">
              This product page is not available right now. Browse the homepage to view current offers.
            </p>
            <Link to="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const recommendedProducts = storefrontProducts
    .filter((p) => p.id !== product.id && p.status === 'published')
    .slice(0, 3);
  const openCheckout = (source = 'product_checkout_open') => {
    const sourceLabelMap: Record<string, string> = {
      hero_buy_now: 'Buy Now',
      solution_buy_now: 'Solution Buy Now',
      offer_quick_checkout: 'Open Quick Checkout',
      sticky_mobile_order_now: 'Order Now - Pay on Delivery',
      product_checkout_open: 'Open Checkout',
    };

    trackAnalyticsButtonClick({
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: source,
      buttonLabel: sourceLabelMap[source] ?? source,
    });
    trackAnalyticsEvent({
      type: 'checkout_open',
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      metadata: {
        source,
      },
    });
    setIsCheckoutOpen(true);
  };

  const handlePackageSelect = (quantity: string) => {
    setSelectedPackageQuantity(quantity);
    const selectedPackage = product.sections.offer.packages.find((pkg, index) => {
      const packageQuantity = pkg.title.match(/buy\s+(\d+)/i)?.[1] ?? String(index + 1);
      return packageQuantity === quantity;
    });

    trackAnalyticsButtonClick({
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: 'offer_package_select',
      buttonLabel: selectedPackage?.title ?? 'Select package',
      metadata: {
        quantity,
      },
    });
    trackAnalyticsEvent({
      type: 'package_select',
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: 'offer_package_select',
      buttonLabel: selectedPackage?.title ?? 'Select package',
      metadata: {
        quantity,
      },
    });

    trackSubscriberActivity({
      type: 'package_selected',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      pagePath: `/product/${product.slug}`,
      packageTitle: selectedPackage?.title ?? '',
    });
    document.getElementById('order-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-0">
      <TopDropOfferAlerts
        enabled={!isCheckoutOpen && product.sections.alerts.visible}
        items={product.sections.alerts.items}
        currentProductName={product.name}
        isDark={isDark}
        genderTarget={product.genderTarget}
        customerIdentityPools={product.customerIdentityPools}
      />
      <main>
        {product.sections.hero.visible && <Hero product={product} onBuyNow={openCheckout} />}
        {product.sections.seeInAction.visible && (
          <ProductVideoPlaceholder
            title={product.sections.seeInAction.title}
            subtitle={product.sections.seeInAction.subtitle}
            poster={product.sections.seeInAction.poster || product.sections.hero.image || product.image}
            videoSrc={product.sections.seeInAction.video}
            aspectRatio={product.sections.seeInAction.ratio}
          />
        )}
        {product.sections.headline.visible && <ProductHeadlineTextSection product={product} />}
        {product.sections.featureMarquee.visible && (
          <ProductFeaturesMarquee product={product} onBuyNow={openCheckout} />
        )}
        {product.sections.problem.visible && <Problem product={product} />}
        {product.sections.solution.visible && <Solution product={product} onBuyNow={openCheckout} />}
        {product.sections.features.visible && <Features product={product} />}
        {product.sections.howItWorks.visible && <HowItWorks product={product} />}
        {product.sections.showcase.visible && <ProductShowcase product={product} />}
        {product.sections.testimonials.visible && <SocialProof product={product} />}
        {product.sections.footerVideo.visible && (
          <ProductVideoPlaceholder
            title={product.sections.footerVideo.title}
            subtitle={product.sections.footerVideo.subtitle}
            poster={product.sections.footerVideo.poster || product.sections.solution.image || product.image}
            videoSrc={product.sections.footerVideo.video}
            aspectRatio={product.sections.footerVideo.ratio}
          />
        )}
        {product.sections.subscription.visible && (
          <EmailSubscription
            productName={product.name}
            productSlug={product.slug}
            title={product.sections.subscription.title}
            subtitle={product.sections.subscription.subtitle}
            buttonLabel={product.sections.subscription.buttonLabel}
            privacyNote={product.sections.subscription.privacyNote}
          />
        )}
        {product.sections.offer.visible && (
          <SpecialOffer
            onBuyNow={openCheckout}
            onSelectPackage={handlePackageSelect}
            product={product}
            selectedPackageQuantity={selectedPackageQuantity}
          />
        )}
        <OrderForm
          product={product}
          selectedPackage={selectedPackageQuantity}
          onPackageChange={setSelectedPackageQuantity}
        />
        {product.sections.faq.visible && <FAQ product={product} />}

        {recommendedProducts.length > 0 && (
          <ScrollReveal>
            <section className="bg-gray-50 py-16 md:py-24 border-t border-gray-200">
              <div className="container mx-auto px-4">
                <div className="mb-8 text-center md:mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Explore More Products
                  </h2>
                  <p className="mx-auto max-w-2xl text-base text-gray-600 md:text-xl">
                    You might also like these quality items
                  </p>
                </div>

                <div className="-mx-4 mb-8 overflow-x-auto px-4 pb-3">
                  <div className="flex gap-4 md:gap-5">
                  {recommendedProducts.map((recProduct) => (
                    <Card
                      key={recProduct.id}
                      padding="none"
                      hover
                      className="w-[15rem] flex-none overflow-hidden rounded-[1.5rem] border-gray-200 shadow-[0_12px_30px_rgba(15,23,42,0.08)] md:w-[17rem]"
                    >
                      <ImageWithFallback
                        src={recProduct.image}
                        alt={recProduct.name}
                        className="h-36 w-full object-cover md:h-40"
                      />
                      <div className="p-4 md:p-5">
                        <h3 className="mb-2 line-clamp-2 text-base font-bold text-gray-900 md:text-lg">
                          {recProduct.name}
                        </h3>
                        <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                          {recProduct.shortDescription}
                        </p>
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-lg font-bold text-[#0E7C7B] md:text-xl">
                            {formatPrice(recProduct.price, recProduct.currencyCode)}
                          </p>
                        </div>
                        <Link
                          to={`/product/${recProduct.slug}`}
                          onClick={() =>
                            trackAnalyticsButtonClick({
                              pagePath: `/product/${product.slug}`,
                              pageType: 'product',
                              productId: product.id,
                              productSlug: product.slug,
                              productName: product.name,
                              buttonId: 'recommended_product_view',
                              buttonLabel: recProduct.name,
                              metadata: {
                                targetProductSlug: recProduct.slug,
                              },
                            })
                          }
                        >
                          <Button variant="primary" size="sm" fullWidth className="rounded-2xl">
                            View Product
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    to="/"
                    onClick={() =>
                      trackAnalyticsButtonClick({
                        pagePath: `/product/${product.slug}`,
                        pageType: 'product',
                        productId: product.id,
                        productSlug: product.slug,
                        productName: product.name,
                        buttonId: 'view_all_products',
                        buttonLabel: 'View All Products',
                      })
                    }
                  >
                    <Button variant="secondary" size="lg">
                      View All Products
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}
      </main>

      <Footer />
      <FloatingStorefrontActions className="bottom-24 sm:bottom-6" product={product} />
      <StickyMobileCTA onBuyNow={openCheckout} captions={mobileStickyCtaCaptions} />
      <CheckoutSheet
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        product={product}
      />
    </div>
  );
}
