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
import { CheckoutSheet } from '../../components/CheckoutSheet';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../../lib/analyticsTelemetry';
import { trackSubscriberActivity } from '../../lib/subscriberTelemetry';
import type { Product } from '../../types';

export function ProductPage() {
  const { slug } = useParams();
  const { formatPrice } = useLocale();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPackageQuantity, setSelectedPackageQuantity] = useState('1');
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const product = storefrontProducts.find((p) => p.slug === slug);

  useEffect(() => {
    let isActive = true;

    const syncProducts = async (force = false) => {
      const products = await loadStorefrontProducts(force, { includeDrafts: true }).catch(() => []);

      if (isActive) {
        setStorefrontProducts(products);
        setIsLoadingProducts(false);
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

  if (isLoadingProducts) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Loading product</h1>
          <p className="text-gray-600">Fetching the live product page from Supabase.</p>
        </div>
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
  const isDark = product.displayMode === 'dark';

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
    <div className={`min-h-screen pb-28 md:pb-0 ${isDark ? 'storefront-dark bg-[#050816]' : 'bg-white'}`}>
      <TopDropOfferAlerts
        enabled={!isCheckoutOpen && product.sections.alerts.visible}
        items={product.sections.alerts.items}
        currentProductName={product.name}
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
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Explore More Products
                  </h2>
                  <p className="text-xl text-gray-600">
                    You might also like these quality items
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {recommendedProducts.map((recProduct) => (
                    <Card key={recProduct.id} padding="none" hover>
                      <ImageWithFallback
                        src={recProduct.image}
                        alt={recProduct.name}
                        className="w-full h-48 object-cover rounded-t-xl"
                      />
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {recProduct.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {recProduct.shortDescription}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-2xl font-bold text-[#0E7C7B]">
                            {formatPrice(recProduct.price)}
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
                          <Button variant="primary" size="md" fullWidth>
                            View Product
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
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
      <StickyMobileCTA onBuyNow={openCheckout} />
      <CheckoutSheet
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        product={product}
      />
    </div>
  );
}
