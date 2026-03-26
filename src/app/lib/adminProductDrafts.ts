import type { Product } from '../types';
import { applyAlertPreset, ALERT_PRESETS } from './alertPresets';
import {
  DEFAULT_PRODUCT_CATEGORY_SELECTION,
  resolveProductCategorySelection,
} from './productCategories';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';

export const ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT = 'cloudmarket-admin-product-drafts-change';

export type AdminThemeMode = 'light' | 'dark';
export type AdminCurrency = 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR';
export type AdminGenderTarget = 'all' | 'men' | 'women' | 'unisex' | 'kids';
export type AdminAssetKind = 'image' | 'video';
export type AdminVideoAspectRatio = '16:9' | '4:5' | '1:1' | '3:4';

export interface AdminMediaAsset {
  src: string;
  source: 'url' | 'upload';
  kind: AdminAssetKind;
}

export interface AdminContentCard {
  icon: string;
  title: string;
  description: string;
}

export interface AdminAlertItem {
  kind: 'offer' | 'stock' | 'order';
  title: string;
  message: string;
  badge: string;
  presetId?: string;
}

export interface AdminOfferPackage {
  title: string;
  price: number;
  oldPrice: number;
  description: string;
  features: string[];
  isBestValue: boolean;
  image: AdminMediaAsset;
}

export interface AdminReviewItem {
  name: string;
  location: string;
  rating: number;
  text: string;
  image: AdminMediaAsset;
  avatar?: AdminMediaAsset;
}

export interface AdminFaqItem {
  question: string;
  answer: string;
}

export interface AdminOfferHighlight {
  text: string;
  highlight: string;
}

export interface AdminProductDraft {
  id: string;
  sourceProductId: string | null;
  duplicatedFromId: string | null;
  pageName: string;
  productName: string;
  slug: string;
  category: string;
  categoryId: string;
  categorySlug: string;
  subcategory: string;
  subcategorySlug: string;
  genderTarget: AdminGenderTarget;
  targetAudience: string;
  currency: AdminCurrency;
  themeMode: AdminThemeMode;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  shortDescription: string;
  basePrice: number;
  purchaseCost: number;
  coverImage: AdminMediaAsset;
  sections: {
    hero: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      ctaText: string;
      image: AdminMediaAsset;
      images: AdminMediaAsset[];
      benefits: string[];
      offers: AdminOfferHighlight[];
    };
    seeInAction: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      ratio: AdminVideoAspectRatio;
      poster: AdminMediaAsset;
      video: AdminMediaAsset;
    };
    headline: {
      visible: boolean;
      eyebrow: string;
      title: string;
      description: string;
    };
    alerts: {
      visible: boolean;
      items: AdminAlertItem[];
    };
    featureMarquee: {
      visible: boolean;
      title: string;
      subtitle: string;
      images: AdminMediaAsset[];
    };
    problem: {
      visible: boolean;
      title: string;
      subtitle: string;
      items: AdminContentCard[];
    };
    solution: {
      visible: boolean;
      badge: string;
      title: string;
      description: string;
      image: AdminMediaAsset;
      features: string[];
      ctaText: string;
    };
    features: {
      visible: boolean;
      title: string;
      subtitle: string;
      items: AdminContentCard[];
    };
    aboutProduct: {
      visible: boolean;
      title: string;
      subtitle: string;
      items: AdminContentCard[];
    };
    showcase: {
      visible: boolean;
      title: string;
      subtitle: string;
      images: AdminMediaAsset[];
    };
    testimonials: {
      visible: boolean;
      title: string;
      subtitle: string;
      reviews: AdminReviewItem[];
    };
    footerVideo: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      ratio: AdminVideoAspectRatio;
      poster: AdminMediaAsset;
      video: AdminMediaAsset;
    };
    subscription: {
      visible: boolean;
      title: string;
      subtitle: string;
      buttonLabel: string;
      privacyNote: string;
    };
    offer: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      countdownHours: number;
      packages: AdminOfferPackage[];
    };
    orderForm: {
      visible: boolean;
      title: string;
      subtitle: string;
      submitButtonLabel: string;
      tokenPrompt: string;
      enableTokenField: boolean;
      quickCheckoutLabel: string;
      orderDetailsLabel: string;
      packagePreviewLabel: string;
      childSheetLabel: string;
      childSheetTitle: string;
      childSheetDescription: string;
      changeSelectionLabel: string;
      summaryLabel: string;
      totalLabel: string;
      confirmationNote: string;
    };
    faq: {
      visible: boolean;
      title: string;
      subtitle: string;
      items: AdminFaqItem[];
    };
  };
}

