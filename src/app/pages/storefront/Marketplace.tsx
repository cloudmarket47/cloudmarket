import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Flame,
  House,
  LayoutGrid,
  Menu,
  Moon,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Truck,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ScrollReveal } from '../../components/animations/ScrollReveal';
import { Footer } from '../../components/Footer';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { MarketplaceBottomNav, type MarketplaceMobileNavTab } from '../../components/storefront/MarketplaceBottomNav';
import { MarketplaceCategorySheet } from '../../components/storefront/MarketplaceCategorySheet';
import { MarketplaceProductCard } from '../../components/storefront/MarketplaceProductCard';
import { MarketplacePromoHero } from '../../components/storefront/MarketplacePromoHero';
import { StorefrontReloadNotice } from '../../components/storefront/StorefrontReloadNotice';
import {
  buildMarketplaceTrendingKeywords,
  type CategoryFilterItem,
  formatMarketplaceCountdownParts,
  getMarketplaceProductImage,
  getMarketplaceProductPricing,
  marketplaceCategoryIconMap,
  marketplaceCategorySurfaceMap,
} from '../../components/storefront/marketplaceShared';
import { Switch } from '../../components/ui/switch';
import { useLocale } from '../../context/LocaleContext';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../../lib/analyticsTelemetry';
import { useBrandingSettings } from '../../lib/branding';
import {
  filterProductsByCategory,
  getCategoryRoutePath,
  PRODUCT_CATEGORIES,
  resolveCategoryFilter,
} from '../../lib/productCategories';
import {
  loadStorefrontProducts,
  STOREFRONT_PRODUCTS_CHANGE_EVENT,
} from '../../lib/storefrontProducts';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';

const PRODUCTS_PER_PAGE = 6;
const FLASH_SALE_DURATION_MS = ((2 * 60) + 14) * 60 * 1000 + 33 * 1000;
const MARKETPLACE_THEME_COOKIE = 'nf_marketplace_theme';

type MarketplaceThemeMode = 'light' | 'dark';

