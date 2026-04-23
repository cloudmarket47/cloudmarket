import type { Product } from '../types';
import {
  createDefaultCustomerIdentityPools,
  normalizeCustomerIdentityPools,
  type CustomerGenderTarget,
  type CustomerIdentityPools,
} from './customerIdentityPools';
import {
  DEFAULT_PRODUCT_CATEGORY_SELECTION,
  resolveProductCategorySelection,
} from './productCategories';
import { emitBrowserEvent, getSupabaseClient, getSupabaseTableName } from './supabase';

export const ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT = 'cloudmarket-admin-product-drafts-change';

export type AdminThemeMode = 'light' | 'dark';
export type AdminCurrency = 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR';
export type AdminGenderTarget = CustomerGenderTarget;
export type AdminAssetKind = 'image' | 'video';
export type AdminVideoAspectRatio = '16:9' | '4:5' | '1:1' | '3:4';
export type AdminMediaSectionDisplaySize = 'small' | 'medium' | 'large';

export interface AdminMediaAsset {
  src: string;
  source: 'url' | 'upload';
  kind: AdminAssetKind;
  storagePath?: string;
}

export interface AdminProductLibraryItem {
  id: string;
  name: string;
  asset: AdminMediaAsset;
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
  customerIdentityPools: CustomerIdentityPools;
  mediaLibrary: AdminProductLibraryItem[];
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
    media: {
      visible: boolean;
      title: string;
      subtitle: string;
      displaySize: AdminMediaSectionDisplaySize;
      items: AdminMediaAsset[];
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
      mobileStickyCtaTexts: string[];
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
    storagePath: undefined,
  };
}

function normalizeMediaAsset(value: AdminMediaAsset | undefined, kind: AdminAssetKind = 'image') {
  return value
    ? {
        src: value.src ?? '',
        source: value.source ?? 'url',
        kind: value.kind ?? kind,
        storagePath: value.storagePath?.trim() || undefined,
      }
    : asset('', kind);
}

function normalizeVideoAspectRatio(value: AdminVideoAspectRatio | undefined) {
  return value ?? '16:9';
}

function normalizeLibraryItemName(value: string | undefined, fallback: string) {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : fallback;
}

function isLegacyAutomatedAlertPlaceholder(item: AdminAlertItem | undefined) {
  if (!item) {
    return false;
  }

  const normalizedTitle = item.title.trim().toLowerCase();
  const normalizedMessage = item.message.trim().toLowerCase();

  if (
    normalizedMessage === 'use popup notifications to highlight offers and mock order activity.' ||
    normalizedMessage === 'use this list to control popup notification copy for offers and social proof.'
  ) {
    return true;
  }

  if (
    normalizedTitle === 'limited stock alert' &&
    normalizedMessage === 'only 60 left. hurry now and order yours before you see sold out.'
  ) {
    return true;
  }

  return false;
}

function normalizeMediaLibraryItem(
  item: AdminProductLibraryItem | undefined,
  fallbackName: string,
): AdminProductLibraryItem {
  return {
    id: item?.id?.trim() || createId('library'),
    name: normalizeLibraryItemName(item?.name, fallbackName),
    asset: normalizeMediaAsset(item?.asset, item?.asset?.kind ?? 'image'),
  };
}

function appendLibraryItem(
  collection: AdminProductLibraryItem[],
  name: string,
  mediaAsset: AdminMediaAsset | undefined,
) {
  if (!mediaAsset || !mediaAsset.src.trim()) {
    return;
  }

  collection.push(
    normalizeMediaLibraryItem(
      {
        id: '',
        name,
        asset: mediaAsset,
      },
      name,
    ),
  );
}