interface ProductPageRow {
  id: string;
  source_product_id: string | null;
  duplicated_from_id: string | null;
  page_name: string;
  product_name: string;
  slug: string;
  category: string;
  gender_target: AdminGenderTarget;
  target_audience: string;
  currency: AdminCurrency;
  theme_mode: AdminThemeMode;
  status: 'draft' | 'published';
  short_description: string;
  base_price: number;
  purchase_cost: number;
  data: AdminProductDraft;
  created_at: string;
  updated_at: string;
}

let adminProductDraftsCache: AdminProductDraft[] = [];
let adminProductDraftsLoaded = false;
let adminProductDraftsRequest: Promise<AdminProductDraft[]> | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function emitAdminProductDraftsChange() {
  emitBrowserEvent(ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT);
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function asset(src = '', kind: AdminAssetKind = 'image'): AdminMediaAsset {
  return {
    src,
    source: 'url',
    kind,
  };
}

function normalizeMediaAsset(value: AdminMediaAsset | undefined, kind: AdminAssetKind = 'image') {
  return value
    ? {
        src: value.src ?? '',
        source: value.source ?? 'url',
        kind: value.kind ?? kind,
      }
    : asset('', kind);
}

function normalizeVideoAspectRatio(value: AdminVideoAspectRatio | undefined) {
  return value ?? '16:9';
}

function normalizeDraft(draft: AdminProductDraft): AdminProductDraft {
  const categorySelection = resolveProductCategorySelection({
    categoryId: draft.categoryId,
    categorySlug: draft.categorySlug,
    categoryName: draft.category,
    subcategorySlug: draft.subcategorySlug,
    subcategoryName: draft.subcategory,
  });
  const heroImage = normalizeMediaAsset(draft.sections.hero.image, 'image');
  const heroImagesSource =
    draft.sections.hero.images && draft.sections.hero.images.length > 0
      ? draft.sections.hero.images
      : [heroImage];

  return {
    ...draft,
    category: categorySelection.category.name,
    categoryId: categorySelection.category.id,
    categorySlug: categorySelection.category.slug,
    subcategory: categorySelection.subcategory.name,
    subcategorySlug: categorySelection.subcategory.slug,
    purchaseCost: typeof draft.purchaseCost === 'number' ? Math.max(0, draft.purchaseCost) : 0,
    coverImage: normalizeMediaAsset(draft.coverImage, 'image'),
    sections: {
      ...draft.sections,
      hero: {
        ...draft.sections.hero,
        image: heroImage,
        images: heroImagesSource.map((item) => normalizeMediaAsset(item, 'image')),
      },
      seeInAction: {
        ...draft.sections.seeInAction,
        ratio: normalizeVideoAspectRatio(draft.sections.seeInAction.ratio),
        poster: normalizeMediaAsset(draft.sections.seeInAction.poster, 'image'),
        video: normalizeMediaAsset(draft.sections.seeInAction.video, 'video'),
      },
      solution: {
        ...draft.sections.solution,
        image: normalizeMediaAsset(draft.sections.solution.image, 'image'),
      },
      showcase: {
        ...draft.sections.showcase,
        images: draft.sections.showcase.images.map((item) => normalizeMediaAsset(item, 'image')),
      },
      testimonials: {
        ...draft.sections.testimonials,
        reviews: draft.sections.testimonials.reviews.map((review) => ({
          ...review,
          image: normalizeMediaAsset(review.image, 'image'),
          avatar: normalizeMediaAsset(review.avatar ?? review.image, 'image'),
        })),
      },
      offer: {
        ...draft.sections.offer,
        packages: draft.sections.offer.packages.map((item) => ({
          ...item,
          image: normalizeMediaAsset(item.image, 'image'),
        })),
      },
      footerVideo: {
        ...draft.sections.footerVideo,
        ratio: normalizeVideoAspectRatio(draft.sections.footerVideo.ratio),
        poster: normalizeMediaAsset(draft.sections.footerVideo.poster, 'image'),
        video: normalizeMediaAsset(draft.sections.footerVideo.video, 'video'),
      },
      alerts: {
        ...draft.sections.alerts,
        items: draft.sections.alerts.items.map((item) => ({
          ...item,
          presetId: item.presetId ?? undefined,
        })),
      },
      orderForm: {
        ...draft.sections.orderForm,
        quickCheckoutLabel: draft.sections.orderForm.quickCheckoutLabel ?? 'Quick Checkout',
        orderDetailsLabel: draft.sections.orderForm.orderDetailsLabel ?? 'Order Details',
        packagePreviewLabel: draft.sections.orderForm.packagePreviewLabel ?? 'Package Preview',
        childSheetLabel: draft.sections.orderForm.childSheetLabel ?? 'Child Sheet',
        childSheetTitle: draft.sections.orderForm.childSheetTitle ?? 'Select your package',
        childSheetDescription:
          draft.sections.orderForm.childSheetDescription ??
          'The product preview lives in the parent sheet above. This lower sheet handles package selection and checkout.',
        changeSelectionLabel: draft.sections.orderForm.changeSelectionLabel ?? 'Change',
        summaryLabel: draft.sections.orderForm.summaryLabel ?? 'Order summary',
        totalLabel: draft.sections.orderForm.totalLabel ?? 'Final Total',
        confirmationNote:
          draft.sections.orderForm.confirmationNote ??
          'We will call to confirm your order before dispatch. Delivery is free across Nigeria.',
      },
    },
  };
}

function mapProductPageRowToDraft(row: ProductPageRow): AdminProductDraft {
  const baseDraft = normalizeDraft(
    row.data && typeof row.data === 'object' ? row.data : createEmptyAdminProductDraft(),
  );

  return normalizeDraft({
    ...baseDraft,
    id: row.id,
    sourceProductId: row.source_product_id,
    duplicatedFromId: row.duplicated_from_id,
    pageName: row.page_name || baseDraft.pageName,
    productName: row.product_name || baseDraft.productName,
    slug: row.slug || baseDraft.slug,
    category: row.category || baseDraft.category,
    genderTarget: row.gender_target || baseDraft.genderTarget,
    targetAudience: row.target_audience || baseDraft.targetAudience,
    currency: row.currency || baseDraft.currency,
    themeMode: row.theme_mode || baseDraft.themeMode,
    status: row.status || baseDraft.status,
    shortDescription: row.short_description || baseDraft.shortDescription,
    basePrice: typeof row.base_price === 'number' ? row.base_price : baseDraft.basePrice,
    purchaseCost:
      typeof row.purchase_cost === 'number' ? row.purchase_cost : baseDraft.purchaseCost,
    createdAt: row.created_at || baseDraft.createdAt,
    updatedAt: row.updated_at || baseDraft.updatedAt,
  });
}

function toProductPageRow(draft: AdminProductDraft): ProductPageRow {
  const normalizedDraft = normalizeDraft(draft);

  return {
    id: normalizedDraft.id,
    source_product_id: normalizedDraft.sourceProductId,
    duplicated_from_id: normalizedDraft.duplicatedFromId,
    page_name: normalizedDraft.pageName,
    product_name: normalizedDraft.productName,
    slug: normalizedDraft.slug,
    category: normalizedDraft.category,
    gender_target: normalizedDraft.genderTarget,
    target_audience: normalizedDraft.targetAudience,
    currency: normalizedDraft.currency,
    theme_mode: normalizedDraft.themeMode,
    status: normalizedDraft.status,
    short_description: normalizedDraft.shortDescription,
    base_price: normalizedDraft.basePrice,
    purchase_cost: normalizedDraft.purchaseCost,
    data: normalizedDraft,
    created_at: normalizedDraft.createdAt,
    updated_at: normalizedDraft.updatedAt,
  };
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getCurrencyLabel(currency: AdminCurrency) {
  return {
    NGN: 'Nigerian Naira',
    USD: 'US Dollar',
    GHS: 'Ghanaian Cedi',
    KES: 'Kenyan Shilling',
    ZAR: 'South African Rand',
  }[currency];
}

export function formatDraftCurrency(amount: number, currency: AdminCurrency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function createEmptyAdminProductDraft(): AdminProductDraft {
  const now = new Date().toISOString();

  return {
    id: createId('draft'),
    sourceProductId: null,
    duplicatedFromId: null,
    pageName: 'New Product Page',
    productName: 'New Product',
    slug: 'new-product',
    category: DEFAULT_PRODUCT_CATEGORY_SELECTION.category.name,
    categoryId: DEFAULT_PRODUCT_CATEGORY_SELECTION.category.id,
    categorySlug: DEFAULT_PRODUCT_CATEGORY_SELECTION.category.slug,
    subcategory: DEFAULT_PRODUCT_CATEGORY_SELECTION.subcategory.name,
    subcategorySlug: DEFAULT_PRODUCT_CATEGORY_SELECTION.subcategory.slug,
    genderTarget: 'all',
    targetAudience: 'Nigeria',
    currency: 'NGN',
    themeMode: 'light',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    shortDescription: 'Short product summary for cards, previews and quick admin review.',
    basePrice: 15000,
    purchaseCost: 6500,
    coverImage: asset(),
    sections: {
      hero: {
        visible: true,
        title: 'Lead with a strong product promise',
        subtitle: 'Add the main conversion message that introduces the product clearly.',
        badge: 'Limited Time Offer',
        ctaText: 'Order now - pay on delivery',
        image: asset(),
        images: [asset(), asset(), asset()],
        benefits: ['Primary benefit', 'Secondary benefit', 'Trust point'],
        offers: [
          { text: 'Buy 1 package now for ', highlight: 'special promo price' },
          { text: 'Buy 2 packages for ', highlight: 'more savings' },
        ],
      },
      seeInAction: {
        visible: true,
        title: 'See It in Action',
        subtitle: 'Upload a short demo video or poster frame for this section.',
        badge: 'See It in Action',
        ratio: '16:9',
        poster: asset(),
        video: asset('', 'video'),
      },
      headline: {
        visible: true,
        eyebrow: 'Product Headline',
        title: 'Headline text section',
        description: 'Use this section to reinforce the core message below the first video block.',
      },
      alerts: {
        visible: true,
        items: [
          {
            ...applyAlertPreset(ALERT_PRESETS[0].id),
            message: 'Use popup notifications to highlight offers and mock order activity.',
          },
        ],
      },
      featureMarquee: {
        visible: true,
        title: 'Feature Marquee',
        subtitle: 'Image-only marquee row for product visuals and supporting angles.',
        images: [asset(), asset(), asset(), asset()],
      },
      problem: {
        visible: true,
        title: 'Problem Section',
        subtitle: 'Describe the pain points the product solves.',
        items: [
          { icon: 'AlertTriangle', title: 'Pain point one', description: 'Explain the first problem clearly.' },
          { icon: 'Droplets', title: 'Pain point two', description: 'Explain the second problem clearly.' },
          { icon: 'Flame', title: 'Pain point three', description: 'Explain the third problem clearly.' },
        ],
      },
      solution: {
        visible: true,
        badge: 'The Solution',
        title: 'Present the product as the answer',
        description: 'Explain how the product solves the user problem.',
        image: asset(),
        features: ['Key benefit one', 'Key benefit two', 'Key benefit three'],
        ctaText: 'Buy Now',
      },
      features: {
        visible: true,
        title: 'Features Section',
        subtitle: 'Highlight the strongest reasons to buy.',
        items: [
          { icon: 'Zap', title: 'Feature one', description: 'Explain what makes this useful.' },
          { icon: 'Sparkles', title: 'Feature two', description: 'Explain another important benefit.' },
          { icon: 'ShieldCheck', title: 'Feature three', description: 'Add a trust or durability detail.' },
        ],
      },
      aboutProduct: {
        visible: true,
        title: 'About This Product',
        subtitle: 'Tell shoppers what the product is, how it is built and why it stands out.',
        items: [
          { icon: 'Layers', title: 'Build quality', description: 'Describe materials or construction.' },
          { icon: 'ShieldCheck', title: 'Durability', description: 'Explain how long it lasts or performs.' },
          { icon: 'Sparkles', title: 'Everyday use', description: 'Explain where and how it is used.' },
        ],
      },
      showcase: {
        visible: true,
        title: 'See the Quality for Yourself',
        subtitle: 'Upload product angles and close-up visuals.',
        images: [asset(), asset(), asset(), asset(), asset(), asset()],
      },
      testimonials: {
        visible: true,
        title: 'What Customers Are Saying',
        subtitle: 'Add social proof with customer photos and quotes.',
        reviews: [
          {
            name: 'Customer Name',
            location: 'Lagos',
            rating: 5,
            text: 'Add a strong review that feels credible and product-specific.',
            image: asset(),
            avatar: asset(),
          },
        ],
      },
      footerVideo: {
        visible: true,
        title: 'Watch the Full Walkthrough',
        subtitle: 'Add a second video slot closer to the footer.',
        badge: 'Footer Video Slot',
        ratio: '16:9',
        poster: asset(),
        video: asset('', 'video'),
      },
      subscription: {
        visible: true,
        title: 'Subscribe for Exclusive Discounts',
        subtitle: 'Collect subscriber details and generate reusable customer tokens.',
        buttonLabel: 'Subscribe Now',
        privacyNote: 'We respect customer privacy and only collect what is required for token recovery.',
      },
      offer: {
        visible: true,
        title: 'Choose Your Package Before the Offer Ends',
        subtitle: 'Set up your main package cards and promo pricing.',
        badge: 'Limited Time Deal',
        countdownHours: 24,
        packages: [
          {
            title: 'Buy 1 Get 1 FREE',
            price: 15000,
            oldPrice: 22000,
            description: '2 units total',
            features: ['Free delivery', 'Pay on delivery', '7-day guarantee'],
            isBestValue: false,
            image: asset(),
          },
          {
            title: 'Buy 2 Get 2 FREE',
            price: 30000,
            oldPrice: 44000,
            description: '4 units total',
            features: ['Free delivery', 'Pay on delivery', 'Extra savings'],
            isBestValue: true,
            image: asset(),
          },
        ],
      },
      orderForm: {
        visible: true,
        title: 'Place Your Order Now',
        subtitle: 'Configure the main order form copy, CTA and token prompt.',
        submitButtonLabel: 'Place My Order',
        tokenPrompt: 'Are you subscribed and want to insert your unique token for extra discount?',
        enableTokenField: true,
        quickCheckoutLabel: 'Quick Checkout',
        orderDetailsLabel: 'Order Details',
        packagePreviewLabel: 'Package Preview',
        childSheetLabel: 'Child Sheet',
        childSheetTitle: 'Select your package',
        childSheetDescription:
          'The product preview lives in the parent sheet above. This lower sheet handles package selection and checkout.',
        changeSelectionLabel: 'Change',
        summaryLabel: 'Order summary',
        totalLabel: 'Final Total',
        confirmationNote:
          'We will call to confirm your order before dispatch. Delivery is free across Nigeria.',
      },
      faq: {
        visible: true,
        title: 'Frequently Asked Questions',
        subtitle: 'Add concise answers that remove purchase friction.',
        items: [
          { question: 'How does delivery work?', answer: 'Explain your delivery timeline clearly.' },
          { question: 'Can customers pay on delivery?', answer: 'State available payment methods.' },
        ],
      },
    },
  };
}

export function createAdminProductDraftFromProduct(
  product: Product,
  options?: { duplicate?: boolean },
): AdminProductDraft {
  const now = new Date().toISOString();
  const draft = createEmptyAdminProductDraft();
  const categorySelection = resolveProductCategorySelection({
    categoryId: product.categoryId,
    categorySlug: product.categorySlug,
    categoryName: product.category,
    subcategorySlug: product.subcategorySlug,
    subcategoryName: product.subcategory,
  });

  draft.sourceProductId = product.id;
  draft.duplicatedFromId = options?.duplicate ? product.id : null;
  draft.pageName = product.name;
  draft.productName = product.name;
  draft.slug = product.slug;
  draft.category = categorySelection.category.name;
  draft.categoryId = categorySelection.category.id;
  draft.categorySlug = categorySelection.category.slug;
  draft.subcategory = categorySelection.subcategory.name;
  draft.subcategorySlug = categorySelection.subcategory.slug;
  draft.shortDescription = product.shortDescription;
  draft.basePrice = product.price;
  draft.purchaseCost = product.purchaseCost ?? 0;
  draft.coverImage = asset(product.image);
  draft.sections.hero = {
    visible: product.sections.hero.visible,
    title: product.sections.hero.title,
    subtitle: product.sections.hero.subtitle,
    badge: product.sections.hero.badge,
    ctaText: product.sections.hero.ctaText,
    image: asset(product.sections.hero.image || product.image),
    images: [product.sections.hero.image, product.image, ...product.sections.showcase.images]
      .filter((image, index, collection): image is string => Boolean(image) && collection.indexOf(image) === index)
      .map((image) => asset(image)),
    benefits: [...product.sections.hero.benefits],
    offers: product.sections.hero.offers.map((item) => ({ ...item })),
  };
  draft.sections.seeInAction = {
    visible: true,
    title: 'See It in Action',
    subtitle: 'Use this upper-page video slot for a short product demo.',
    badge: 'See It in Action',
    ratio: '16:9',
    poster: asset(product.sections.showcase.images[0] ?? product.sections.hero.image ?? product.image),
    video: asset('', 'video'),
  };
  draft.sections.headline = {
    visible: true,
    eyebrow: 'Product Headline',
    title: product.sections.hero.title,
    description: product.sections.hero.subtitle || product.shortDescription,
  };
  draft.sections.alerts = {
    visible: true,
    items:
      product.sections.alerts.items.length > 0
        ? product.sections.alerts.items.map((item) => ({ ...item }))
        : [
            {
              ...applyAlertPreset(ALERT_PRESETS[0].id),
              message: 'Use this list to control popup notification copy for offers and social proof.',
            },
            {
              ...applyAlertPreset(ALERT_PRESETS[1].id),
              title: 'Limited Stock Alert',
              message: 'Only 60 left. Hurry now and order yours before you see sold out.',
            },
          ],
  };
  draft.sections.featureMarquee = {
    visible: product.sections.features.visible,
    title: 'Feature Marquee',
    subtitle: 'Images used in the moving feature rows.',
    images: product.sections.showcase.images.map((image) => asset(image)),
  };
  draft.sections.problem = {
    visible: product.sections.problem.visible,
    title: product.sections.problem.title,
    subtitle: product.sections.problem.subtitle,
    items: product.sections.problem.problems.map((item) => ({
      icon: item.icon,
      title: item.title,
      description: item.description,
    })),
  };
  draft.sections.solution = {
    visible: product.sections.solution.visible,
    badge: product.sections.solution.badge,
    title: product.sections.solution.title,
    description: product.sections.solution.description,
    image: asset(product.sections.solution.image),
    features: [...product.sections.solution.features],
    ctaText: product.sections.solution.ctaText,
  };
  draft.sections.features = {
    visible: product.sections.features.visible,
    title: product.sections.features.title,
    subtitle: product.sections.features.subtitle,
    items: product.sections.features.items.map((item) => ({
      icon: item.icon,
      title: item.title,
      description: item.description,
    })),
  };
  draft.sections.aboutProduct = {
    visible: product.sections.howItWorks.visible,
    title: product.sections.howItWorks.title,
    subtitle: product.sections.howItWorks.subtitle,
    items: product.sections.howItWorks.steps.map((item) => ({
      icon: item.icon,
      title: item.title,
      description: item.description,
    })),
  };
  draft.sections.showcase = {
    visible: product.sections.showcase.visible,
    title: product.sections.showcase.title,
    subtitle: product.sections.showcase.subtitle,
    images: product.sections.showcase.images.map((image) => asset(image)),
  };
  draft.sections.testimonials = {
    visible: product.sections.testimonials.visible,
    title: product.sections.testimonials.title,
    subtitle: product.sections.testimonials.subtitle,
    reviews: product.sections.testimonials.reviews.map((review) => ({
      name: review.name,
      location: review.location,
      rating: review.rating,
      text: review.text,
      image: asset(review.image),
      avatar: asset(review.avatar ?? review.image),
    })),
  };
  draft.sections.footerVideo = {
    visible: true,
    title: 'Watch the Full Walkthrough',
    subtitle: 'Use this lower-page video slot for a longer review or walkthrough.',
    badge: 'Footer Video Slot',
    ratio: '16:9',
    poster: asset(product.sections.solution.image ?? product.image),
    video: asset('', 'video'),
  };
  draft.sections.subscription = {
    visible: true,
    title: 'Subscribe for Exclusive Discounts',
    subtitle: 'Collect subscriber details and generate reusable customer tokens.',
    buttonLabel: 'Subscribe Now',
    privacyNote: 'We respect customer privacy and only collect the data required for token recovery.',
  };
  draft.sections.offer = {
    visible: product.sections.offer.visible,
    title: product.sections.offer.title,
    subtitle: product.sections.offer.subtitle,
    badge: product.sections.offer.badge,
    countdownHours: product.sections.offer.countdownHours,
    packages: product.sections.offer.packages.map((item) => ({
      title: item.title,
      price: item.price,
      oldPrice: item.oldPrice ?? item.price,
      description: item.description,
      features: [...item.features],
      isBestValue: item.isBestValue,
      image: asset(item.image ?? ''),
    })),
  };
  draft.sections.orderForm = {
    visible: product.sections.orderForm.visible,
    title: product.sections.orderForm.title,
    subtitle: product.sections.orderForm.subtitle,
    submitButtonLabel: product.sections.orderForm.submitButtonLabel,
    tokenPrompt: product.sections.orderForm.tokenPrompt,
    enableTokenField: product.sections.orderForm.enableTokenField,
    quickCheckoutLabel: product.sections.orderForm.quickCheckoutLabel,
    orderDetailsLabel: product.sections.orderForm.orderDetailsLabel,
    packagePreviewLabel: product.sections.orderForm.packagePreviewLabel,
    childSheetLabel: product.sections.orderForm.childSheetLabel,
    childSheetTitle: product.sections.orderForm.childSheetTitle,
    childSheetDescription: product.sections.orderForm.childSheetDescription,
    changeSelectionLabel: product.sections.orderForm.changeSelectionLabel,
    summaryLabel: product.sections.orderForm.summaryLabel,
    totalLabel: product.sections.orderForm.totalLabel,
    confirmationNote: product.sections.orderForm.confirmationNote,
  };
  draft.sections.faq = {
    visible: product.sections.faq.visible,
    title: product.sections.faq.title,
    subtitle: product.sections.faq.subtitle,
    items: product.sections.faq.items.map((item) => ({ ...item })),
  };
  draft.createdAt = now;
  draft.updatedAt = now;
  draft.themeMode = 'light';
  draft.targetAudience = 'Nigeria';
  draft.currency = product.currencyCode ?? 'NGN';

  if (options?.duplicate) {
    draft.id = createId('draft');
    draft.slug = normalizeSlug(`${product.slug}-copy`);
    draft.pageName = `${product.name} Copy`;
  }

  return draft;
}

export function cloneAdminProductDraft(draft: AdminProductDraft): AdminProductDraft {
  const cloned = JSON.parse(JSON.stringify(draft)) as AdminProductDraft;
  const now = new Date().toISOString();

  cloned.id = createId('draft');
  cloned.duplicatedFromId = draft.id;
  cloned.createdAt = now;
  cloned.updatedAt = now;
  cloned.pageName = `${draft.pageName} Copy`;
  cloned.slug = normalizeSlug(`${draft.slug}-copy`);
  cloned.status = 'draft';

  return cloned;
}

export function readAdminProductDrafts() {
  if (!adminProductDraftsLoaded) {
    void ensureAdminProductDraftsLoaded();
  }

  return adminProductDraftsCache;
}

export async function ensureAdminProductDraftsLoaded(force = false) {
  if (!isBrowser()) {
    return [] as AdminProductDraft[];
  }

  if (adminProductDraftsLoaded && !force) {
    return adminProductDraftsCache;
  }

  if (adminProductDraftsRequest && !force) {
    return adminProductDraftsRequest;
  }

  adminProductDraftsRequest = (async () => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      adminProductDraftsCache = [];
      adminProductDraftsLoaded = true;
      emitAdminProductDraftsChange();
      return adminProductDraftsCache;
    }

    const { data, error } = await supabase
      .from(getSupabaseTableName('productPages'))
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load product pages.');
    }

    adminProductDraftsCache = ((data ?? []) as ProductPageRow[]).map(mapProductPageRowToDraft);
    adminProductDraftsLoaded = true;
    emitAdminProductDraftsChange();
    return adminProductDraftsCache;
  })();

  try {
    return await adminProductDraftsRequest;
  } finally {
    adminProductDraftsRequest = null;
  }
}

