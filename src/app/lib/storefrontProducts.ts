import type { Product } from '../types';
import {
  ensureAdminProductDraftsLoaded,
  readAdminProductDrafts,
  type AdminProductDraft,
} from './adminProductDrafts';
import { emitBrowserEvent } from './supabase';

export const STOREFRONT_PRODUCTS_CHANGE_EVENT = 'cloudmarket-storefront-products-change';

function hasMedia(src: string | undefined) {
  return Boolean(src?.trim());
}

function mapDraftThemeModeToProductTheme(
  themeMode: AdminProductDraft['themeMode'],
): Product['theme'] {
  return themeMode === 'dark' ? 'premium' : 'modern';
}

function toProductImage(draft: AdminProductDraft) {
  return (
    draft.coverImage.src ||
    draft.sections.hero.images.find((image) => hasMedia(image.src))?.src ||
    draft.sections.hero.image.src ||
    draft.sections.solution.image.src ||
    draft.sections.showcase.images.find((image) => hasMedia(image.src))?.src ||
    ''
  );
}

export function adminDraftToProduct(draft: AdminProductDraft): Product {
  const productImage = toProductImage(draft);
  const heroImage =
    draft.sections.hero.images.find((image) => hasMedia(image.src))?.src ||
    draft.sections.hero.image.src ||
    productImage;

  return {
    id: draft.id,
    name: draft.productName,
    category: draft.category,
    slug: draft.slug,
    price: draft.basePrice,
    purchaseCost: draft.purchaseCost,
    currencyCode: draft.currency,
    shortDescription: draft.shortDescription,
    image: productImage,
    status: draft.status,
    views: 0,
    orders: 0,
    theme: mapDraftThemeModeToProductTheme(draft.themeMode),
    displayMode: draft.themeMode,
    createdAt: draft.createdAt,
    sections: {
      hero: {
        visible: draft.sections.hero.visible,
        title: draft.sections.hero.title,
        subtitle: draft.sections.hero.subtitle,
        badge: draft.sections.hero.badge,
        ctaText: draft.sections.hero.ctaText,
        image: heroImage,
        benefits: [...draft.sections.hero.benefits],
        offers: draft.sections.hero.offers.map((item) => ({ ...item })),
      },
      problem: {
        visible: draft.sections.problem.visible,
        title: draft.sections.problem.title,
        subtitle: draft.sections.problem.subtitle,
        problems: draft.sections.problem.items.map((item) => ({
          icon: item.icon,
          title: item.title,
          description: item.description,
        })),
      },
      solution: {
        visible: draft.sections.solution.visible,
        badge: draft.sections.solution.badge,
        title: draft.sections.solution.title,
        description: draft.sections.solution.description,
        image: draft.sections.solution.image.src || productImage,
        features: [...draft.sections.solution.features],
        ctaText: draft.sections.solution.ctaText,
      },
      features: {
        visible: draft.sections.features.visible,
        title: draft.sections.features.title,
        subtitle: draft.sections.features.subtitle,
        items: draft.sections.features.items.map((item) => ({
          icon: item.icon,
          title: item.title,
          description: item.description,
        })),
      },
      howItWorks: {
        visible: draft.sections.aboutProduct.visible,
        title: draft.sections.aboutProduct.title,
        subtitle: draft.sections.aboutProduct.subtitle,
        steps: draft.sections.aboutProduct.items.map((item, index) => ({
          number: index + 1,
          icon: item.icon,
          title: item.title,
          description: item.description,
        })),
      },
      showcase: {
        visible: draft.sections.showcase.visible,
        title: draft.sections.showcase.title,
        subtitle: draft.sections.showcase.subtitle,
        images: draft.sections.showcase.images
          .map((item) => item.src)
          .filter((src): src is string => hasMedia(src)),
      },
      testimonials: {
        visible: draft.sections.testimonials.visible,
        title: draft.sections.testimonials.title,
        subtitle: draft.sections.testimonials.subtitle,
        reviews: draft.sections.testimonials.reviews.map((review) => ({
          name: review.name,
          location: review.location,
          rating: review.rating,
          text: review.text,
          image: review.image.src,
          avatar: review.avatar?.src || review.image.src,
        })),
      },
      offer: {
        visible: draft.sections.offer.visible,
        title: draft.sections.offer.title,
        subtitle: draft.sections.offer.subtitle,
        badge: draft.sections.offer.badge,
        countdownHours: draft.sections.offer.countdownHours,
        packages: draft.sections.offer.packages.map((item) => ({
          title: item.title,
          price: item.price,
          oldPrice: item.oldPrice,
          description: item.description,
          features: [...item.features],
          isBestValue: item.isBestValue,
          image: item.image.src || undefined,
        })),
      },
      orderForm: {
        visible: draft.sections.orderForm.visible,
        title: draft.sections.orderForm.title,
        subtitle: draft.sections.orderForm.subtitle,
        submitButtonLabel: draft.sections.orderForm.submitButtonLabel,
        tokenPrompt: draft.sections.orderForm.tokenPrompt,
        enableTokenField: draft.sections.orderForm.enableTokenField,
        quickCheckoutLabel: draft.sections.orderForm.quickCheckoutLabel,
        orderDetailsLabel: draft.sections.orderForm.orderDetailsLabel,
        packagePreviewLabel: draft.sections.orderForm.packagePreviewLabel,
        childSheetLabel: draft.sections.orderForm.childSheetLabel,
        childSheetTitle: draft.sections.orderForm.childSheetTitle,
        childSheetDescription: draft.sections.orderForm.childSheetDescription,
        changeSelectionLabel: draft.sections.orderForm.changeSelectionLabel,
        summaryLabel: draft.sections.orderForm.summaryLabel,
        totalLabel: draft.sections.orderForm.totalLabel,
        confirmationNote: draft.sections.orderForm.confirmationNote,
      },
      faq: {
        visible: draft.sections.faq.visible,
        title: draft.sections.faq.title,
        subtitle: draft.sections.faq.subtitle,
        items: draft.sections.faq.items.map((item) => ({ ...item })),
      },
    },
  };
}

export function getStorefrontProducts() {
  return readAdminProductDrafts()
    .filter((draft) => draft.status === 'published')
    .map(adminDraftToProduct);
}

export function emitStorefrontProductsChange() {
  emitBrowserEvent(STOREFRONT_PRODUCTS_CHANGE_EVENT);
}

export async function loadStorefrontProducts(force = false) {
  await ensureAdminProductDraftsLoaded(force);
  return getStorefrontProducts();
}

export async function refreshStorefrontProducts() {
  const products = await loadStorefrontProducts(true);
  emitStorefrontProductsChange();
  return products;
}