const readMarketplaceTheme = (): MarketplaceThemeMode => {
  if (typeof document === 'undefined') {
    return 'light';
  }

  const cookieValue = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${MARKETPLACE_THEME_COOKIE}=`))
    ?.split('=')
    .at(1);

  if (cookieValue === 'dark' || cookieValue === 'light') {
    return cookieValue;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const writeMarketplaceTheme = (themeMode: MarketplaceThemeMode) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${MARKETPLACE_THEME_COOKIE}=${themeMode}; path=/; max-age=31536000; samesite=lax`;
};

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const matchesSearch = (product: Product, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    product.name,
    product.category,
    product.subcategory ?? '',
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

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2B63D9] dark:text-[#8ab4ff]">
          {eyebrow}
        </p>
        <div className="space-y-1">
          <h2 className="text-[1.75rem] font-black tracking-[-0.03em] text-slate-950 sm:text-[2.1rem] dark:text-white">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function Marketplace() {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const branding = useBrandingSettings();
  const {
    countryName,
    formatPrice,
  } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMobileTab, setActiveMobileTab] = useState<MarketplaceMobileNavTab>('home');
  const [themeMode, setThemeMode] = useState<MarketplaceThemeMode>(() => readMarketplaceTheme());
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [storefrontError, setStorefrontError] = useState<string | null>(null);
  const [flashSaleEndsAt] = useState(() => Date.now() + FLASH_SALE_DURATION_MS);
  const [flashSaleRemaining, setFlashSaleRemaining] = useState(() => flashSaleEndsAt - Date.now());
  const isDarkMode = themeMode === 'dark';

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
          setStorefrontError('We could not load the homepage catalog from Supabase. Please reload the page and try again.');
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
      setStorefrontError('We could not load the homepage catalog from Supabase. Please reload the page and try again.');
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoadingProducts, storefrontError]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setFlashSaleRemaining(Math.max(0, flashSaleEndsAt - Date.now()));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [flashSaleEndsAt]);

  useEffect(() => {
    writeMarketplaceTheme(themeMode);
  }, [themeMode]);

  const publishedProducts = useMemo(() => storefrontProducts, [storefrontProducts]);
  const activeFilter = useMemo(() => resolveCategoryFilter(categorySlug), [categorySlug]);
  const categoryScopedProducts = useMemo(
    () => filterProductsByCategory(publishedProducts, categorySlug ?? 'all'),
    [categorySlug, publishedProducts],
  );
  const visibleProducts = useMemo(
    () => categoryScopedProducts.filter((product) => matchesSearch(product, searchQuery)),
    [categoryScopedProducts, searchQuery],
  );
  const categoryFilters = useMemo<CategoryFilterItem[]>(
    () =>
      PRODUCT_CATEGORIES.map((category) => ({
        ...category,
        productCount: filterProductsByCategory(publishedProducts, category.slug).length,
        subcategories: category.subcategories.map((subcategory) => ({
          ...subcategory,
          productCount: filterProductsByCategory(publishedProducts, subcategory.slug).length,
        })),
      })),
    [publishedProducts],
  );
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(
    () => visibleProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE),
    [currentPage, visibleProducts],
  );
  const trendingProducts = useMemo(
    () =>
      [...(visibleProducts.length > 0 ? visibleProducts : publishedProducts)]
        .sort(
          (left, right) =>
            right.orders - left.orders ||
            right.views - left.views ||
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 4),
    [publishedProducts, visibleProducts],
  );
  const recommendedProducts = useMemo(
    () =>
      [...publishedProducts]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6),
    [publishedProducts],
  );
  const heroProducts = useMemo(
    () =>
      [...publishedProducts]
        .sort(
          (left, right) =>
            right.orders - left.orders ||
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 3),
    [publishedProducts],
  );
  const heroVisuals = useMemo(() => {
    const brandingImages = branding.homepageHighlightImages
      .filter((image) => image.trim())
      .map((image, index) => ({
      image,
      name: `${branding.companyName} highlight ${index + 1}`,
      href: '/',
    }));
    const productImages = heroProducts.map((product) => ({
      image: getMarketplaceProductImage(product),
      name: product.name,
      href: `/product/${product.slug}`,
    }));
    const fallbackVisual = {
      image: branding.logoUrl,
      name: branding.companyName,
      href: '/',
    };

    if (brandingImages.length > 0) {
      return brandingImages;
    }

    const visuals = productImages.filter((item) => item.image).slice(0, 5);
    return visuals.length > 0 ? visuals : [fallbackVisual];
  }, [branding.companyName, branding.homepageHighlightImages, branding.logoUrl, heroProducts]);
  const highestDiscount = useMemo(
    () => Math.max(15, ...publishedProducts.map((product) => getMarketplaceProductPricing(product).discountPercentage)),
    [publishedProducts],
  );
  const flashSaleProduct = useMemo(
    () =>
      [...publishedProducts].sort(
        (left, right) =>
          getMarketplaceProductPricing(right).discountPercentage -
          getMarketplaceProductPricing(left).discountPercentage,
      )[0] ?? null,
    [publishedProducts],
  );
  const flashSaleParts = useMemo(
    () => formatMarketplaceCountdownParts(flashSaleRemaining),
    [flashSaleRemaining],
  );
  const searchSuggestions = useMemo(
    () =>
      searchQuery.trim().length < 2
        ? []
        : visibleProducts.slice(0, 6).map((product) => ({
            id: product.id,
            title: product.name,
            subtitle: product.category,
            href: `/product/${product.slug}`,
          })),
    [searchQuery, visibleProducts],
  );
  const trendingKeywords = useMemo(
    () => buildMarketplaceTrendingKeywords(publishedProducts),
    [publishedProducts],
  );
  const heroBenefitItems = useMemo(
    () => [
      { icon: Flame, label: `Up to ${highestDiscount}% Off Today` },
      { icon: Truck, label: `Fast Delivery in ${countryName}` },
      { icon: BadgeCheck, label: 'Pay on Delivery' },
    ],
    [countryName, highestDiscount],
  );
  const announcementItems = useMemo(
    () => [
      { icon: Flame, label: `Up to ${highestDiscount}% Off Today` },
      { icon: Truck, label: `Fast Delivery in ${countryName}` },
      { icon: BadgeCheck, label: 'Pay on Delivery' },
      { icon: ShieldCheck, label: 'Verified sellers across key categories' },
      { icon: RotateCcw, label: 'Easy returns on eligible orders' },
      { icon: LayoutGrid, label: 'Category picks refreshed for faster shopping' },
      { icon: ShoppingCart, label: 'Simple order flow built for quick checkout' },
      { icon: Sparkles, label: 'Fresh deals and featured drops added often' },
      { icon: Flame, label: `Top storefront picks curated for ${countryName}` },
      { icon: BadgeCheck, label: 'Local pricing and delivery-first shopping' },
    ],
    [countryName, highestDiscount],
  );
  const trustBadgeItems = useMemo(
    () => [
      { icon: ShieldCheck, label: 'Pay on Delivery' },
      { icon: Truck, label: 'Fast Delivery' },
      { icon: RotateCcw, label: 'Easy Returns' },
      { icon: BadgeCheck, label: 'Verified Sellers' },
    ],
    [],
  );
  const sidebarLinks = [
    { title: 'Home', description: 'Jump back to the top banner.', target: 'top', icon: House },
    {
      title: 'Categories',
      description: 'Browse category cards and quick filters.',
      target: 'categories',
      icon: LayoutGrid,
    },
    {
      title: 'Trending',
      description: 'Open the hottest products right now.',
      target: 'trending',
      icon: Flame,
    },
    {
      title: 'Search',
      description: 'Use search and trending keywords.',
      target: 'search-panel',
      icon: Search,
    },
  ];
  const hasPublishedProducts = publishedProducts.length > 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [categorySlug, searchQuery]);

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const shouldLockBody = isSidebarOpen || isCategorySheetOpen;
    document.body.style.overflow = shouldLockBody ? 'hidden' : originalOverflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
        setIsCategorySheetOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategorySheetOpen, isSidebarOpen]);

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
        resultsCount: visibleProducts.length,
        metadata: {
          mode: 'live',
        },
      });
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, visibleProducts.length]);

  const handleSidebarOpen = () => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: 'homepage_menu_open',
      buttonLabel: 'Menu',
    });
    setActiveMobileTab('home');
    setIsSidebarOpen(true);
  };

  const handleCategoryFilterChange = (filterSlug: string | null, label: string) => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: `homepage_category_${(filterSlug ?? 'all').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      buttonLabel: label,
    });

    navigate(getCategoryRoutePath(filterSlug));
    window.setTimeout(() => {
      scrollToSection('products');
    }, 0);
  };

  const handleResetFilters = () => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: 'homepage_reset_filters',
      buttonLabel: 'Reset filters',
    });
    setSearchQuery('');
    navigate('/');
  };

  const handleSearchSubmit = (section: 'hero' | 'search') => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: `homepage_${section}_search_submit`,
      buttonLabel: section === 'hero' ? 'Shop Now' : 'Search products',
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
          mode: section,
        },
      });
    }

    scrollToSection('products');
  };

  const handleSuggestionSelect = (title: string) => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      buttonId: 'homepage_search_suggestion',
      buttonLabel: title,
      searchQuery: searchQuery.trim(),
      resultsCount: visibleProducts.length,
    });
    setSearchQuery('');
  };

  const handleOpenProduct = (product: Product, section: string) => {
    trackAnalyticsButtonClick({
      pagePath: '/',
      pageType: 'marketplace',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: `homepage_${section}`,
      buttonLabel: product.name,
      metadata: {
        section,
      },
    });
  };

  if (storefrontError) {
    return (
      <StorefrontReloadNotice
        title="Unable to load the homepage"
        message={storefrontError}
      />
    );
  }

  if (isLoadingProducts) {
    return (
      <div className={cn('flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 text-center', isDarkMode && 'dark bg-[#081225]')}>
        <div className="w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-[#e6efff]" />
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Loading storefront
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Preparing the shopping experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="top"
      className={cn(
        'min-h-screen bg-[#f5f7fb] pb-36 text-slate-950 md:pb-10',
        isDarkMode && 'dark bg-[#081225] text-slate-100',
      )}
    >
      {isSidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[55] bg-slate-950/45 backdrop-blur-sm"
          />
          <aside className="fixed left-0 top-0 z-[60] h-full w-full max-w-sm overflow-y-auto border-r border-slate-200 bg-white px-5 py-5 shadow-[0_28px_70px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#edf3ff] shadow-sm">
                  <ImageWithFallback
                    src={branding.logoUrl}
                    alt={`${branding.companyName} logo`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                    {branding.companyName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mobile shopping menu</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 rounded-[2rem] bg-[linear-gradient(145deg,#0d2f78_0%,#2B63D9_65%,#76a7ff_100%)] p-5 text-white shadow-[0_20px_44px_rgba(43,99,217,0.28)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                Shop summary
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{branding.companyName}</h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/82">
                Quick access to trending deals, category filters, search, and the product grid.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Navigate
              </p>
              {sidebarLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      window.setTimeout(() => {
                        scrollToSection(item.target);
                      }, 0);
                    }}
                    className="flex w-full items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2B63D9] shadow-sm dark:bg-slate-800 dark:text-[#9fc0ff]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </>
      ) : null}

      {isCategorySheetOpen ? (
        <MarketplaceCategorySheet
          activeFilterSlug={activeFilter.filterSlug}
          categoryFilters={categoryFilters}
          onClose={() => setIsCategorySheetOpen(false)}
          onSelectCategory={handleCategoryFilterChange}
        />
      ) : null}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleSidebarOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/"
            className="min-w-0 text-center text-[1.1rem] font-black tracking-[0.08em] text-[#1d3f8f] sm:text-[1.25rem] dark:text-[#b8d0ff]"
          >
            CLOUDMARKET
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveMobileTab('search');
                scrollToSection('search-panel');
              }}
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 sm:inline-flex"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" />
            </button>

            <div className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <Sun className={cn('h-4 w-4', isDarkMode ? 'text-slate-500' : 'text-amber-500')} />
              <Switch
                checked={isDarkMode}
                onCheckedChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
                aria-label="Toggle light and dark mode"
                className="data-[state=checked]:bg-[#2B63D9]"
              />
              <Moon className={cn('h-4 w-4', isDarkMode ? 'text-[#8ab4ff]' : 'text-slate-400')} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 pt-4 sm:px-6 sm:pt-5">
        <ScrollReveal>
          <MarketplacePromoHero
            brandName={branding.companyName}
            heroVisuals={heroVisuals}
            heroBenefitItems={heroBenefitItems}
            announcementItems={announcementItems}
            onShopNow={() => handleSearchSubmit('hero')}
            onExploreCategories={() => {
              setActiveMobileTab('categories');
              scrollToSection('categories');
            }}
          />
        </ScrollReveal>

        <ScrollReveal>
          <section id="categories" className="space-y-4">
            <SectionHeading
              eyebrow="Browse"
              title="Categories"
              description="Move fast with card-based category shortcuts built for quick product discovery."
            />

            <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max gap-3">
                {categoryFilters.map((category) => {
                  const Icon = marketplaceCategoryIconMap[category.icon];
                  const categoryImage = branding.homepageCategoryImages[category.slug] ?? '';

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryFilterChange(category.slug, category.name)}
                      className={cn(
                        'w-[108px] shrink-0 rounded-[1.55rem] border border-slate-200 bg-white p-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950',
                        activeFilter.filterSlug === category.slug && 'border-[#bcd4ff] shadow-[0_18px_40px_rgba(43,99,217,0.12)] dark:border-[#315ea8]',
                      )}
                    >
                      <div className={cn('flex h-16 w-full items-center justify-center overflow-hidden rounded-[1.2rem] bg-gradient-to-br', marketplaceCategorySurfaceMap[category.icon])}>
                        {categoryImage ? (
                          <ImageWithFallback
                            src={categoryImage}
                            alt={category.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Icon className="h-7 w-7 text-[#2B63D9]" />
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                        {category.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{category.productCount} items</p>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsCategorySheetOpen(true)}
                  className="w-[108px] shrink-0 rounded-[1.55rem] border border-slate-200 bg-[linear-gradient(180deg,#f7faff_0%,#edf3ff_100%)] p-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] active:scale-[0.98] dark:border-slate-800 dark:bg-[linear-gradient(180deg,#0d203f_0%,#12305f_100%)]"
                >
                  <div className="flex h-16 w-full items-center justify-center rounded-[1.2rem] bg-white text-[#2B63D9] shadow-sm dark:bg-slate-950 dark:text-[#9fc0ff]">
                    <LayoutGrid className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                    All Categories
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Open full filter</p>
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section id="trending" className="space-y-4">
            <SectionHeading
              eyebrow="Hot products"
              title="Trending Now 🔥"
              description={
                searchQuery.trim()
                  ? `Showing products that match "${searchQuery.trim()}".`
                  : activeFilter.kind !== 'all'
                    ? `Trending picks inside ${activeFilter.label}.`
                    : 'The products most likely to convert right now.'
              }
              action={
                <button
                  type="button"
                  onClick={() => scrollToSection('products')}
                  className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </button>
              }
            />

            {trendingProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {trendingProducts.map((product) => (
                    <MarketplaceProductCard
                      key={`trending-${product.id}`}
                      product={product}
                      formatPrice={formatPrice}
                      onOpenProduct={handleOpenProduct}
                    />
                  ))}
              </div>
            ) : (
              <div className="rounded-[1.9rem] border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <p className="text-xl font-black text-slate-950 dark:text-white">Trending products will appear here</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Publish products in the admin dashboard and the storefront will automatically fill this section.
                </p>
              </div>
            )}
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section id="search-panel" className="space-y-4">
            <SectionHeading
              eyebrow="Search"
              title="Find what you want quickly"
              description="Use live product search, tap a trending keyword, or open category filters from the search panel."
            />

            <div className="rounded-[1.9rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-5 dark:border-slate-800 dark:bg-slate-950">
              <form
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  handleSearchSubmit('search');
                }}
                className="space-y-4"
              >
                <div className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <Search className="h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products..."
                    className="h-full w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCategorySheetOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600"
                    aria-label="Open filters"
                  >
                    <SlidersHorizontal className="h-4.5 w-4.5" />
                  </button>

                  {searchSuggestions.length > 0 ? (
                    <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden rounded-[1.55rem] border border-slate-200 bg-white p-2 shadow-[0_22px_54px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-950">
                      {searchSuggestions.map((suggestion) => (
                        <Link
                          key={suggestion.id}
                          to={suggestion.href}
                          onClick={() => handleSuggestionSelect(suggestion.title)}
                          className="flex items-start justify-between gap-3 rounded-[1rem] px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {suggestion.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {suggestion.subtitle}
                            </p>
                          </div>
                          <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Trending:</span>
                  {trendingKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => {
                        setSearchQuery(keyword);
                        window.setTimeout(() => handleSearchSubmit('search'), 0);
                      }}
                      className="rounded-full bg-[#eef3fb] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#e4edfb] active:scale-[0.98] dark:bg-[#12305f] dark:text-[#d7e6ff] dark:hover:bg-[#183d76]"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section id="flash-sale" className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(130deg,#0f3d9b_0%,#2B63D9_55%,#7aaeff_100%)] p-5 text-white shadow-[0_24px_60px_rgba(43,99,217,0.24)] sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                    <Flame className="h-3.5 w-3.5" />
                    Flash sale
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-[2.3rem]">
                      Flash Sale
                    </h2>
                    <p className="max-w-xl text-sm leading-7 text-white/82 sm:text-base">
                      Ends in {flashSaleParts.hours}:{flashSaleParts.minutes}:{flashSaleParts.seconds}.
                      {flashSaleProduct ? ` ${flashSaleProduct.name} is leading this deal window right now.` : ' Deal slots refresh throughout the day.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  {flashSaleProduct ? (
                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-[1.4rem] bg-white/10">
                        <ImageWithFallback
                          src={getMarketplaceProductImage(flashSaleProduct)}
                          alt={flashSaleProduct.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                          Best discount
                        </p>
                        <p className="mt-2 line-clamp-2 text-lg font-bold text-white">
                          {flashSaleProduct.name}
                        </p>
                        <p className="mt-2 text-sm text-white/75">
                          Save up to {getMarketplaceProductPricing(flashSaleProduct).discountPercentage}% on this page.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-white/75">
                      Once products are published, the strongest discount will be highlighted automatically.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section id="trust" className="space-y-4">
            <SectionHeading
              eyebrow="Confidence"
              title="Why shoppers trust CLOUDMARKET"
              description="Compact trust points that keep the storefront moving without turning the homepage into a long sales page."
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trustBadgeItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_14px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff] text-[#2B63D9] dark:bg-[#12305f] dark:text-[#9fc0ff]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section id="products" className="space-y-5">
            <SectionHeading
              eyebrow="Catalog"
              title="More to Explore"
              description={
                searchQuery.trim()
                  ? `Showing ${visibleProducts.length} result${visibleProducts.length === 1 ? '' : 's'} for "${searchQuery.trim()}".`
                  : activeFilter.kind !== 'all'
                    ? `Browsing ${activeFilter.label} with ${visibleProducts.length} product${visibleProducts.length === 1 ? '' : 's'} available.`
                    : 'A clean product grid built to keep browsing fast on mobile.'
              }
              action={
                (activeFilter.kind !== 'all' || searchQuery.trim()) ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
                  >
                    Reset filters
                    <RotateCcw className="h-4 w-4" />
                  </button>
                ) : undefined
              }
            />

            {paginatedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {paginatedProducts.map((product) => (
                    <MarketplaceProductCard
                      key={`catalog-${product.id}`}
                      product={product}
                      formatPrice={formatPrice}
                      onOpenProduct={handleOpenProduct}
                    />
                  ))}
                </div>

                {totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.7rem] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'h-10 w-10 rounded-full text-sm font-semibold transition',
                            page === currentPage
                              ? 'bg-[#2B63D9] text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600',
                          )}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {hasPublishedProducts ? 'No matching products' : 'No products available yet'}
                </p>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {hasPublishedProducts
                    ? 'Try a broader search term, switch categories, or reset the filters to reopen the full grid.'
                    : 'This storefront is ready. Add product pages from the admin dashboard and the homepage catalog will fill automatically.'}
                </p>
              </div>
            )}
          </section>
        </ScrollReveal>

        {recommendedProducts.length > 0 ? (
          <ScrollReveal>
            <section id="recommended" className="space-y-4">
              <SectionHeading
                eyebrow="Fresh picks"
                title="Recommended for you"
                description="Newer product pages that keep the storefront feeling active and current."
              />

              <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-4">
                  {recommendedProducts.map((product) => {
                    const pricing = getMarketplaceProductPricing(product);

                    return (
                      <article
                        key={`recommended-${product.id}`}
                        className="w-[280px] shrink-0 rounded-[1.7rem] border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950"
                      >
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={() => handleOpenProduct(product, 'recommended_strip')}
                          className="block"
                        >
                          <div className="overflow-hidden rounded-[1.35rem] bg-slate-100">
                            <ImageWithFallback
                              src={getMarketplaceProductImage(product)}
                              alt={product.name}
                              className="aspect-[4/3] w-full object-cover transition duration-500 hover:scale-105"
                            />
                          </div>
                        </Link>
                        <div className="space-y-2 px-1 pb-1 pt-3">
                          <p className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-[#d73d32]">
                              {formatPrice(pricing.currentPrice, product.currencyCode)}
                            </span>
                            <span className="text-sm text-slate-400 line-through">
                              {formatPrice(pricing.oldPrice, product.currencyCode)}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </ScrollReveal>
        ) : null}

        <Footer />
      </main>

      <MarketplaceBottomNav
        activeTab={activeMobileTab}
        onTabChange={setActiveMobileTab}
        onHome={() => {
          setActiveMobileTab('home');
          scrollToSection('top');
        }}
        onCategories={() => {
          setActiveMobileTab('categories');
          setIsCategorySheetOpen(true);
        }}
        onSearch={() => scrollToSection('search-panel')}
      />
    </div>
  );
}