function collectDraftMediaLibraryItems(draft: AdminProductDraft) {
  const collected: AdminProductLibraryItem[] = [];

  appendLibraryItem(collected, 'Primary Cover Image', draft.coverImage);
  appendLibraryItem(collected, 'Hero Primary Image', draft.sections.hero.image);
  draft.sections.hero.images.forEach((item, index) =>
    appendLibraryItem(collected, `Hero Slide ${index + 1}`, item),
  );
  appendLibraryItem(collected, 'See in Action Poster', draft.sections.seeInAction.poster);
  appendLibraryItem(collected, 'See in Action Video', draft.sections.seeInAction.video);
  draft.sections.media.items.forEach((item, index) =>
    appendLibraryItem(collected, `Media Section Asset ${index + 1}`, item),
  );
  draft.sections.featureMarquee.images.forEach((item, index) =>
    appendLibraryItem(collected, `Feature Marquee Image ${index + 1}`, item),
  );
  appendLibraryItem(collected, 'Solution Image', draft.sections.solution.image);
  draft.sections.showcase.images.forEach((item, index) =>
    appendLibraryItem(collected, `Showcase Image ${index + 1}`, item),
  );
  draft.sections.testimonials.reviews.forEach((review, index) => {
    appendLibraryItem(collected, `Review Background ${index + 1}`, review.image);
    appendLibraryItem(collected, `Review Avatar ${index + 1}`, review.avatar);
  });
  appendLibraryItem(collected, 'Footer Video Poster', draft.sections.footerVideo.poster);
  appendLibraryItem(collected, 'Footer Video File', draft.sections.footerVideo.video);
  draft.sections.offer.packages.forEach((item, index) =>
    appendLibraryItem(collected, `Package Image ${index + 1}`, item.image),
  );

  return collected;
}

function mergeMediaLibraryItems(
  existingItems: AdminProductLibraryItem[],
  collectedItems: AdminProductLibraryItem[],
) {
  const merged: AdminProductLibraryItem[] = [];
  const seen = new Set<string>();

  const registerItem = (item: AdminProductLibraryItem, fallbackName: string) => {
    const normalizedItem = normalizeMediaLibraryItem(item, fallbackName);
    const keys = [
      normalizedItem.asset.storagePath?.trim().toLowerCase(),
      normalizedItem.asset.src.trim().toLowerCase(),
    ].filter((value): value is string => Boolean(value));

    if (keys.length === 0 || keys.some((key) => seen.has(key))) {
      return;
    }

    keys.forEach((key) => seen.add(key));
    merged.push(normalizedItem);
  };

  existingItems.forEach((item) => registerItem(item, item.name || 'Library Asset'));
  collectedItems.forEach((item) => registerItem(item, item.name || 'Page Asset'));

  return merged;
}

function mediaAssetMatches(
  left: AdminMediaAsset | undefined,
  right: AdminMediaAsset | undefined,
) {
  if (!left || !right) {
    return false;
  }

  const leftStoragePath = left.storagePath?.trim();
  const rightStoragePath = right.storagePath?.trim();

  if (leftStoragePath && rightStoragePath && leftStoragePath === rightStoragePath) {
    return true;
  }

  return left.src.trim().length > 0 && left.src.trim() === right.src.trim();
}

function clearMatchingMediaAsset(
  mediaAsset: AdminMediaAsset | undefined,
  targetAsset: AdminMediaAsset,
  kind: AdminAssetKind,
) {
  return mediaAssetMatches(mediaAsset, targetAsset) ? asset('', kind) : normalizeMediaAsset(mediaAsset, kind);
}

const LEGACY_INSTRUCTIONAL_COPY = new Set([
  'Short product summary for cards, previews and quick admin review.',
  'Add the main conversion message that introduces the product clearly.',
  'Upload a short demo video or poster frame for this section.',
  'Use this section to reinforce the core message below the first video block.',
  'Image-only marquee row for product visuals and supporting angles.',
  'Describe the pain points the product solves.',
  'Explain the first problem clearly.',
  'Explain the second problem clearly.',
  'Explain the third problem clearly.',
  'Explain how the product solves the user problem.',
  'Highlight the strongest reasons to buy.',
  'Explain what makes this useful.',
  'Explain another important benefit.',
  'Add a trust or durability detail.',
  'Tell shoppers what the product is, how it is built and why it stands out.',
  'Describe materials or construction.',
  'Explain how long it lasts or performs.',
  'Explain where and how it is used.',
  'Upload product angles and close-up visuals.',
  'Add social proof with customer photos and quotes.',
  'Add a strong review that feels credible and product-specific.',
  'Add a second video slot closer to the footer.',
  'Collect subscriber details and generate reusable customer tokens.',
  'We respect customer privacy and only collect what is required for token recovery.',
  'Set up your main package cards and promo pricing.',
  'Configure the main order form copy, CTA and token prompt.',
  'The product preview lives in the parent sheet above. This lower sheet handles package selection and checkout.',
  'Add concise answers that remove purchase friction.',
  'Explain your delivery timeline clearly.',
  'State available payment methods.',
]);