export async function writeAdminProductDrafts(drafts: AdminProductDraft[]) {
  const normalizedDrafts = drafts
    .map((draft) => normalizeDraft(draft))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const supabase = getSupabaseClient();

  adminProductDraftsCache = normalizedDrafts;
  adminProductDraftsLoaded = true;

  if (supabase) {
    const rows = normalizedDrafts.map(toProductPageRow);
    const { error } = await supabase
      .from(getSupabaseTableName('productPages'))
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      throw new Error(error.message || 'Unable to save product pages.');
    }
  }

  emitAdminProductDraftsChange();
  return adminProductDraftsCache;
}

export async function saveAdminProductDraft(draft: AdminProductDraft) {
  await ensureAdminProductDraftsLoaded();
  const drafts = [...adminProductDraftsCache];
  const nextDraft: AdminProductDraft = normalizeDraft({
    ...draft,
    updatedAt: new Date().toISOString(),
  });
  const existingIndex = drafts.findIndex((item) => item.id === draft.id);

  if (existingIndex >= 0) {
    drafts[existingIndex] = nextDraft;
  } else {
    drafts.unshift(nextDraft);
  }

  await writeAdminProductDrafts(drafts);
  return nextDraft;
}

export async function getAdminProductDraftById(id: string | undefined) {
  if (!id) {
    return null;
  }

  await ensureAdminProductDraftsLoaded();
  return adminProductDraftsCache.find((draft) => draft.id === id) ?? null;
}
