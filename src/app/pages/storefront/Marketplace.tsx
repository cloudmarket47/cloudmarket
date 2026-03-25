import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  CreditCard,
  Headphones,
  LayoutGrid,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../../components/animations/ScrollReveal';
import { Footer } from '../../components/Footer';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { MarketplaceCollectionsCarousel } from '../../components/storefront/MarketplaceCollectionsCarousel';
import { MarketplaceHero } from '../../components/storefront/MarketplaceHero';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../../lib/analyticsTelemetry';
import { useBrandingSettings } from '../../lib/branding';
import { loadStorefrontProducts } from '../../lib/storefrontProducts';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const matchesSearch = (product: Product, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    product.name,
    product.shortDescription,
    product.sections.hero.title,
    product.sections.hero.subtitle,
    product.sections.solution.title,
    product.sections.solution.description,
    product.sections.offer.badge,
    product.sections.offer.packages.map((bundle) => bundle.title).join(' '),
    product.sections.features.items.map((item) => item.title).join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
};

export function Marketplace() {
  const branding = useBrandingSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All categories');
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    let isActive = true;

    void loadStorefrontProducts()
      .then((products) => {
        if (isActive) {
          setStorefrontProducts(products);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProducts(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const publishedProducts = useMemo(
    () => storefrontProducts.filter((product) => product.status === 'published'),
    [storefrontProducts],
  );
  const hasPublishedProducts = publishedProducts.length > 0;
  const liveSearchResultCount = useMemo(
    () => publishedProducts.filter((product) => matchesSearch(product, searchQuery)).length,
    [publishedProducts, searchQuery],
  );
  const categoryFilters = ['All categories', ...Array.from(new Set(publishedProducts.map((product) => product.category.trim() || 'General')))];
  const visibleProducts = publishedProducts.filter((product) => {
    const matchesCategory =
      activeCategory === 'All categories' ||
      (product.category.trim() || 'General') === activeCategory;

    return matchesCategory && matchesSearch(product, searchQuery);
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = isSidebarOpen ? 'hidden' : originalOverflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      trackAnalyticsEvent({
        type: 'search_query',
        pagePath: '/',
        pageType: 'marketplace',
        searchQuery: normalizedQuery,
        resultsCount: liveSearchResultCount,
        metadata: {
          mode: 'live',
        },
      });
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [liveSearchResultCount, searchQuery]);

  if (isLoadingProducts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md space-y-3 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Loading products</h1>
          <p className="text-sm text-slate-600">
            Fetching the live catalog from Supabase.
          </p>
        </div>
      </div>
    );
  }

  const bestSellers = [...publishedProducts].sort((left, right) => right.orders - left.orders);
  const latestProducts = [...publishedProducts].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const sidebarLinks = [
    {
      title: 'Homepage',
      description: 'Back to the marketplace hero.',
      href: '#top',
      icon: LayoutGrid,
    },
    {
      title: 'Highlights',
      description: 'Open top products and new launches.',
      href: '#collections',
      icon: TrendingUp,
    },
    {
      title: 'All products',
      description: 'Browse the full product selection.',
      href: '#products',
      icon: ShoppingBag,
    },
    {
      title: 'Support',
      description: 'Delivery and shopping help in one place.',
      href: '#why-shop',
      icon: Headphones,
    },
  ];
  const trustPoints = [
    {
      title: 'Free nationwide delivery',
      description: 'Fast shipping across Nigeria.',
      icon: ShoppingBag,
    },
    {
      title: 'Pay on delivery',
      description: 'Customers can inspect orders first.',
      icon: CreditCard,
    },
    {
      title: '7-day satisfaction guarantee',
      description: 'Support stays straightforward.',
      icon: ShieldCheck,
    },
  ];
  const topProduct = bestSellers[0] ?? null;
  const newestProduct = latestProducts[0] ?? null;

  const handleSidebarOpen = () => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: 'homepage_menu_open',
      buttonLabel: 'Menu',
    });
    setIsSidebarOpen(true);
  };

  const handleSearchSubmit = () => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: 'homepage_browse_products',
      buttonLabel: 'Browse products',
      searchQuery: searchQuery.trim(),
      resultsCount: visibleProducts.length,
    });

    if (searchQuery.trim()) {
      trackAnalyticsEvent({
        type: 'search_query',
        pagePath: '/',
        pageType: 'marketplace',
        searchQuery: searchQuery.trim(),
        resultsCount: visibleProducts.length,
        metadata: {
          mode: 'submit',
        },
      });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      {isSidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[55] bg-slate-950/40 backdrop-blur-sm"
          />
          <aside
            aria-label="User sidebar"
            aria-modal="true"
            role="dialog"
            className="fixed left-0 top-0 z-[60] h-full w-full max-w-sm overflow-y-auto border-r border-slate-200 bg-white px-5 py-5 shadow-[0_28px_70px_rgba(15,23,42,0.22)] sm:px-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
                  <ImageWithFallback src={branding.logoUrl} alt={`${branding.companyName} logo`} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-950">{branding.companyName}</p>
                  <p className="text-xs text-slate-500">Product index and highlights</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close user sidebar"
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 rounded-[2rem] bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950">
                  <ImageWithFallback src={branding.logoUrl} alt={`${branding.companyName} mark`} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Shop summary</p>
                  <h2 className="mt-1 text-2xl font-black">{branding.companyName}</h2>
                  <p className="mt-1 text-sm text-slate-300">A simple product shop built to help visitors browse and order easily.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/5 px-4 py-4">
                  <p className="text-sm font-semibold text-white">Easy product browsing</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Search the shop, filter by category, and open any product in one tap.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-4">
                  <p className="text-sm font-semibold text-white">Single-seller shopping</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Everything here comes from one seller, with one consistent ordering experience.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Quick Access</p>
              <div className="mt-4 space-y-3">
                {sidebarLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.title}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <ScrollReveal>
        <MarketplaceHero
          products={publishedProducts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSidebar={handleSidebarOpen}
          onSearchSubmit={handleSearchSubmit}
        />
      </ScrollReveal>

      <ScrollReveal>
        <section id="collections" className="py-14 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <MarketplaceCollectionsCarousel />
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section
          id="products"
          className="border-y border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] py-14 md:py-16"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.05)] md:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  All products
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Shop by category
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  {searchQuery.trim()
                    ? `Showing products that match "${searchQuery.trim()}"${activeCategory !== 'All categories' ? ` in ${activeCategory}` : ''}.`
                    : 'Choose a category and open the product that fits what you need.'}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {categoryFilters.map((category) => {
                  const isActive = category === activeCategory;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        trackAnalyticsButtonClick({
                          pagePath: '/',
                          pageType: 'marketplace',
                          buttonId: `homepage_category_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                          buttonLabel: category,
                        });
                        setActiveCategory(category);
                      }}
                      className={cn(
                        'rounded-full px-5 py-3 text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white',
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {visibleProducts.length > 0 ? (
                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <article
                      key={product.id}
                      className="group overflow-hidden rounded-[1.9rem] border border-slate-200 bg-slate-50 shadow-sm transition-transform duration-300 hover:-translate-y-1"
                    >
                      <Link to={`/product/${product.slug}`} className="block">
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          <ImageWithFallback
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute left-4 top-4">
                            <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                              {product.category}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="p-5">
                        <h3 className="text-xl font-bold tracking-tight text-slate-950">
                          {product.name}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {product.shortDescription}
                        </p>

                        <Link
                          to={`/product/${product.slug}`}
                          onClick={() => {
                            trackAnalyticsButtonClick({
                              pagePath: '/',
                              pageType: 'marketplace',
                              productId: product.id,
                              productSlug: product.slug,
                              productName: product.name,
                              buttonId: 'homepage_open_product',
                              buttonLabel: 'Open page',
                              searchQuery: searchQuery.trim(),
                              resultsCount: visibleProducts.length,
                              metadata: {
                                section: 'catalog_grid',
                                category: product.category,
                              },
                            });
                          }}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2B63D9] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f56c6]"
                        >
                          Open page
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <h3 className="text-xl font-bold text-slate-950">
                    {hasPublishedProducts ? 'No matching products' : 'No products published yet'}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {hasPublishedProducts
                      ? 'Try a broader search term or switch to another category.'
                      : 'The catalog is ready and this page will automatically update once products are published.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      trackAnalyticsButtonClick({
                        pagePath: '/',
                        pageType: 'marketplace',
                        buttonId: 'homepage_reset_filters',
                        buttonLabel: 'Reset filters',
                      });
                      setSearchQuery('');
                      setActiveCategory('All categories');
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Reset filters
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section id="why-shop" className="pb-6 pt-14 md:pb-8 md:pt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.05)] md:p-8">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[2.1rem] bg-slate-950 p-8 text-white shadow-[0_18px_48px_rgba(15,23,42,0.22)] md:p-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Why shop with us
                  </div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                    Built to make product discovery and ordering feel simple.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                    {branding.companyName} gives visitors a cleaner path from browsing to checkout.
                    Search products, filter by category, open the right offer, and place orders
                    without clutter or distractions.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                      <p className="text-sm font-semibold text-white">One consistent shopping flow</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Every product follows the same clear path from discovery to order form.
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                      <p className="text-sm font-semibold text-white">Focused on what matters</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Product details, offers, and support stay visible while unnecessary stats stay hidden.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      trackAnalyticsButtonClick({
                        pagePath: '/',
                        pageType: 'marketplace',
                        buttonId: 'homepage_why_shop_browse',
                        buttonLabel: 'Browse all products',
                      });
                      scrollToSection('products');
                    }}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                  >
                    Browse all products
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                  {trustPoints.map((point) => {
                    const Icon = point.icon;
                    return (
                      <article
                        key={point.title}
                        className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#eef4ff] text-[#2B63D9]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-950">
                          {point.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {point.description}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {topProduct ? (
                  <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={topProduct.image}
                        alt={topProduct.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-4 top-4">
                        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                          Top pick
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Most ordered product
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        {topProduct.name}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {topProduct.shortDescription}
                      </p>
                      <Link
                        to={`/product/${topProduct.slug}`}
                        onClick={() => {
                          trackAnalyticsButtonClick({
                            pagePath: '/',
                            pageType: 'marketplace',
                            productId: topProduct.id,
                            productSlug: topProduct.slug,
                            productName: topProduct.name,
                            buttonId: 'homepage_top_product',
                            buttonLabel: 'Open top product',
                            metadata: {
                              section: 'why_shop_top_pick',
                            },
                          });
                        }}
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2B63D9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f56c6]"
                      >
                        Open top product
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ) : (
                  <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={branding.logoUrl}
                        alt={`${branding.companyName} placeholder`}
                        className="h-24 w-24 rounded-3xl object-cover opacity-75"
                      />
                    </div>
                    <div className="p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Most ordered product
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        Coming soon
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        This card will automatically show your top-performing product once orders begin.
                      </p>
                      <button
                        type="button"
                        onClick={() => scrollToSection('products')}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100"
                      >
                        Browse catalog
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                )}

                {newestProduct ? (
                  <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={newestProduct.image}
                        alt={newestProduct.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-4 top-4">
                        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                          New arrival
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Fresh option
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        {newestProduct.name}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {newestProduct.shortDescription}
                      </p>
                      <Link
                        to={`/product/${newestProduct.slug}`}
                        onClick={() => {
                          trackAnalyticsButtonClick({
                            pagePath: '/',
                            pageType: 'marketplace',
                            productId: newestProduct.id,
                            productSlug: newestProduct.slug,
                            productName: newestProduct.name,
                            buttonId: 'homepage_latest_product',
                            buttonLabel: 'View latest product',
                            metadata: {
                              section: 'why_shop_new_arrival',
                            },
                          });
                        }}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100"
                      >
                        View latest product
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ) : (
                  <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={branding.logoUrl}
                        alt={`${branding.companyName} placeholder`}
                        className="h-24 w-24 rounded-3xl object-cover opacity-75"
                      />
                    </div>
                    <div className="p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Fresh option
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        Next launch preview
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        This space will showcase your newest product automatically after publishing.
                      </p>
                      <button
                        type="button"
                        onClick={() => scrollToSection('products')}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100"
                      >
                        Explore homepage
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                )}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <Footer />
    </div>
  );
}