function sanitizeInstructionalString(value: string) {
  return LEGACY_INSTRUCTIONAL_COPY.has(value.trim()) ? '' : value;
}

function sanitizeInstructionalDraftValue<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeInstructionalString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeInstructionalDraftValue(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeInstructionalDraftValue(entry),
      ]),
    ) as T;
  }

  return value;
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
  const normalizedDraft: AdminProductDraft = {
    ...draft,
    category: categorySelection.category.name,
    categoryId: categorySelection.category.id,
    categorySlug: categorySelection.category.slug,
    subcategory: categorySelection.subcategory.name,
    subcategorySlug: categorySelection.subcategory.slug,
    purchaseCost: typeof draft.purchaseCost === 'number' ? Math.max(0, draft.purchaseCost) : 0,
    coverImage: normalizeMediaAsset(draft.coverImage, 'image'),
    customerIdentityPools: normalizeCustomerIdentityPools(draft.customerIdentityPools),
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
      media: {
        visible: draft.sections.media?.visible ?? true,
        title: draft.sections.media?.title ?? 'Media Section',
        subtitle: draft.sections.media?.subtitle ?? '',
        displaySize: draft.sections.media?.displaySize ?? 'medium',
        items: (draft.sections.media?.items ?? [])
          .slice(0, 5)
          .map((item) => normalizeMediaAsset(item, item?.kind ?? 'image')),
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
        items: draft.sections.alerts.items
          .filter((item) => !isLegacyAutomatedAlertPlaceholder(item))
          .map((item) => ({
            ...item,
            presetId: item.presetId ?? undefined,
          })),
      },
      orderForm: {
        ...draft.sections.orderForm,
        mobileStickyCtaTexts:
          draft.sections.orderForm.mobileStickyCtaTexts?.filter((item) => item.trim().length > 0) ?? [],
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

  normalizedDraft.mediaLibrary = mergeMediaLibraryItems(
    (draft.mediaLibrary ?? []).map((item) => normalizeMediaLibraryItem(item, item.name || 'Library Asset')),
    collectDraftMediaLibraryItems(normalizedDraft),
  );

  return sanitizeInstructionalDraftValue(normalizedDraft);
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
    customerIdentityPools: normalizeCustomerIdentityPools(baseDraft.customerIdentityPools),
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
    customerIdentityPools: createDefaultCustomerIdentityPools(),
    mediaLibrary: [],
    createdAt: now,
    updatedAt: now,
    shortDescription: '',
    basePrice: 15000,
    purchaseCost: 6500,
    coverImage: asset(),
    sections: {
      hero: {
        visible: true,
        title: '',
        subtitle: '',
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
        subtitle: '',
        badge: 'See It in Action',
        ratio: '16:9',
        poster: asset(),
        video: asset('', 'video'),
      },
      media: {
        visible: true,
        title: 'Media Section',
        subtitle: '',
        displaySize: 'medium',
        items: [],
      },
      headline: {
        visible: true,
        eyebrow: 'Product Headline',
        title: 'Headline text section',
        description: '',
      },
      alerts: {
        visible: true,
        items: [],
      },
      featureMarquee: {
        visible: true,
        title: 'Feature Marquee',
        subtitle: '',
        images: [asset(), asset(), asset(), asset()],
      },
      problem: {
        visible: true,
        title: 'Problem Section',
        subtitle: '',
        items: [
          { icon: 'AlertTriangle', title: '', description: '' },
          { icon: 'Droplets', title: '', description: '' },
          { icon: 'Flame', title: '', description: '' },
        ],
      },
      solution: {
        visible: true,
        badge: 'The Solution',
        title: 'Present the product as the answer',
        description: '',
        image: asset(),
        features: ['', '', ''],
        ctaText: 'Buy Now',
      },
      features: {
        visible: true,
        title: 'Features Section',
        subtitle: '',
        items: [
          { icon: 'Zap', title: '', description: '' },
          { icon: 'Sparkles', title: '', description: '' },
          { icon: 'ShieldCheck', title: '', description: '' },
        ],
      },
      aboutProduct: {
        visible: true,
        title: 'About This Product',
        subtitle: '',
        items: [
          { icon: 'Layers', title: '', description: '' },
          { icon: 'ShieldCheck', title: '', description: '' },
          { icon: 'Sparkles', title: '', description: '' },
        ],
      },
      showcase: {
        visible: true,
        title: 'See the Quality for Yourself',
        subtitle: '',
        images: [asset(), asset(), asset(), asset(), asset(), asset()],
      },
      testimonials: {
        visible: true,
        title: 'What Customers Are Saying',
        subtitle: '',
        reviews: [
          {
            name: 'Customer Name',
            location: 'Lagos',
            rating: 5,
            text: '',
            image: asset(),
            avatar: asset(),
          },
        ],
      },
      footerVideo: {
        visible: true,
        title: 'Watch the Full Walkthrough',
        subtitle: '',
        badge: 'Footer Video Slot',
        ratio: '16:9',
        poster: asset(),
        video: asset('', 'video'),
      },
      subscription: {
        visible: true,
        title: 'Subscribe for Exclusive Discounts',
        subtitle: '',
        buttonLabel: 'Subscribe Now',
        privacyNote: '',
      },
      offer: {
        visible: true,
        title: 'Choose Your Package Before the Offer Ends',
        subtitle: '',
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
        subtitle: '',
        submitButtonLabel: 'Place My Order',
        mobileStickyCtaTexts: [
          'Order Now - Pay on Delivery',
          'Claim Today\'s Free Delivery Offer',
          'Get the Bundle Before It Sells Out',
          'Unlock the Best Promo Package Now',
          'Tap to Reserve Your Discounted Order',
        ],
        tokenPrompt: 'Are you subscribed and want to insert your unique token for extra discount?',
        enableTokenField: true,
        quickCheckoutLabel: 'Quick Checkout',
        orderDetailsLabel: 'Order Details',
        packagePreviewLabel: 'Package Preview',
        childSheetLabel: 'Child Sheet',
        childSheetTitle: 'Select your package',
        childSheetDescription: '',
        changeSelectionLabel: 'Change',
        summaryLabel: 'Order summary',
        totalLabel: 'Final Total',
        confirmationNote:
          'We will call to confirm your order before dispatch. Delivery is free across Nigeria.',
      },
      faq: {
        visible: true,
        title: 'Frequently Asked Questions',
        subtitle: '',
        items: [
          { question: '', answer: '' },
          { question: '', answer: '' },
        ],
      },
    },
  };
}

export function createAdminProductLibraryItem(
  name: string,
  mediaAsset: AdminMediaAsset,
): AdminProductLibraryItem {
  return normalizeMediaLibraryItem(
    {
      id: createId('library'),
      name,
      asset: mediaAsset,
    },
    name,
  );
}

export function createAutoPricedOfferPackage(
  packages: AdminOfferPackage[],
  multiplier = packages.length + 1,
  fallbackBasePrice = 0,
): AdminOfferPackage {
  const safeMultiplier = Math.max(1, multiplier);
  const basePackage = packages[0];
  const basePrice = Math.max(0, basePackage?.price ?? fallbackBasePrice);
  const baseOldPrice = Math.max(basePrice, basePackage?.oldPrice ?? 0);
  const nextFeatures = basePackage?.features.filter((feature) => feature.trim().length > 0) ?? [];

  return {
    title: `Package ${safeMultiplier}`,
    price: basePrice * safeMultiplier,
    oldPrice: baseOldPrice * safeMultiplier,
    description:
      basePackage?.description ??
      `${safeMultiplier} unit${safeMultiplier === 1 ? '' : 's'} total`,
    features: nextFeatures.length > 0 ? nextFeatures : [''],
    isBestValue: false,
    image: asset('', 'image'),
  };
}

export function appendMediaLibraryItemToDraft(
  draft: AdminProductDraft,
  item: AdminProductLibraryItem,
) {
  return normalizeDraft({
    ...draft,
    mediaLibrary: [...draft.mediaLibrary, item],
  });
}

export function removeMediaAssetFromDraft(
  draft: AdminProductDraft,
  targetAsset: AdminMediaAsset,
) {
  return normalizeDraft({
    ...draft,
    coverImage: clearMatchingMediaAsset(draft.coverImage, targetAsset, 'image'),
    mediaLibrary: draft.mediaLibrary.filter((item) => !mediaAssetMatches(item.asset, targetAsset)),
    sections: {
      ...draft.sections,
      hero: {
        ...draft.sections.hero,
        image: clearMatchingMediaAsset(draft.sections.hero.image, targetAsset, 'image'),
        images: draft.sections.hero.images.filter((item) => !mediaAssetMatches(item, targetAsset)),
      },
      seeInAction: {
        ...draft.sections.seeInAction,
        poster: clearMatchingMediaAsset(draft.sections.seeInAction.poster, targetAsset, 'image'),
        video: clearMatchingMediaAsset(draft.sections.seeInAction.video, targetAsset, 'video'),
      },
      media: {
        ...draft.sections.media,
        items: draft.sections.media.items.filter((item) => !mediaAssetMatches(item, targetAsset)),
      },
      featureMarquee: {
        ...draft.sections.featureMarquee,
        images: draft.sections.featureMarquee.images.filter((item) => !mediaAssetMatches(item, targetAsset)),
      },
      solution: {
        ...draft.sections.solution,
        image: clearMatchingMediaAsset(draft.sections.solution.image, targetAsset, 'image'),
      },
      showcase: {
        ...draft.sections.showcase,
        images: draft.sections.showcase.images.filter((item) => !mediaAssetMatches(item, targetAsset)),
      },
      testimonials: {
        ...draft.sections.testimonials,
        reviews: draft.sections.testimonials.reviews.map((review) => ({
          ...review,
          image: clearMatchingMediaAsset(review.image, targetAsset, 'image'),
          avatar: clearMatchingMediaAsset(review.avatar, targetAsset, 'image'),
        })),
      },
      footerVideo: {
        ...draft.sections.footerVideo,
        poster: clearMatchingMediaAsset(draft.sections.footerVideo.poster, targetAsset, 'image'),
        video: clearMatchingMediaAsset(draft.sections.footerVideo.video, targetAsset, 'video'),
      },
      offer: {
        ...draft.sections.offer,
        packages: draft.sections.offer.packages.map((item) => ({
          ...item,
          image: clearMatchingMediaAsset(item.image, targetAsset, 'image'),
        })),
      },
    },
  });
}

export function normalizeAdminProductDraft(draft: AdminProductDraft) {
  return normalizeDraft(draft);
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
  draft.sections.media = {
    visible: product.sections.media?.visible ?? false,
    title: product.sections.media?.title ?? 'Media Section',
    subtitle: product.sections.media?.subtitle ?? '',
    displaySize: product.sections.media?.displaySize ?? 'medium',
    items: (product.sections.media?.items ?? []).slice(0, 5).map((item) => asset(item.src, item.kind)),
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
        : [],
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
    mobileStickyCtaTexts: [...(product.sections.orderForm.mobileStickyCtaTexts ?? [])],
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
  draft.currency = product.currencyCode ?? 'NGN';
  draft.genderTarget = product.genderTarget ?? 'all';
  draft.targetAudience = product.targetAudience ?? 'Nigeria';
  draft.customerIdentityPools = normalizeCustomerIdentityPools(product.customerIdentityPools);

  if (options?.duplicate) {
    draft.id = createId('draft');
    draft.slug = normalizeSlug(`${product.slug}-copy`);
    draft.pageName = `${product.name} Copy`;
  }

  return normalizeDraft(draft);
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

export async function deleteAdminProductDraft(id: string) {
  if (!id) {
    return false;
  }

  await ensureAdminProductDraftsLoaded();
  const nextDrafts = adminProductDraftsCache.filter((draft) => draft.id !== id);

  if (nextDrafts.length === adminProductDraftsCache.length) {
    return false;
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from(getSupabaseTableName('productPages'))
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Unable to delete product page.');
    }
  }

  adminProductDraftsCache = nextDrafts;
  adminProductDraftsLoaded = true;
  emitAdminProductDraftsChange();
  return true;
}

export async function getAdminProductDraftById(id: string | undefined) {
  if (!id) {
    return null;
  }

  await ensureAdminProductDraftsLoaded();
  return adminProductDraftsCache.find((draft) => draft.id === id) ?? null;
}
