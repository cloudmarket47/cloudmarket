import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileImage,
  FileVideo,
  Globe2,
  GripVertical,
  HelpCircle,
  ImagePlus,
  Layers3,
  Lock,
  Moon,
  Package2,
  Plus,
  Save,
  Sparkles,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { InlineEditableProductCanvas } from '../../components/admin/InlineEditableProductCanvas';
import { useLocale } from '../../context/LocaleContext';
import {
  cloneAdminProductDraft,
  createAutoPricedOfferPackage,
  createEmptyAdminProductDraft,
  createAdminProductLibraryItem,
  deleteAdminProductDraft,
  formatDraftCurrency,
  getAdminProductDraftById,
  getCurrencyLabel,
  normalizeAdminProductDraft,
  removeMediaAssetFromDraft,
  saveAdminProductDraft,
  type AdminAlertItem,
  type AdminContentCard,
  type AdminCurrency,
  type AdminFaqItem,
  type AdminGenderTarget,
  type AdminMediaAsset,
  type AdminProductLibraryItem,
  type AdminOfferHighlight,
  type AdminOfferPackage,
  type AdminProductDraft,
  type AdminReviewItem,
  type AdminThemeMode,
} from '../../lib/adminProductDrafts';
import { ALERT_PRESETS, applyAlertPreset } from '../../lib/alertPresets';
import {
  getProductCategoryDisplay,
  getProductSubcategories,
  PRODUCT_CATEGORIES,
  resolveProductCategorySelection,
} from '../../lib/productCategories';
import {
  getCountryCustomerPoolLabel,
  getDeterministicCustomerNameForIndex,
} from '../../lib/customerIdentityPools';
import type { SupportedCountryCode } from '../../lib/localeData';
import {
  deleteAssetFromSupabaseStorage,
  uploadAssetToSupabaseStorageDetailed,
} from '../../lib/supabaseStorage';
import {
  getProductLibraryBatchUploadLimit,
  getProductLibraryCountLimit,
  getProductLibraryLimitLabel,
  inferProductLibraryKindFromUrl,
  type ProductLibraryMediaKind,
  validateProductLibraryUpload,
} from '../../lib/productMediaLibrary';
import { getOptimizedMedia } from '../../lib/media';

const inputClasses =
  'mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/10';
const textareaClasses = `${inputClasses} min-h-[112px] resize-y`;
const sectionChipClasses =
  'inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600';
const DEFAULT_HERO_SUBTITLE_PLACEHOLDER =
  'Add the main conversion message that introduces the product clearly.';

const currencyOptions: AdminCurrency[] = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];
const genderOptions: { value: AdminGenderTarget; label: string }[] = [
  { value: 'all', label: 'All genders' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
];
const themeOptions: { value: AdminThemeMode; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light mode', icon: Sun },
  { value: 'dark', label: 'Dark mode', icon: Moon },
];

type SetTopLevelFn = <K extends keyof AdminProductDraft>(
  key: K,
  value: AdminProductDraft[K],
) => void;
type PatchSectionFn = <K extends keyof AdminProductDraft['sections']>(
  key: K,
  patch: Partial<AdminProductDraft['sections'][K]>,
) => void;
type PreviewSectionId = keyof AdminProductDraft['sections'];
type EditorTargetId = 'pageSetup' | PreviewSectionId;
type BuilderDeviceView = 'desktop' | 'mobile';

const inlineEditableSectionIds: PreviewSectionId[] = ['hero', 'features'];

interface LivePreviewSection {
  id: PreviewSectionId;
  title: string;
  description: string;
  complete: boolean;
  active: boolean;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isFilled(value: string) {
  return value.trim().length > 0;
}

function hasMedia(asset: AdminMediaAsset) {
  return isFilled(asset.src);
}

function hasContentCards(items: AdminContentCard[]) {
  return items.some((item) => isFilled(item.title) && isFilled(item.description));
}

function getHeroCarouselAssets(hero: AdminProductDraft['sections']['hero']) {
  return [hero.image, ...hero.images].filter(
    (item, index, collection) =>
      hasMedia(item) && collection.findIndex((entry) => entry.src === item.src) === index,
  );
}

function getPrimaryHeroAsset(images: AdminMediaAsset[]) {
  return images.find((item) => hasMedia(item)) ?? images[0] ?? { src: '', source: 'url', kind: 'image' as const };
}

function isPageSetupComplete(draft: AdminProductDraft) {
  return (
    isFilled(draft.pageName) &&
    isFilled(draft.productName) &&
    isFilled(draft.slug) &&
    isFilled(draft.targetAudience) &&
    isFilled(draft.category) &&
    draft.basePrice > 0 &&
    draft.purchaseCost > 0
  );
}

function isEditorTargetComplete(draft: AdminProductDraft, target: EditorTargetId | null) {
  if (!target) {
    return false;
  }

  if (target === 'pageSetup') {
    return isPageSetupComplete(draft);
  }

  return getLivePreviewSections(draft).find((section) => section.id === target)?.complete ?? false;
}

function getEditorTargetLabel(target: EditorTargetId) {
  switch (target) {
    case 'pageSetup':
      return 'Page Setup';
    case 'hero':
      return 'Hero Section';
    case 'seeInAction':
      return 'See in Action';
    case 'media':
      return 'Media Section';
    case 'headline':
      return 'Product Headline';
    case 'alerts':
      return 'Top Popup Alerts';
    case 'featureMarquee':
      return 'Product Features Marquee';
    case 'problem':
      return 'Problem Section';
    case 'solution':
      return 'Solution Section';
    case 'features':
      return 'Product Features';
    case 'aboutProduct':
      return 'About Product';
    case 'showcase':
      return 'Quality Showcase';
    case 'testimonials':
      return 'Customer Reviews';
    case 'footerVideo':
      return 'Footer Video';
    case 'subscription':
      return 'Subscription';
    case 'offer':
      return 'Packages and Pricing';
    case 'orderForm':
      return 'Main Order Form';
    case 'faq':
      return 'FAQ Section';
    default:
      return 'Section Editor';
  }
}

function getLivePreviewSections(draft: AdminProductDraft): LivePreviewSection[] {
  return [
    {
      id: 'hero',
      title: 'Hero',
      description: 'Main product promise and top visual',
      complete:
        draft.sections.hero.visible &&
        isFilled(draft.sections.hero.title) &&
        isFilled(draft.sections.hero.subtitle) &&
        getHeroCarouselAssets(draft.sections.hero).length > 0,
      active: draft.sections.hero.visible,
    },
    {
      id: 'seeInAction',
      title: 'See in Action',
      description: 'Upper video slot and poster',
      complete:
        draft.sections.seeInAction.visible &&
        isFilled(draft.sections.seeInAction.title) &&
        (hasMedia(draft.sections.seeInAction.poster) || hasMedia(draft.sections.seeInAction.video)),
      active: draft.sections.seeInAction.visible,
    },
    {
      id: 'media',
      title: 'Media Section',
      description: 'Mixed image, GIF and video strip below the first video',
      complete:
        draft.sections.media.visible &&
        isFilled(draft.sections.media.title) &&
        draft.sections.media.items.some((item) => hasMedia(item)),
      active: draft.sections.media.visible,
    },
    {
      id: 'headline',
      title: 'Headline',
      description: 'Supporting message below the first video',
      complete:
        draft.sections.headline.visible &&
        isFilled(draft.sections.headline.title) &&
        isFilled(draft.sections.headline.description),
      active: draft.sections.headline.visible,
    },
    {
      id: 'alerts',
      title: 'Alerts',
      description: 'Top drop notifications and offer alerts',
      complete:
        draft.sections.alerts.visible &&
        (
          draft.sections.alerts.items.length === 0 ||
          draft.sections.alerts.items.some(
            (item) => isFilled(item.title) && isFilled(item.message),
          )
        ),
      active: draft.sections.alerts.visible,
    },
    {
      id: 'featureMarquee',
      title: 'Feature Marquee',
      description: 'Bi-directional moving image rows',
      complete:
        draft.sections.featureMarquee.visible &&
        draft.sections.featureMarquee.images.some((item) => hasMedia(item)),
      active: draft.sections.featureMarquee.visible,
    },
    {
      id: 'problem',
      title: 'Problem',
      description: 'Pain points that lead into the solution',
      complete:
        draft.sections.problem.visible &&
        isFilled(draft.sections.problem.title) &&
        hasContentCards(draft.sections.problem.items),
      active: draft.sections.problem.visible,
    },
    {
      id: 'solution',
      title: 'Solution',
      description: 'Product answer with benefits and image',
      complete:
        draft.sections.solution.visible &&
        isFilled(draft.sections.solution.title) &&
        isFilled(draft.sections.solution.description) &&
        hasMedia(draft.sections.solution.image),
      active: draft.sections.solution.visible,
    },
    {
      id: 'features',
      title: 'Features',
      description: 'Reason-to-buy feature cards',
      complete:
        draft.sections.features.visible &&
        isFilled(draft.sections.features.title) &&
        hasContentCards(draft.sections.features.items),
      active: draft.sections.features.visible,
    },
    {
      id: 'aboutProduct',
      title: 'About Product',
      description: 'Product detail and construction highlights',
      complete:
        draft.sections.aboutProduct.visible &&
        isFilled(draft.sections.aboutProduct.title) &&
        hasContentCards(draft.sections.aboutProduct.items),
      active: draft.sections.aboutProduct.visible,
    },
    {
      id: 'showcase',
      title: 'Quality Showcase',
      description: 'Main product image carousel section',
      complete:
        draft.sections.showcase.visible &&
        draft.sections.showcase.images.some((item) => hasMedia(item)),
      active: draft.sections.showcase.visible,
    },
    {
      id: 'testimonials',
      title: 'Reviews',
      description: 'Customer image review cards',
      complete:
        draft.sections.testimonials.visible &&
        draft.sections.testimonials.reviews.some(
          (review) =>
            isFilled(review.name) &&
            isFilled(review.text) &&
            hasMedia(review.image),
        ),
      active: draft.sections.testimonials.visible,
    },
    {
      id: 'footerVideo',
      title: 'Footer Video',
      description: 'Lower page video section',
      complete:
        draft.sections.footerVideo.visible &&
        isFilled(draft.sections.footerVideo.title) &&
        (hasMedia(draft.sections.footerVideo.poster) ||
          hasMedia(draft.sections.footerVideo.video)),
      active: draft.sections.footerVideo.visible,
    },
    {
      id: 'subscription',
      title: 'Subscription',
      description: 'Subscriber token section',
      complete:
        draft.sections.subscription.visible &&
        isFilled(draft.sections.subscription.title) &&
        isFilled(draft.sections.subscription.buttonLabel),
      active: draft.sections.subscription.visible,
    },
    {
      id: 'offer',
      title: 'Packages',
      description: 'Offer cards, promo prices and bundles',
      complete:
        draft.sections.offer.visible &&
        draft.sections.offer.packages.some(
          (item) => isFilled(item.title) && item.price > 0,
        ),
      active: draft.sections.offer.visible,
    },
    {
      id: 'orderForm',
      title: 'Order Form',
      description: 'Main order form block',
      complete:
        draft.sections.orderForm.visible &&
        isFilled(draft.sections.orderForm.title) &&
        isFilled(draft.sections.orderForm.submitButtonLabel),
      active: draft.sections.orderForm.visible,
    },
    {
      id: 'faq',
      title: 'FAQ',
      description: 'Questions and answers close to the footer',
      complete:
        draft.sections.faq.visible &&
        draft.sections.faq.items.some(
          (item) => isFilled(item.question) && isFilled(item.answer),
        ),
      active: draft.sections.faq.visible,
    },
  ];
}

async function resolveInitialDraft(
  id: string | undefined,
  duplicateFrom: string | null,
  source: string | null,
) {
  if (id) {
    const savedDraft = await getAdminProductDraftById(id);

    if (savedDraft) {
      return deepClone(savedDraft);
    }
  }

  if (duplicateFrom && source === 'draft') {
    const sourceDraft = await getAdminProductDraftById(duplicateFrom);

    if (sourceDraft) {
      return cloneAdminProductDraft(sourceDraft);
    }
  }

  if (duplicateFrom) {
    if (source === 'draft') {
      return createEmptyAdminProductDraft();
    }
  }

  return createEmptyAdminProductDraft();
}

function Label({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-gray-900">
      <span>{children}</span>
      {hint ? <span className="mt-1 block text-xs font-normal text-gray-500">{hint}</span> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'number';
}) {
  return (
    <Label hint={hint}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClasses}
      />
    </Label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <Label hint={hint}>
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={textareaClasses}
      />
    </Label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <Label hint={hint}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={inputClasses}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        checked ? 'bg-[#0E7C7B]' : 'bg-gray-300'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  visible,
  onVisibleChange,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  visible: boolean;
  onVisibleChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[2rem] border-gray-200 p-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef7f6] text-[#0E7C7B]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 sm:justify-start">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Visible
            </span>
            <Toggle checked={visible} onChange={onVisibleChange} />
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
    </Card>
  );
}

function CompactEditorSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[1.6rem] border border-gray-200 bg-gray-50/80">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/40"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">{summary}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen ? <div className="border-t border-gray-200 px-4 py-4">{children}</div> : null}
    </div>
  );
}

function MediaAssetField({
  label,
  description,
  asset,
  kind,
  onChange,
}: {
  label: string;
  description: string;
  asset: AdminMediaAsset;
  kind: 'image' | 'video';
  onChange: (value: AdminMediaAsset) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const uploaded = await uploadAssetToSupabaseStorageDetailed(file, 'product-builder');
      onChange({
        src: uploaded.publicUrl,
        source: 'upload',
        kind,
        storagePath: uploaded.storagePath,
      });
    } catch {
      setError('This file could not be loaded. Try a smaller file or a direct URL.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-gray-50/80 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
          </div>

          <Label hint="Paste a hosted media URL if you already have one.">
            {kind === 'image' ? 'Image URL' : 'Video URL'}
            <div className="relative">
              <input
                type="url"
                value={asset.src}
                onChange={(event) =>
                  onChange({
                    src: event.target.value,
                    source: 'url',
                    kind,
                  })
                }
                placeholder={
                  kind === 'image'
                    ? 'https://example.com/product-image.jpg'
                    : 'https://example.com/demo-video.mp4'
                }
                className={`${inputClasses} pr-11`}
              />
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">
                {kind === 'image' ? (
                  <FileImage className="h-4 w-4" />
                ) : (
                  <FileVideo className="h-4 w-4" />
                )}
              </div>
            </div>
          </Label>

          <Label hint="Direct device uploads are stored in Supabase Storage so your media stays reusable across sessions.">
            Upload from device
            <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <input
                type="file"
                accept={kind === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#0E7C7B] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0a5f5e]"
              />
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Upload className="h-4 w-4" />
                <span>
                  {isUploading
                    ? 'Uploading asset...'
                    : asset.source === 'upload'
                      ? 'Uploaded to Supabase Storage'
                      : 'No uploaded asset selected yet'}
                </span>
              </div>
              {error ? <p className="mt-2 text-xs font-medium text-red-500">{error}</p> : null}
            </div>
          </Label>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
              Source: {asset.source || 'url'}
            </span>
            {asset.src ? (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    src: '',
                    source: 'url',
                    kind,
                  })
                }
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                Clear media
              </button>
            ) : null}
          </div>
        </div>

        <div className="lg:w-[240px]">
          <div className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white">
            {asset.src ? (
              kind === 'image' ? (
                <img src={getOptimizedMedia(asset.src)} alt={label} loading="lazy" className="h-52 w-full object-cover" />
              ) : (
                <video src={getOptimizedMedia(asset.src)} controls preload="none" className="h-52 w-full bg-black object-cover" />
              )
            ) : (
              <div className="flex h-52 w-full flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-white text-center text-gray-400">
                {kind === 'image' ? <ImagePlus className="h-7 w-7" /> : <FileVideo className="h-7 w-7" />}
                <p className="mt-3 px-6 text-sm font-medium text-gray-500">
                  {kind === 'image' ? 'No image selected yet' : 'No video selected yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductLibraryManager({
  draft,
  onChange,
}: {
  draft: AdminProductDraft;
  onChange: (value: AdminProductDraft) => void;
}) {
  const [libraryName, setLibraryName] = useState('');
  const [libraryUrl, setLibraryUrl] = useState('');
  const [libraryKind, setLibraryKind] = useState<ProductLibraryMediaKind>('image');
  const [feedback, setFeedback] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const imageCount = draft.mediaLibrary.filter((item) => item.asset.kind === 'image').length;
  const videoCount = draft.mediaLibrary.filter((item) => item.asset.kind === 'video').length;

  const appendLibraryItem = (item: AdminProductLibraryItem) => {
    onChange({
      ...draft,
      mediaLibrary: [...draft.mediaLibrary, item],
    });
  };

  const handleUrlAdd = () => {
    const nextUrl = libraryUrl.trim();

    if (!nextUrl) {
      setFeedback('Enter a media URL before adding it to the product library.');
      return;
    }

    const nextKind = libraryKind || inferProductLibraryKindFromUrl(nextUrl);
    const existingCount = nextKind === 'image' ? imageCount : videoCount;

    if (existingCount >= getProductLibraryCountLimit(nextKind)) {
      setFeedback(
        `This product library already reached the ${getProductLibraryCountLimit(nextKind)} ${nextKind} limit.`,
      );
      return;
    }

    appendLibraryItem(
      createAdminProductLibraryItem(
        libraryName.trim() || `Library ${nextKind} ${existingCount + 1}`,
        {
          src: nextUrl,
          source: 'url',
          kind: nextKind,
          storagePath: undefined,
        },
      ),
    );
    setLibraryName('');
    setLibraryUrl('');
    setFeedback('Media URL added to the product library.');
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
    const videoFiles = selectedFiles.filter((file) => file.type.startsWith('video/'));

    if (imageFiles.length > 0 && videoFiles.length > 0) {
      setFeedback('Upload images and videos separately in the product library.');
      event.target.value = '';
      return;
    }

    const nextKind: ProductLibraryMediaKind = videoFiles.length > 0 ? 'video' : 'image';
    const files = nextKind === 'video' ? videoFiles : imageFiles;

    if (files.length === 0) {
      setFeedback('Only image and video files can be uploaded to the product library.');
      event.target.value = '';
      return;
    }

    const existingCount = nextKind === 'image' ? imageCount : videoCount;
    const batchLimit = getProductLibraryBatchUploadLimit(nextKind);
    const remainingSlots = Math.max(0, getProductLibraryCountLimit(nextKind) - existingCount);

    if (files.length > batchLimit) {
      setFeedback(
        nextKind === 'image'
          ? `You can upload up to ${batchLimit} images at a time.`
          : 'Videos can only be uploaded one at a time.',
      );
      event.target.value = '';
      return;
    }

    if (files.length > remainingSlots) {
      setFeedback(
        remainingSlots > 0
          ? `This product library can only take ${remainingSlots} more ${nextKind}${remainingSlots === 1 ? '' : 's'}.`
          : `This product library already reached the ${getProductLibraryCountLimit(nextKind)} ${nextKind} limit.`,
      );
      event.target.value = '';
      return;
    }

    for (const [index, file] of files.entries()) {
      const validationError = validateProductLibraryUpload({
        file,
        kind: nextKind,
        existingCount: existingCount + index,
      });

      if (validationError) {
        setFeedback(validationError);
        event.target.value = '';
        return;
      }
    }

    setIsWorking(true);
    setFeedback('');
    const uploadedItems: AdminProductLibraryItem[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const uploaded = await uploadAssetToSupabaseStorageDetailed(
          file,
          `product-library/${draft.slug || draft.id}`,
        );

        uploadedItems.push(
          createAdminProductLibraryItem(
            libraryName.trim()
              ? files.length === 1
                ? libraryName.trim()
                : `${libraryName.trim()} ${index + 1}`
              : file.name || `Library ${nextKind} ${existingCount + index + 1}`,
            {
              src: uploaded.publicUrl,
              source: 'upload',
              kind: nextKind,
              storagePath: uploaded.storagePath,
            },
          ),
        );
      }

      onChange({
        ...draft,
        mediaLibrary: [...draft.mediaLibrary, ...uploadedItems],
      });
      setLibraryName('');
      setFeedback(
        uploadedItems.length === 1
          ? `${nextKind === 'image' ? 'Image' : 'Video'} uploaded into the product library.`
          : `${uploadedItems.length} images uploaded into the product library.`,
      );
    } catch (error) {
      if (uploadedItems.length > 0) {
        await Promise.allSettled(
          uploadedItems.map((item) =>
            deleteAssetFromSupabaseStorage(item.asset.storagePath || item.asset.src),
          ),
        );
      }

      setFeedback(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsWorking(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (item: AdminProductLibraryItem) => {
    setIsWorking(true);
    setFeedback('');

    try {
      if (item.asset.source === 'upload') {
        await deleteAssetFromSupabaseStorage(item.asset.storagePath || item.asset.src);
      }

      onChange(removeMediaAssetFromDraft(draft, item.asset));
      setFeedback('Media deleted from the library and removed from this product draft.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to delete this media file.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7f6] text-[#0E7C7B]">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Product Library</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload reusable page media once, then pull it into image and video placeholders across this product page.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Images</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {imageCount}/{getProductLibraryCountLimit('image')}
            </p>
            <p className="mt-1 text-xs text-gray-500">{getProductLibraryLimitLabel('image')}</p>
          </div>
          <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Videos</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {videoCount}/{getProductLibraryCountLimit('video')}
            </p>
            <p className="mt-1 text-xs text-gray-500">{getProductLibraryLimitLabel('video')}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
          <Upload className="h-4 w-4" />
          {isWorking ? 'Uploading...' : 'Upload from Device'}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </label>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-white"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {isExpanded ? 'Hide Library' : 'Open Library'}
        </button>
      </div>

      {feedback ? <p className="mt-4 text-sm font-medium text-[#0E7C7B]">{feedback}</p> : null}

      {isExpanded ? (
      <>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-gray-200 bg-gray-50/80 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Media label"
              value={libraryName}
              onChange={setLibraryName}
              placeholder="Hero close-up shot"
              hint="Optional. Helps the admin identify this file quickly inside the library."
            />
            <SelectField
              label="Media type"
              value={libraryKind}
              options={[
                { value: 'image', label: 'Image' },
                { value: 'video', label: 'Video' },
              ]}
              onChange={setLibraryKind}
              hint="Use this when adding a direct URL into the library."
            />
          </div>

          <div className="mt-5">
            <TextField
              label="Direct media URL"
              value={libraryUrl}
              onChange={setLibraryUrl}
              placeholder="https://example.com/product-demo.mp4"
              hint="Adds an external image or video link directly into this product library."
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleUrlAdd}
              disabled={isWorking}
              className="inline-flex items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a5f5e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add URL to Library
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-900">Library rules</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
            <p>Images: maximum 30 items, 5MB each, upload up to 20 at once.</p>
            <p>Videos: maximum 3 items, 15MB each.</p>
            <p>Deleting an uploaded file removes it from this draft and permanently deletes it from Supabase Storage.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 max-h-[30rem] overflow-y-auto pr-1">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {draft.mediaLibrary.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-[1.6rem] border border-gray-200 bg-white shadow-sm">
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {item.asset.kind === 'image' ? (
                  <img src={getOptimizedMedia(item.asset.src)} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <video src={getOptimizedMedia(item.asset.src)} className="h-full w-full object-cover" controls preload="none" />
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
                      {item.asset.kind} • {item.asset.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    disabled={isWorking}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="truncate text-xs text-gray-500">{item.asset.src}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      ) : null}
    </Card>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-start gap-3">
            <input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              className={`${inputClasses} mt-0 flex-1`}
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition hover:border-red-200 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferHighlightsEditor({
  items,
  onChange,
}: {
  items: AdminOfferHighlight[];
  onChange: (items: AdminOfferHighlight[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<AdminOfferHighlight>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Offer highlight lines</p>
        <button
          type="button"
          onClick={() => onChange([...items, { text: '', highlight: '' }])}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add line
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`offer-highlight-${index}`}
            className="rounded-[1.5rem] border border-gray-200 bg-white p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Lead text"
                value={item.text}
                onChange={(value) => updateItem(index, { text: value })}
                placeholder="Buy 1 package now for"
              />
              <TextField
                label="Highlighted text"
                value={item.highlight}
                onChange={(value) => updateItem(index, { highlight: value })}
                placeholder="special promo price"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove line
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentCardsEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: AdminContentCard[];
  onChange: (items: AdminContentCard[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<AdminContentCard>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <button
          type="button"
          onClick={() => onChange([...items, { icon: 'Sparkles', title: '', description: '' }])}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add card
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${label}-item-${index}`} className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Icon name"
                value={item.icon}
                onChange={(value) => updateItem(index, { icon: value })}
                placeholder="Sparkles"
                hint="Store the Lucide icon name used by the storefront."
              />
              <TextField
                label="Card title"
                value={item.title}
                onChange={(value) => updateItem(index, { title: value })}
                placeholder="Feature title"
              />
              <TextAreaField
                label="Description"
                value={item.description}
                onChange={(value) => updateItem(index, { description: value })}
                placeholder="Explain the point clearly."
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaListEditor({
  label,
  description,
  items,
  onChange,
  reorderable = false,
  primaryLabel = 'First image',
}: {
  label: string;
  description: string;
  items: AdminMediaAsset[];
  onChange: (items: AdminMediaAsset[]) => void;
  reorderable?: boolean;
  primaryLabel?: string;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const updateItem = (index: number, value: AdminMediaAsset) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    onChange(nextItems);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null) {
      return;
    }

    moveItem(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              {
                src: '',
                source: 'url',
                kind: 'image',
              },
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add image
        </button>
      </div>

      {reorderable && items.length > 1 ? (
        <div className="rounded-[1.5rem] border border-gray-200 bg-[#f8fafc] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Carousel order</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Drag to reorder hero slides. The first filled image becomes the first carousel image.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Drag to sort
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <div
                key={`${label}-order-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`flex items-center gap-3 rounded-[1.25rem] border bg-white px-3 py-3 transition ${
                  draggedIndex === index
                    ? 'border-[#0E7C7B] shadow-sm'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {hasMedia(item) ? (
                    <img src={getOptimizedMedia(item.src)} alt={`Carousel image ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-400">
                      Empty
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Slide {index + 1}
                    {index === 0 ? ` • ${primaryLabel}` : ''}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {hasMedia(item) ? item.src : 'No image selected yet'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${label}-media-${index}`} className="space-y-3 rounded-[1.75rem] border border-gray-200 bg-white p-4">
            <MediaAssetField
              label={`Image ${index + 1}`}
              description="Each slot supports direct upload or a pasted media URL."
              asset={item}
              kind="image"
              onChange={(value) => updateItem(index, value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove image
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MixedMediaListEditor({
  label,
  description,
  items,
  displaySize,
  onDisplaySizeChange,
  onChange,
}: {
  label: string;
  description: string;
  items: AdminMediaAsset[];
  displaySize: AdminProductDraft['sections']['media']['displaySize'];
  onDisplaySizeChange: (value: AdminProductDraft['sections']['media']['displaySize']) => void;
  onChange: (items: AdminMediaAsset[]) => void;
}) {
  const updateItem = (index: number, value: AdminMediaAsset) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const handleAddItem = (kind: AdminMediaAsset['kind']) => {
    if (items.length >= 5) {
      return;
    }

    onChange([
      ...items,
      {
        src: '',
        source: 'url',
        kind,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAddItem('image')}
            disabled={items.length >= 5}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add image or GIF
          </button>
          <button
            type="button"
            onClick={() => handleAddItem('video')}
            disabled={items.length >= 5}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add video
          </button>
        </div>
      </div>

      <SelectField
        label="Display size"
        value={displaySize}
        options={[
          { value: 'small', label: 'Small cards' },
          { value: 'medium', label: 'Medium cards' },
          { value: 'large', label: 'Large cards' },
        ]}
        onChange={(value) => onDisplaySizeChange(value as AdminProductDraft['sections']['media']['displaySize'])}
        hint="Controls how large each media tile appears on the storefront."
      />

      <p className="text-xs text-gray-500">{items.length}/5 media items configured.</p>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${label}-media-${index}`} className="space-y-3 rounded-[1.75rem] border border-gray-200 bg-white p-4">
            <SelectField
              label={`Item ${index + 1} type`}
              value={item.kind}
              options={[
                { value: 'image', label: 'Image or GIF' },
                { value: 'video', label: 'Video' },
              ]}
              onChange={(value) =>
                updateItem(index, {
                  ...item,
                  kind: value as AdminMediaAsset['kind'],
                  src: '',
                  source: 'url',
                })
              }
            />
            <MediaAssetField
              label={`Media ${index + 1}`}
              description="Upload from this device or paste a direct media URL."
              asset={item}
              kind={item.kind}
              onChange={(value) => updateItem(index, value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove media
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertItemsEditor({
  items,
  onChange,
}: {
  items: AdminAlertItem[];
  onChange: (items: AdminAlertItem[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<AdminAlertItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const applyPresetToItem = (index: number, presetId: string) => {
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? applyAlertPreset(presetId, item) : item,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Notification cards</p>
          <p className="mt-1 text-xs text-gray-500">
            Leave this empty to keep the automatic mock popup alerts active for this page.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              applyAlertPreset(ALERT_PRESETS[0].id),
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add alert
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-[#0E7C7B]/20 bg-[#eef7f6] px-4 py-4 text-sm text-gray-700">
          Automatic popup alerts are already active by default. Add custom alerts only if you want to replace the built-in mock rotation for this product page.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`alert-${index}`} className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Preset"
                value={item.presetId ?? ALERT_PRESETS[0].id}
                options={ALERT_PRESETS.map((preset) => ({
                  value: preset.id,
                  label: `${preset.badge} - ${preset.title}`,
                }))}
                onChange={(value) => applyPresetToItem(index, value)}
                hint="Choose a ready-made alert, then fine-tune the text below."
              />
              <SelectField
                label="Alert type"
                value={item.kind}
                options={[
                  { value: 'offer', label: 'Offer' },
                  { value: 'stock', label: 'Limited stock' },
                  { value: 'order', label: 'Customer order' },
                ]}
                onChange={(value) => updateItem(index, { kind: value })}
              />
              <TextField
                label="Badge text"
                value={item.badge}
                onChange={(value) => updateItem(index, { badge: value })}
                placeholder="Offer"
              />
              <TextField
                label="Title"
                value={item.title}
                onChange={(value) => updateItem(index, { title: value })}
                placeholder="Limited stock alert"
              />
              <TextAreaField
                label="Message"
                value={item.message}
                onChange={(value) => updateItem(index, { message: value })}
                placeholder="Only 60 left. Hurry now and order yours before it sells out."
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove alert
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageEditor({
  currency,
  basePrice,
  packages,
  onChange,
}: {
  currency: AdminCurrency;
  basePrice: number;
  packages: AdminOfferPackage[];
  onChange: (items: AdminOfferPackage[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<AdminOfferPackage>) => {
    onChange(packages.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Package cards</p>
          <p className="mt-1 text-xs text-gray-500">
            Set the title, old price, promo price and features for each package in {getCurrencyLabel(currency)}.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...packages,
              createAutoPricedOfferPackage(packages, packages.length + 1, basePrice),
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add package
        </button>
      </div>

      <div className="space-y-4">
        {packages.map((item, index) => (
          <div
            key={`package-${index}`}
            className="rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                label="Package title"
                value={item.title}
                onChange={(value) => updateItem(index, { title: value })}
                placeholder="Buy 1 Get 1 FREE"
              />
              <TextField
                label="Package description"
                value={item.description}
                onChange={(value) => updateItem(index, { description: value })}
                placeholder="2 units total"
              />
              <TextField
                label="Promo price"
                type="number"
                value={item.price}
                onChange={(value) => updateItem(index, { price: Number(value) || 0 })}
                placeholder="15000"
                hint={`Displayed as ${formatDraftCurrency(item.price || 0, currency)}`}
              />
              <TextField
                label="Old price"
                type="number"
                value={item.oldPrice}
                onChange={(value) => updateItem(index, { oldPrice: Number(value) || 0 })}
                placeholder="22000"
                hint="Used for savings display and strike-through pricing."
              />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[1.25rem] bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Best value badge</p>
                <p className="mt-1 text-sm font-medium text-gray-700">
                  Highlight this package across the sales page and checkout flow.
                </p>
              </div>
              <Toggle
                checked={item.isBestValue}
                onChange={(value) => updateItem(index, { isBestValue: value })}
              />
            </div>

            <div className="mt-4">
              <StringListEditor
                label="Package features"
                items={item.features}
                onChange={(features) => updateItem(index, { features })}
                placeholder="Free delivery"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(packages.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove package
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewEditor({
  reviews,
  onChange,
  customerIdentityPools,
  genderTarget,
  previewCountryCode,
}: {
  reviews: AdminReviewItem[];
  onChange: (items: AdminReviewItem[]) => void;
  customerIdentityPools: AdminProductDraft['customerIdentityPools'];
  genderTarget: AdminProductDraft['genderTarget'];
  previewCountryCode: SupportedCountryCode;
}) {
  const updateItem = (index: number, patch: Partial<AdminReviewItem>) => {
    onChange(reviews.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };
  const reviewNames = useMemo(
    () =>
      reviews.map((review, index) =>
        getDeterministicCustomerNameForIndex({
          customerIdentityPools,
          countryCode: previewCountryCode,
          genderTarget,
          index,
          seed: `${review.text}-${review.image.src}`,
          fallbackName: review.name || 'Verified Customer',
        }),
      ),
    [customerIdentityPools, genderTarget, previewCountryCode, reviews],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Customer review cards</p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...reviews,
              {
                name: '',
                location: '',
                rating: 5,
                text: '',
                image: { src: '', source: 'url', kind: 'image' },
              },
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add review
        </button>
      </div>

      <div className="space-y-4">
        {reviews.map((review, index) => (
          <div key={`review-${index}`} className="rounded-[1.75rem] border border-gray-200 bg-white p-4">
            <div className="mb-4 rounded-[1.25rem] border border-[#0E7C7B]/10 bg-[#eef7f6] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0E7C7B]">
                Auto customer identity
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{reviewNames[index] ?? review.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                This name auto-switches for {getCountryCustomerPoolLabel(previewCountryCode)} and follows the page gender target.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Rating"
                type="number"
                value={review.rating}
                onChange={(value) => updateItem(index, { rating: Math.min(5, Math.max(1, Number(value) || 1)) })}
                placeholder="5"
              />
              <TextAreaField
                label="Review text"
                value={review.text}
                onChange={(value) => updateItem(index, { text: value })}
                placeholder="Add a strong, product-specific review."
                rows={3}
              />
            </div>

            <div className="mt-4">
              <MediaAssetField
                label="Reviewer image"
                description="Use a customer headshot or lifestyle image."
                asset={review.image}
                kind="image"
                onChange={(value) => updateItem(index, { image: value })}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(reviews.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqEditor({
  items,
  onChange,
}: {
  items: AdminFaqItem[];
  onChange: (items: AdminFaqItem[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<AdminFaqItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">FAQ items</p>
        <button
          type="button"
          onClick={() => onChange([...items, { question: '', answer: '' }])}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0E7C7B] ring-1 ring-inset ring-[#0E7C7B]/15 transition hover:bg-[#eef7f6]"
        >
          <Plus className="h-4 w-4" />
          Add FAQ
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`faq-${index}`} className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
            <div className="grid gap-4">
              <TextField
                label="Question"
                value={item.question}
                onChange={(value) => updateItem(index, { question: value })}
                placeholder="How does delivery work?"
              />
              <TextAreaField
                label="Answer"
                value={item.answer}
                onChange={(value) => updateItem(index, { answer: value })}
                placeholder="Explain the answer clearly and briefly."
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove FAQ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PreviewPanel({ draft }: { draft: AdminProductDraft }) {
  const packages = draft.sections.offer.packages;
  const heroImages = getHeroCarouselAssets(draft.sections.hero);
  const heroPreviewImage = heroImages[0]?.src || draft.coverImage.src || '';
  const heroPreviewDescription =
    draft.sections.hero.subtitle.trim() &&
    draft.sections.hero.subtitle.trim() !== DEFAULT_HERO_SUBTITLE_PLACEHOLDER
      ? draft.sections.hero.subtitle
      : draft.shortDescription;

  return (
    <div
      className={`overflow-hidden rounded-[2rem] border shadow-[0_28px_60px_rgba(15,23,42,0.14)] ${
        draft.themeMode === 'dark'
          ? 'border-slate-800 bg-slate-950 text-white'
          : 'border-gray-200 bg-white text-gray-900'
      }`}
    >
      <div className="relative overflow-hidden border-b border-white/10">
        {heroPreviewImage ? (
          <img
            src={getOptimizedMedia(heroPreviewImage)}
            alt={draft.productName}
            loading="lazy"
            className="h-64 w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-64 w-full items-center justify-center ${
              draft.themeMode === 'dark'
                ? 'bg-gradient-to-br from-slate-900 to-slate-800'
                : 'bg-gradient-to-br from-[#f3f8f7] to-white'
            }`}
          >
            <ImagePlus className="h-10 w-10 opacity-50" />
          </div>
        )}

        <div
          className={`absolute inset-x-0 bottom-0 p-6 ${
            draft.themeMode === 'dark'
              ? 'bg-gradient-to-t from-black via-black/70 to-transparent'
              : 'bg-gradient-to-t from-white via-white/90 to-transparent'
          }`}
        >
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              draft.themeMode === 'dark' ? 'bg-white/10 text-white' : 'bg-black text-white'
            }`}
          >
            {draft.sections.hero.badge}
          </span>
          <h3 className="mt-4 text-2xl font-bold tracking-[-0.02em]">
            {draft.sections.hero.title || draft.productName}
          </h3>
          <p
            className={`mt-3 max-w-2xl text-sm leading-6 ${
              draft.themeMode === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            {heroPreviewDescription}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0E7C7B] p-4 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Target audience</p>
            <p className="mt-2 text-lg font-semibold">{draft.targetAudience}</p>
          </div>
          <div
            className={`rounded-[1.5rem] border p-4 ${
              draft.themeMode === 'dark'
                ? 'border-slate-800 bg-slate-900'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Currency</p>
            <p className="mt-2 text-lg font-semibold">
              {getCurrencyLabel(draft.currency)} ({draft.currency})
            </p>
          </div>
          <div
            className={`rounded-[1.5rem] border p-4 ${
              draft.themeMode === 'dark'
                ? 'border-slate-800 bg-slate-900'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Theme</p>
            <p className="mt-2 text-lg font-semibold capitalize">{draft.themeMode} mode</p>
          </div>
          <div
            className={`rounded-[1.5rem] border p-4 ${
              draft.themeMode === 'dark'
                ? 'border-slate-800 bg-slate-900'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Product category</p>
            <p className="mt-2 text-lg font-semibold">{getProductCategoryDisplay(draft)}</p>
          </div>
        </div>

        {draft.sections.offer.visible ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold">Package Setup</h4>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  draft.themeMode === 'dark'
                    ? 'bg-white/10 text-white'
                    : 'bg-[#eef7f6] text-[#0E7C7B]'
                }`}
              >
                {packages.length} package cards
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {packages.map((item, index) => (
                <div
                  key={`preview-package-${index}`}
                  className={`rounded-[1.5rem] border p-4 ${
                    draft.themeMode === 'dark'
                      ? 'border-slate-800 bg-slate-900'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p
                        className={`mt-1 text-xs ${
                          draft.themeMode === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                    {item.isBestValue ? (
                      <span className="rounded-full bg-[#ffedd5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ea580c]">
                        Best value
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    <p className="text-2xl font-bold">
                      {formatDraftCurrency(item.price, draft.currency)}
                    </p>
                    <p
                      className={`text-sm line-through ${
                        draft.themeMode === 'dark' ? 'text-slate-500' : 'text-gray-400'
                      }`}
                    >
                      {formatDraftCurrency(item.oldPrice, draft.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={`rounded-[1.5rem] border p-5 ${
              draft.themeMode === 'dark'
                ? 'border-slate-800 bg-slate-900'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <h4 className="text-base font-bold">Sections Included</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(draft.sections)
                .filter(([, section]) => section.visible)
                .map(([key]) => (
                  <span
                    key={key}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      draft.themeMode === 'dark'
                        ? 'bg-white/10 text-white'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {key}
                  </span>
                ))}
            </div>
          </div>

          <div
            className={`rounded-[1.5rem] border p-5 ${
              draft.themeMode === 'dark'
                ? 'border-slate-800 bg-slate-900'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <h4 className="text-base font-bold">Order Form Setup</h4>
            <p
              className={`mt-3 text-sm leading-6 ${
                draft.themeMode === 'dark' ? 'text-slate-300' : 'text-gray-600'
              }`}
            >
              {draft.sections.orderForm.subtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#eef7f6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0E7C7B]">
                CTA: {draft.sections.orderForm.submitButtonLabel}
              </span>
              {draft.sections.orderForm.enableTokenField ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    draft.themeMode === 'dark'
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  Token prompt enabled
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionPreviewContent({
  draft,
  sectionId,
}: {
  draft: AdminProductDraft;
  sectionId: PreviewSectionId;
}) {
  const { countryCode } = useLocale();
  const isDark = draft.themeMode === 'dark';
  const shellClass = isDark ? 'bg-slate-950 text-white' : 'bg-[#f8f8f8] text-gray-900';
  const cardClass = isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const completedShowcaseImages = draft.sections.showcase.images.filter((item) => hasMedia(item));
  const marqueeImages = draft.sections.featureMarquee.images.filter((item) => hasMedia(item));
  const heroImages = getHeroCarouselAssets(draft.sections.hero);
  const review = draft.sections.testimonials.reviews.find(
    (item) => isFilled(item.text) || hasMedia(item.image),
  );
  const alert = draft.sections.alerts.items.find(
    (item) => isFilled(item.title) && isFilled(item.message),
  );

  switch (sectionId) {
    case 'hero':
      return (
        <div className={`overflow-hidden rounded-[1.75rem] border ${cardClass}`}>
          <div className="relative">
            {heroImages[0] ? (
              <img
                src={getOptimizedMedia(heroImages[0].src)}
                alt={draft.sections.hero.title}
                loading="lazy"
                className="h-52 w-full object-cover"
              />
            ) : (
              <div className={`h-52 w-full ${shellClass}`} />
            )}
            <div className={`absolute inset-x-0 bottom-0 p-4 ${isDark ? 'bg-gradient-to-t from-black via-black/70 to-transparent' : 'bg-gradient-to-t from-white via-white/85 to-transparent'}`}>
              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'bg-white/10 text-white' : 'bg-black text-white'}`}>
                {draft.sections.hero.badge}
              </span>
              <h4 className="mt-3 text-2xl font-bold tracking-[-0.02em]">{draft.sections.hero.title}</h4>
              <p className={`mt-2 text-sm leading-6 ${mutedClass}`}>{draft.sections.hero.subtitle}</p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {heroImages.length > 1 ? (
              <div className="flex gap-2">
                {heroImages.slice(0, 4).map((item, index) => (
                  <span
                    key={`hero-dot-${index}`}
                    className={`h-2.5 rounded-full ${index === 0 ? 'w-6 bg-[#0E7C7B]' : 'w-2.5 bg-gray-300'}`}
                  />
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {draft.sections.hero.benefits.slice(0, 3).map((benefit, index) => (
                <span
                  key={`hero-benefit-${index}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-white/10 text-white' : 'bg-[#eef7f6] text-[#0E7C7B]'}`}
                >
                  {benefit}
                </span>
              ))}
            </div>
            <button className="w-full rounded-full bg-[#0E7C7B] px-4 py-3 text-sm font-semibold text-white">
              {draft.sections.hero.ctaText}
            </button>
          </div>
        </div>
      );

    case 'seeInAction':
    case 'footerVideo': {
      const section = draft.sections[sectionId];
      const mediaTitle = section.title;
      const mediaSubtitle = section.subtitle;

      return (
        <div className={`overflow-hidden rounded-[1.75rem] border ${cardClass}`}>
          <div className="relative">
            {hasMedia(section.poster) ? (
              <img src={getOptimizedMedia(section.poster.src)} alt={mediaTitle} loading="lazy" className="h-52 w-full object-cover" />
            ) : (
              <div className={`h-52 w-full ${shellClass}`} />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white shadow-lg">
                <FileVideo className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'bg-white/10 text-white' : 'bg-[#eef7f6] text-[#0E7C7B]'}`}>
              {section.badge}
            </span>
            <h4 className="text-lg font-bold">{mediaTitle}</h4>
            <p className={`text-sm leading-6 ${mutedClass}`}>{mediaSubtitle}</p>
          </div>
        </div>
      );
    }

    case 'media': {
      const mediaItems = draft.sections.media.items.filter((item) => hasMedia(item));

      if (mediaItems.length === 0) {
        return null;
      }

      return (
        <div className="space-y-3">
          <div className={`rounded-[1.5rem] border p-4 ${cardClass}`}>
            <h4 className="text-lg font-bold">{draft.sections.media.title}</h4>
            <p className={`mt-2 text-sm leading-6 ${mutedClass}`}>{draft.sections.media.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mediaItems.slice(0, 4).map((item, index) => (
              <div key={`media-preview-${index}`} className={`overflow-hidden rounded-[1.25rem] border ${cardClass}`}>
                {item.kind === 'video' ? (
                  <video src={getOptimizedMedia(item.src)} controls preload="metadata" className="h-28 w-full object-cover" />
                ) : (
                  <img src={getOptimizedMedia(item.src)} alt="" loading="lazy" className="h-28 w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'headline':
      return (
        <div className={`rounded-[1.75rem] border p-5 ${cardClass}`}>
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'bg-white/10 text-white' : 'bg-[#eef7f6] text-[#0E7C7B]'}`}>
            {draft.sections.headline.eyebrow}
          </span>
          <h4 className="mt-4 text-2xl font-bold tracking-[-0.02em]">{draft.sections.headline.title}</h4>
          <p className={`mt-3 text-sm leading-6 ${mutedClass}`}>{draft.sections.headline.description}</p>
        </div>
      );

    case 'alerts':
      return alert ? (
        <div className="space-y-3">
          <div className="rounded-[1.5rem] border border-orange-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#ffedd5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ea580c]">
                {alert.badge}
              </span>
              <span className="text-[11px] font-medium text-gray-400">Now</span>
            </div>
            <h4 className="mt-3 text-base font-bold text-gray-900">{alert.title}</h4>
            <p className="mt-2 text-sm leading-6 text-gray-600">{alert.message}</p>
          </div>
          <div className={`rounded-[1.5rem] border p-4 ${cardClass}`}>
            <p className={`text-xs leading-5 ${mutedClass}`}>
              Top alerts drop in one at a time on the real product page.
            </p>
          </div>
        </div>
      ) : null;

    case 'featureMarquee':
      return (
        <div className="space-y-4">
          {[marqueeImages.slice(0, 5), marqueeImages.slice(5, 10)].map((row, rowIndex) => (
            <div key={`marquee-row-${rowIndex}`} className="flex gap-3 overflow-hidden">
              {(row.length > 0 ? row : marqueeImages.slice(0, 4)).map((item, index) => (
                <div
                  key={`marquee-image-${rowIndex}-${index}`}
                  className={`h-28 w-24 shrink-0 overflow-hidden rounded-[1.25rem] border ${cardClass}`}
                >
                  {hasMedia(item) ? (
                    <img src={getOptimizedMedia(item.src)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className={`h-full w-full ${shellClass}`} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    case 'problem':
    case 'features':
    case 'aboutProduct': {
      const section = draft.sections[sectionId];
      const cards = section.items.filter((item) => isFilled(item.title) || isFilled(item.description));
      return (
        <div className="space-y-3">
          <div className={`rounded-[1.5rem] border p-4 ${cardClass}`}>
            <h4 className="text-lg font-bold">{section.title}</h4>
            <p className={`mt-2 text-sm leading-6 ${mutedClass}`}>{section.subtitle}</p>
          </div>
          {cards.slice(0, 3).map((item, index) => (
            <div key={`${sectionId}-card-${index}`} className={`rounded-[1.5rem] border p-4 ${cardClass}`}>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className={`mt-2 text-sm leading-6 ${mutedClass}`}>{item.description}</p>
            </div>
          ))}
        </div>
      );
    }

    case 'solution':
      return (
        <div className={`overflow-hidden rounded-[1.75rem] border ${cardClass}`}>
          {hasMedia(draft.sections.solution.image) ? (
            <img
              src={getOptimizedMedia(draft.sections.solution.image.src)}
              alt={draft.sections.solution.title}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
          ) : null}
          <div className="space-y-3 p-4">
            <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'bg-white/10 text-white' : 'bg-[#eef7f6] text-[#0E7C7B]'}`}>
              {draft.sections.solution.badge}
            </span>
            <h4 className="text-xl font-bold">{draft.sections.solution.title}</h4>
            <p className={`text-sm leading-6 ${mutedClass}`}>{draft.sections.solution.description}</p>
            <div className="space-y-2">
              {draft.sections.solution.features.slice(0, 3).map((item, index) => (
                <div key={`solution-feature-${index}`} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#0E7C7B]" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <button className="w-full rounded-full bg-[#0E7C7B] px-4 py-3 text-sm font-semibold text-white">
              {draft.sections.solution.ctaText}
            </button>
          </div>
        </div>
      );

    case 'showcase':
      return (
        <div className="space-y-3">
          {completedShowcaseImages[0] ? (
            <div className={`overflow-hidden rounded-[1.5rem] border ${cardClass}`}>
              <img
                src={getOptimizedMedia(completedShowcaseImages[0].src)}
                alt={draft.sections.showcase.title}
                loading="lazy"
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-3">
            {completedShowcaseImages.slice(1, 4).map((item, index) => (
              <div key={`showcase-thumb-${index}`} className={`h-24 overflow-hidden rounded-[1.25rem] border ${cardClass}`}>
                <img src={getOptimizedMedia(item.src)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'testimonials':
      if (!review) {
        return null;
      }

      return (
        <div className={`overflow-hidden rounded-[1.75rem] border ${cardClass}`}>
          <div className="relative">
            {hasMedia(review.image) ? (
              <img src={getOptimizedMedia(review.image.src)} alt={review.name} loading="lazy" className="h-64 w-full object-cover" />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-white">
              <div className="flex items-center gap-1 text-[#fbbf24]">
                {Array.from({ length: Math.max(1, Math.min(5, review.rating)) }).map((_, index) => (
                  <span key={`star-${index}`}>★</span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6">{review.text}</p>
              <div className="mt-4">
                <p className="text-sm font-semibold">
                  {getDeterministicCustomerNameForIndex({
                    customerIdentityPools: draft.customerIdentityPools,
                    countryCode,
                    genderTarget: draft.genderTarget,
                    index: draft.sections.testimonials.reviews.indexOf(review),
                    seed: `${review.text}-${review.image.src}`,
                    fallbackName: review.name || 'Verified Customer',
                  })}
                </p>
                <p className="text-xs text-white/70">
                  Auto-switched for {getCountryCustomerPoolLabel(countryCode)}
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'subscription':
      return (
        <div className={`rounded-[1.75rem] border p-5 ${cardClass}`}>
          <h4 className="text-lg font-bold">{draft.sections.subscription.title}</h4>
          <p className={`mt-3 text-sm leading-6 ${mutedClass}`}>{draft.sections.subscription.subtitle}</p>
          <button className="mt-5 w-full rounded-full bg-[#0E7C7B] px-4 py-3 text-sm font-semibold text-white">
            {draft.sections.subscription.buttonLabel}
          </button>
        </div>
      );

    case 'offer':
      return (
        <div className="space-y-3">
          {draft.sections.offer.packages.slice(0, 2).map((item, index) => (
            <div key={`offer-package-${index}`} className={`rounded-[1.5rem] border p-4 ${cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className={`mt-1 text-xs ${mutedClass}`}>{item.description}</p>
                </div>
                {item.isBestValue ? (
                  <span className="rounded-full bg-[#ffedd5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ea580c]">
                    Best value
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-end gap-3">
                <p className="text-2xl font-bold">{formatDraftCurrency(item.price, draft.currency)}</p>
                <p className={`text-sm line-through ${mutedClass}`}>{formatDraftCurrency(item.oldPrice, draft.currency)}</p>
              </div>
            </div>
          ))}
        </div>
      );

    case 'orderForm':
      return (
        <div className={`rounded-[1.75rem] border p-5 ${cardClass}`}>
          <h4 className="text-lg font-bold">{draft.sections.orderForm.title}</h4>
          <p className={`mt-2 text-sm leading-6 ${mutedClass}`}>{draft.sections.orderForm.subtitle}</p>
          <div className="mt-4 space-y-3">
            <div className={`h-11 rounded-2xl border ${cardClass}`} />
            <div className={`h-11 rounded-2xl border ${cardClass}`} />
            <div className={`h-11 rounded-2xl border ${cardClass}`} />
          </div>
          {draft.sections.orderForm.enableTokenField ? (
            <p className="mt-4 text-sm text-[#0E7C7B]">{draft.sections.orderForm.tokenPrompt}</p>
          ) : null}
          <button className="mt-5 w-full rounded-full bg-[#0E7C7B] px-4 py-3 text-sm font-semibold text-white">
            {draft.sections.orderForm.submitButtonLabel}
          </button>
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-3">
          {draft.sections.faq.items.slice(0, 3).map((item, index) => (
            <div key={`faq-preview-${index}`} className={`rounded-[1.5rem] border p-4 ${cardClass}`}>
              <p className="text-sm font-semibold">{item.question}</p>
              <p className={`mt-2 text-sm leading-6 ${mutedClass}`}>{item.answer}</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LivePreviewSidebar({
  draft,
  sections,
  selectedSectionId,
  onSelectSection,
  onClose,
  mobile = false,
}: {
  draft: AdminProductDraft;
  sections: LivePreviewSection[];
  selectedSectionId: PreviewSectionId | null;
  onSelectSection: (value: PreviewSectionId) => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const activeSection = sections.find((section) => section.id === selectedSectionId) ?? null;
  const completedCount = sections.filter((section) => section.complete).length;
  const isDark = draft.themeMode === 'dark';

  return (
    <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef7f6] text-[#0E7C7B]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mobile Live Preview</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Preview finished sections inside a mobile frame while you build.
            </p>
          </div>
        </div>

        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 transition hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#eef7f6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0E7C7B]">
          {completedCount} sections ready
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
          {sections.length - completedCount} pending
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            disabled={!section.complete}
            onClick={() => onSelectSection(section.id)}
            className={`flex w-full items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left transition ${
              selectedSectionId === section.id
                ? 'border-[#0E7C7B] bg-[#eef7f6]'
                : 'border-gray-200 bg-white'
            } ${section.complete ? 'hover:border-[#0E7C7B]/30' : 'cursor-not-allowed opacity-55'}`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{section.title}</p>
              <p className="mt-1 text-xs text-gray-500">{section.description}</p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              {section.complete ? (
                <CheckCircle2 className="h-4 w-4 text-[#0E7C7B]" />
              ) : (
                <Lock className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <div className="w-[300px] rounded-[2.5rem] bg-slate-950 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className={`overflow-hidden rounded-[2rem] ${isDark ? 'bg-slate-950 text-white' : 'bg-[#f8f8f8] text-gray-900'}`}>
            <div className={`flex items-center justify-between px-4 py-3 text-[11px] font-semibold ${isDark ? 'text-white/80' : 'text-gray-500'}`}>
              <span>9:41</span>
              <span>{draft.pageName}</span>
            </div>
            <div className="max-h-[520px] space-y-4 overflow-y-auto px-3 pb-4">
              {activeSection ? (
                <>
                  <div className={`rounded-[1.25rem] border px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                    <p className="text-sm font-semibold">{activeSection.title}</p>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {activeSection.description}
                    </p>
                  </div>
                  <SectionPreviewContent draft={draft} sectionId={activeSection.id} />
                </>
              ) : (
                <div className={`rounded-[1.75rem] border p-6 text-center ${isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-900'}`}>
                  <Smartphone className="mx-auto h-8 w-8 text-[#0E7C7B]" />
                  <p className="mt-4 text-sm font-semibold">No preview unlocked yet</p>
                  <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Fill the required fields in a section and it will become active here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TemplateEditorCanvas({
  draft,
  deviceView,
  sections,
  onEditPageSetup,
  onEditSection,
}: {
  draft: AdminProductDraft;
  deviceView: BuilderDeviceView;
  sections: LivePreviewSection[];
  onEditPageSetup: () => void;
  onEditSection: (sectionId: PreviewSectionId) => void;
}) {
  const isMobileView = deviceView === 'mobile';

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className={sectionChipClasses}>Template editor</span>
              <span className={sectionChipClasses}>{deviceView} view</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Click any section of the current product page template to edit its content.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              The design stays locked. Admin can only replace content, text, images and videos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Page setup</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{draft.pageName}</p>
              <p className="mt-1 text-xs text-gray-500">
                {draft.targetAudience} • {draft.currency} • {draft.themeMode} mode
              </p>
            </div>
            <button
              type="button"
              onClick={onEditPageSetup}
              className="rounded-[1.5rem] border border-[#0E7C7B]/15 bg-[#eef7f6] px-4 py-4 text-left transition hover:bg-[#e2f2f0]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[#0E7C7B]">Edit</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">Page setup and theme</p>
              <p className="mt-1 text-xs text-gray-600">
                Update page name, product name, audience, currency and theme.
              </p>
            </button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Other Page Sections</h3>
            <p className="mt-1 text-sm text-gray-600">
              Select any remaining section to open its content editor popup.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
            {sections.length} sections
          </span>
        </div>

        <div className="mt-6 flex justify-center">
          <div
            className={
              isMobileView
                ? 'w-full max-w-[390px] rounded-[2.8rem] bg-slate-950 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.22)]'
                : 'w-full max-w-5xl rounded-[2.25rem] border border-gray-200 bg-[#f8f8f8] p-4 shadow-inner'
            }
          >
            <div
              className={
                isMobileView
                  ? `overflow-hidden rounded-[2.1rem] ${draft.themeMode === 'dark' ? 'bg-slate-950 text-white' : 'bg-[#f8f8f8] text-gray-900'}`
                  : `${draft.themeMode === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'} rounded-[1.75rem]`
              }
            >
              {isMobileView ? (
                <div className={`flex items-center justify-between px-4 py-3 text-[11px] font-semibold ${draft.themeMode === 'dark' ? 'text-white/80' : 'text-gray-500'}`}>
                  <span>9:41</span>
                  <span>{draft.pageName}</span>
                </div>
              ) : (
                <div className={`border-b px-5 py-4 ${draft.themeMode === 'dark' ? 'border-slate-800 text-slate-300' : 'border-gray-200 text-gray-500'}`}>
                  <p className="text-xs uppercase tracking-[0.18em]">Current product page template</p>
                </div>
              )}

              <div className="space-y-4 px-3 pb-4 pt-2 sm:px-4 sm:pb-5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onEditSection(section.id)}
                    className={`block w-full overflow-hidden rounded-[1.75rem] border text-left transition ${
                      section.active
                        ? draft.themeMode === 'dark'
                          ? 'border-slate-800 bg-slate-950 hover:border-[#0E7C7B]/40'
                          : 'border-gray-200 bg-white hover:border-[#0E7C7B]/30'
                        : 'border-dashed border-gray-200 bg-gray-50 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-black/5 px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className={`mt-1 text-xs ${draft.themeMode === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {section.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          section.active
                            ? draft.themeMode === 'dark'
                              ? 'bg-white/10 text-white'
                              : 'bg-[#eef7f6] text-[#0E7C7B]'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {section.active ? 'Visible' : 'Hidden'}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          section.complete ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fff7ed] text-[#c2410c]'
                        }`}>
                          {section.complete ? 'Ready' : 'Needs content'}
                        </span>
                      </div>
                    </div>

                    <div className="pointer-events-none p-4">
                      {section.complete ? (
                        <SectionPreviewContent draft={draft} sectionId={section.id} />
                      ) : (
                        <div className={`rounded-[1.5rem] border border-dashed p-5 ${draft.themeMode === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                          <p className="text-sm font-semibold">Section not fully set up yet</p>
                          <p className="mt-2 text-sm leading-6">
                            Open this section and replace the default mock content with your real
                            text, images or videos.
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ElementEditorModal({
  target,
  draft,
  setTopLevel,
  patchSection,
  onChangeDraft,
  handlePageNameChange,
  handleProductNameChange,
  handleCategoryChange,
  handleSubcategoryChange,
  orderedTargets,
  currentIndex,
  nextTarget,
  onClose,
  onSave,
  onSaveAndNext,
  saving,
}: {
  target: EditorTargetId | null;
  draft: AdminProductDraft;
  setTopLevel: SetTopLevelFn;
  patchSection: PatchSectionFn;
  onChangeDraft: (value: AdminProductDraft) => void;
  handlePageNameChange: (value: string) => void;
  handleProductNameChange: (value: string) => void;
  handleCategoryChange: (categoryId: string) => void;
  handleSubcategoryChange: (subcategorySlug: string) => void;
  orderedTargets: EditorTargetId[];
  currentIndex: number;
  nextTarget: EditorTargetId | null;
  onClose: () => void;
  onSave: () => void;
  onSaveAndNext: () => void;
  saving: boolean;
}) {
  if (!target) {
    return null;
  }

  const title = getEditorTargetLabel(target);
  const isStorySection = ['hero', 'seeInAction', 'media', 'headline', 'alerts', 'featureMarquee', 'problem', 'solution', 'features', 'aboutProduct'].includes(target);
  const stepLabel =
    currentIndex >= 0 ? `Step ${currentIndex + 1} of ${orderedTargets.length}` : null;
  const nextTargetLabel = nextTarget ? getEditorTargetLabel(nextTarget) : null;
  const editorComplete = isEditorTargetComplete(draft, target);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close editor"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-0 sm:inset-0 sm:items-center sm:px-6">
        <div className="relative flex h-[92vh] w-full flex-col overflow-y-auto rounded-t-[2rem] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:rounded-[2rem]">
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-gray-200 sm:hidden" />

          <div className="border-b border-gray-200 bg-white px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className={sectionChipClasses}>Click-to-edit</span>
                <span className={sectionChipClasses}>{title}</span>
                {stepLabel ? <span className={sectionChipClasses}>{stepLabel}</span> : null}
              </div>
              <h2 className="mt-3 text-xl font-bold text-gray-900">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Update section content only. The template design and layout remain locked.
              </p>
              {editorComplete && nextTargetLabel ? (
                <p className="mt-2 text-sm font-medium text-[#0E7C7B]">
                  Next section: {nextTargetLabel}
                </p>
              ) : editorComplete ? (
                <p className="mt-2 text-sm font-medium text-[#0E7C7B]">
                  This is the last step in the current section flow.
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-[#c2410c]">
                  Fill the required fields for this section to unlock save actions.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 transition hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="space-y-6">
              {target === 'pageSetup' ? (
                <CoreSettingsSections
                  draft={draft}
                  setTopLevel={setTopLevel}
                  handlePageNameChange={handlePageNameChange}
                  handleProductNameChange={handleProductNameChange}
                  handleCategoryChange={handleCategoryChange}
                  handleSubcategoryChange={handleSubcategoryChange}
                  onChangeDraft={onChangeDraft}
                />
              ) : isStorySection ? (
                <StorySections draft={draft} patchSection={patchSection} onlySectionId={target} />
              ) : (
                <CommerceSections draft={draft} patchSection={patchSection} onlySectionId={target} />
              )}
            </div>
          </div>

          {editorComplete ? (
            <div className="hidden flex-col gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:flex sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-xs leading-5 text-gray-500">
                Save this section, then move straight into the next section without leaving the editor.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  Close editor
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-2xl"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : target === 'pageSetup' ? 'Save Setup' : 'Save Section'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={onSaveAndNext}
                  disabled={saving}
                  className="rounded-2xl"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? 'Saving...'
                    : nextTarget
                      ? `Save and Open ${nextTargetLabel}`
                      : 'Save and Finish'}
                </Button>
              </div>
            </div>
          ) : null}

          {editorComplete ? (
            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-5 py-4 sm:hidden">
              <div className="space-y-3">
                <div className="text-xs leading-5 text-gray-500">
                  Save this section to continue to the next step.
                </div>
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    Close editor
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={onSave}
                    disabled={saving}
                    className="rounded-2xl"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : target === 'pageSetup' ? 'Save Setup' : 'Save Section'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={onSaveAndNext}
                    disabled={saving}
                    className="rounded-2xl"
                  >
                    <Save className="h-4 w-4" />
                    {saving
                      ? 'Saving...'
                      : nextTarget
                        ? `Save and Open ${nextTargetLabel}`
                        : 'Save and Finish'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CoreSettingsSections({
  draft,
  setTopLevel,
  handlePageNameChange,
  handleProductNameChange,
  handleCategoryChange,
  handleSubcategoryChange,
  onChangeDraft,
}: {
  draft: AdminProductDraft;
  setTopLevel: SetTopLevelFn;
  handlePageNameChange: (value: string) => void;
  handleProductNameChange: (value: string) => void;
  handleCategoryChange: (categoryId: string) => void;
  handleSubcategoryChange: (subcategorySlug: string) => void;
  onChangeDraft: (value: AdminProductDraft) => void;
}) {
  const subcategoryOptions = getProductSubcategories(draft.categoryId);

  return (
    <>
      <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef7f6] text-[#0E7C7B]">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Key Market Settings</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              These are the core settings every new product page should define first: currency,
              target audience, page name, product name, category and gender target.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <CompactEditorSection
            title="Identity and market"
            summary="Page name, product name, URL slug, currency and target market."
            defaultOpen
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField label="Page name" value={draft.pageName} onChange={handlePageNameChange} placeholder="Crevice Cleaning Brush Nigeria Page" />
              <TextField label="Product name" value={draft.productName} onChange={handleProductNameChange} placeholder="Crevice Cleaning Brush" />
              <TextField label="Page slug" value={draft.slug} onChange={(value) => setTopLevel('slug', normalizeSlug(value))} placeholder="crevice-cleaning-brush" hint="Used as the storefront URL path." />
              <SelectField label="Currency" value={draft.currency} options={currencyOptions.map((currency) => ({ value: currency, label: `${currency} - ${getCurrencyLabel(currency)}` }))} onChange={(value) => setTopLevel('currency', value)} />
              <TextField label="Target audience" value={draft.targetAudience} onChange={(value) => setTopLevel('targetAudience', value)} placeholder="Nigeria" hint="Examples: Nigeria, Ghana, Kenya, Women in Lagos, Parents in Abuja." />
              <Label hint="Use Save Draft to keep this page private, or Publish to make it appear on the homepage.">
                Current status
                <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-gray-900">{draft.status}</p>
                </div>
              </Label>
            </div>
          </CompactEditorSection>

          <CompactEditorSection
            title="Category and audience setup"
            summary="Choose the top-level category, subcategory and gender target."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SelectField label="Top-level category" value={draft.categoryId} options={PRODUCT_CATEGORIES.map((category) => ({ value: category.id, label: category.name }))} onChange={handleCategoryChange} />
              <SelectField label="Subcategory" value={draft.subcategorySlug} options={subcategoryOptions.map((subcategory) => ({ value: subcategory.slug, label: subcategory.name }))} onChange={handleSubcategoryChange} hint={`Category page route: /category/${draft.subcategorySlug}`} />
              <SelectField label="Gender target" value={draft.genderTarget} options={genderOptions} onChange={(value) => setTopLevel('genderTarget', value)} />
            </div>
          </CompactEditorSection>

          <CompactEditorSection
            title="Pricing"
            summary="Base price and purchase cost drive package pricing, finance and inventory profit."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Base price" type="number" value={draft.basePrice} onChange={(value) => setTopLevel('basePrice', Number(value) || 0)} placeholder="15000" hint={`Quick summary price shown in admin cards as ${formatDraftCurrency(draft.basePrice, draft.currency)}`} />
              <TextField label="Purchase cost price" type="number" value={draft.purchaseCost} onChange={(value) => setTopLevel('purchaseCost', Number(value) || 0)} placeholder="6500" hint="Required before publish. Finance uses this to estimate margin and product performance." />
            </div>
          </CompactEditorSection>

          <CompactEditorSection
            title="Description and cover media"
            summary="Keep this closed until you need to update the short summary or fallback cover image."
          >
            <div className="space-y-5">
              <TextAreaField label="Short description" value={draft.shortDescription} onChange={(value) => setTopLevel('shortDescription', value)} placeholder="Short product summary used for previews, cards and quick admin review." rows={4} />
              <MediaAssetField label="Primary cover image" description="Used in draft previews, admin product cards and as a fallback hero visual." asset={draft.coverImage} kind="image" onChange={(value) => setTopLevel('coverImage', value)} />
            </div>
          </CompactEditorSection>
        </div>
      </Card>

      <ProductLibraryManager
        draft={draft}
        onChange={(value) => onChangeDraft(normalizeAdminProductDraft(value))}
      />

      <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7f6] text-[#0E7C7B]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Theme Selection</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Only light mode and dark mode are available for now.
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = draft.themeMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTopLevel('themeMode', option.value)}
                  className={`rounded-[1.5rem] border px-5 py-4 text-left transition ${
                    selected
                      ? 'border-[#0E7C7B] bg-[#eef7f6] text-[#0E7C7B] shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        selected ? 'bg-white text-[#0E7C7B]' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {option.value === 'light'
                          ? 'Bright, clean storefront presentation'
                          : 'Dark, high-contrast storefront presentation'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </>
  );
}

function StorySections({
  draft,
  patchSection,
  onlySectionId,
}: {
  draft: AdminProductDraft;
  patchSection: PatchSectionFn;
  onlySectionId?: PreviewSectionId;
}) {
  return (
    <>
      {(!onlySectionId || onlySectionId === 'hero') ? (
      <SectionCard
        icon={Layers3}
        title="Hero Section"
        description="Control the top sales message, hero benefits, offers and the main hero image."
        visible={draft.sections.hero.visible}
        onVisibleChange={(value) => patchSection('hero', { visible: value })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Badge"
            value={draft.sections.hero.badge}
            onChange={(value) => patchSection('hero', { badge: value })}
            placeholder="Limited Time Offer"
          />
          <TextField
            label="Primary CTA"
            value={draft.sections.hero.ctaText}
            onChange={(value) => patchSection('hero', { ctaText: value })}
            placeholder="Order now - pay on delivery"
          />
        </div>

        <TextField
          label="Hero title"
          value={draft.sections.hero.title}
          onChange={(value) => patchSection('hero', { title: value })}
          placeholder="Deep-Clean Every Corner with Ease"
        />

        <TextAreaField
          label="Hero subtitle"
          value={draft.sections.hero.subtitle}
          onChange={(value) => patchSection('hero', { subtitle: value })}
          placeholder="Add the main conversion message that introduces the product clearly."
        />

        <StringListEditor
          label="Hero benefit bullets"
          items={draft.sections.hero.benefits}
          onChange={(benefits) => patchSection('hero', { benefits })}
          placeholder="Primary benefit"
        />

        <OfferHighlightsEditor
          items={draft.sections.hero.offers}
          onChange={(offers) => patchSection('hero', { offers })}
        />

        <MediaListEditor
          label="Hero carousel images"
          description="Upload multiple hero images for the carousel. The first filled image becomes the primary hero cover."
          items={draft.sections.hero.images}
          reorderable
          primaryLabel="Primary hero slide"
          onChange={(images) =>
            patchSection('hero', {
              images,
              image: getPrimaryHeroAsset(images),
            })
          }
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'seeInAction') ? (
      <SectionCard
        icon={FileVideo}
        title="See in Action Section"
        description="Configure the first video block that sits close to the hero."
        visible={draft.sections.seeInAction.visible}
        onVisibleChange={(value) => patchSection('seeInAction', { visible: value })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Badge"
            value={draft.sections.seeInAction.badge}
            onChange={(value) => patchSection('seeInAction', { badge: value })}
            placeholder="See It in Action"
          />
          <TextField
            label="Section title"
            value={draft.sections.seeInAction.title}
            onChange={(value) => patchSection('seeInAction', { title: value })}
            placeholder="See It in Action"
          />
        </div>

        <TextAreaField
          label="Subtitle"
          value={draft.sections.seeInAction.subtitle}
          onChange={(value) => patchSection('seeInAction', { subtitle: value })}
          placeholder="Upload a short demo video or poster frame for this section."
        />

        <MediaAssetField
          label="Poster image"
          description="Poster shown before the video plays."
          asset={draft.sections.seeInAction.poster}
          kind="image"
          onChange={(value) => patchSection('seeInAction', { poster: value })}
        />

        <MediaAssetField
          label="Video asset"
          description="Upload a device video or paste a direct video URL."
          asset={draft.sections.seeInAction.video}
          kind="video"
          onChange={(value) => patchSection('seeInAction', { video: value })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'media') ? (
      <SectionCard
        icon={Layers3}
        title="Media Section"
        description="Add up to 5 images, GIFs or videos directly below the See in Action section."
        visible={draft.sections.media.visible}
        onVisibleChange={(value) => patchSection('media', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.media.title}
          onChange={(value) => patchSection('media', { title: value })}
          placeholder="Media Section"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.media.subtitle}
          onChange={(value) => patchSection('media', { subtitle: value })}
          placeholder="Upload extra proof, demos, transformations or motion shots here."
        />
        <MixedMediaListEditor
          label="Section media"
          description="Supports up to 5 mixed media items. GIF uploads count as images."
          items={draft.sections.media.items}
          displaySize={draft.sections.media.displaySize}
          onDisplaySizeChange={(displaySize) => patchSection('media', { displaySize })}
          onChange={(items) => patchSection('media', { items: items.slice(0, 5) })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'headline') ? (
      <SectionCard
        icon={BadgePercent}
        title="Product Headline Text"
        description="Use this section below the first video to reinforce the key product message."
        visible={draft.sections.headline.visible}
        onVisibleChange={(value) => patchSection('headline', { visible: value })}
      >
        <TextField
          label="Eyebrow"
          value={draft.sections.headline.eyebrow}
          onChange={(value) => patchSection('headline', { eyebrow: value })}
          placeholder="Product Headline"
        />
        <TextField
          label="Headline title"
          value={draft.sections.headline.title}
          onChange={(value) => patchSection('headline', { title: value })}
          placeholder="Headline text section"
        />
        <TextAreaField
          label="Headline description"
          value={draft.sections.headline.description}
          onChange={(value) => patchSection('headline', { description: value })}
          placeholder="Use this section to reinforce the core message below the first video block."
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'alerts') ? (
      <SectionCard
        icon={Sparkles}
        title="Top Popup Alerts"
        description="Manage the mobile-style alert cards that drop from the top of the product page."
        visible={draft.sections.alerts.visible}
        onVisibleChange={(value) => patchSection('alerts', { visible: value })}
      >
        <AlertItemsEditor
          items={draft.sections.alerts.items}
          onChange={(items) => patchSection('alerts', { items })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'featureMarquee') ? (
      <SectionCard
        icon={FileImage}
        title="Product Features Marquee"
        description="These images feed the two continuous marquee rows below the hero on the product page."
        visible={draft.sections.featureMarquee.visible}
        onVisibleChange={(value) => patchSection('featureMarquee', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.featureMarquee.title}
          onChange={(value) => patchSection('featureMarquee', { title: value })}
          placeholder="Feature Marquee"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.featureMarquee.subtitle}
          onChange={(value) => patchSection('featureMarquee', { subtitle: value })}
          placeholder="Image-only marquee row for product visuals and supporting angles."
        />
        <MediaListEditor
          label="Marquee images"
          description="Add all images used in the up/down marquee motion."
          items={draft.sections.featureMarquee.images}
          onChange={(images) => patchSection('featureMarquee', { images })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'problem') ? (
      <SectionCard
        icon={HelpCircle}
        title="Problem Section"
        description="Define the shopper pain points the product solves."
        visible={draft.sections.problem.visible}
        onVisibleChange={(value) => patchSection('problem', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.problem.title}
          onChange={(value) => patchSection('problem', { title: value })}
          placeholder="Still Struggling to Clean Tight Corners?"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.problem.subtitle}
          onChange={(value) => patchSection('problem', { subtitle: value })}
          placeholder="Describe the pain points the product solves."
        />
        <ContentCardsEditor
          label="Problem cards"
          items={draft.sections.problem.items}
          onChange={(items) => patchSection('problem', { items })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'solution') ? (
      <SectionCard
        icon={Sparkles}
        title="Solution Section"
        description="Present the product as the answer with supporting features and a section image."
        visible={draft.sections.solution.visible}
        onVisibleChange={(value) => patchSection('solution', { visible: value })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Badge"
            value={draft.sections.solution.badge}
            onChange={(value) => patchSection('solution', { badge: value })}
            placeholder="The Solution"
          />
          <TextField
            label="CTA text"
            value={draft.sections.solution.ctaText}
            onChange={(value) => patchSection('solution', { ctaText: value })}
            placeholder="Buy Now"
          />
        </div>
        <TextField
          label="Solution title"
          value={draft.sections.solution.title}
          onChange={(value) => patchSection('solution', { title: value })}
          placeholder="Present the product as the answer"
        />
        <TextAreaField
          label="Description"
          value={draft.sections.solution.description}
          onChange={(value) => patchSection('solution', { description: value })}
          placeholder="Explain how the product solves the user problem."
        />
        <StringListEditor
          label="Solution feature bullets"
          items={draft.sections.solution.features}
          onChange={(features) => patchSection('solution', { features })}
          placeholder="Key benefit one"
        />
        <MediaAssetField
          label="Solution image"
          description="Main image shown alongside the product solution copy."
          asset={draft.sections.solution.image}
          kind="image"
          onChange={(value) => patchSection('solution', { image: value })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'features') ? (
      <SectionCard
        icon={Sparkles}
        title="Product Features Section"
        description="Use these cards to explain the strongest reasons to buy."
        visible={draft.sections.features.visible}
        onVisibleChange={(value) => patchSection('features', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.features.title}
          onChange={(value) => patchSection('features', { title: value })}
          placeholder="Features Section"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.features.subtitle}
          onChange={(value) => patchSection('features', { subtitle: value })}
          placeholder="Highlight the strongest reasons to buy."
        />
        <ContentCardsEditor
          label="Feature cards"
          items={draft.sections.features.items}
          onChange={(items) => patchSection('features', { items })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'aboutProduct') ? (
      <SectionCard
        icon={Package2}
        title="About Product Section"
        description="This replaces the old How to Use section and explains what the product is, how it is built and why it stands out."
        visible={draft.sections.aboutProduct.visible}
        onVisibleChange={(value) => patchSection('aboutProduct', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.aboutProduct.title}
          onChange={(value) => patchSection('aboutProduct', { title: value })}
          placeholder="About This Product"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.aboutProduct.subtitle}
          onChange={(value) => patchSection('aboutProduct', { subtitle: value })}
          placeholder="Tell shoppers what the product is, how it is built and why it stands out."
        />
        <ContentCardsEditor
          label="About product cards"
          items={draft.sections.aboutProduct.items}
          onChange={(items) => patchSection('aboutProduct', { items })}
        />
      </SectionCard>
      ) : null}
    </>
  );
}

function CommerceSections({
  draft,
  patchSection,
  onlySectionId,
}: {
  draft: AdminProductDraft;
  patchSection: PatchSectionFn;
  onlySectionId?: PreviewSectionId;
}) {
  const { countryCode } = useLocale();

  return (
    <>
      {(!onlySectionId || onlySectionId === 'showcase') ? (
      <SectionCard
        icon={FileImage}
        title="See the Quality for Yourself"
        description="Upload all product images used in the 3D showcase or image-only carousel section."
        visible={draft.sections.showcase.visible}
        onVisibleChange={(value) => patchSection('showcase', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.showcase.title}
          onChange={(value) => patchSection('showcase', { title: value })}
          placeholder="See the Quality for Yourself"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.showcase.subtitle}
          onChange={(value) => patchSection('showcase', { subtitle: value })}
          placeholder="Upload product angles and close-up visuals."
        />
        <MediaListEditor
          label="Showcase images"
          description="Add all image cards used in the quality showcase carousel."
          items={draft.sections.showcase.images}
          onChange={(images) => patchSection('showcase', { images })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'testimonials') ? (
      <SectionCard
        icon={Sparkles}
        title="Customer Reviews"
        description="Control the image-based review cards with dark vintage overlay styling."
        visible={draft.sections.testimonials.visible}
        onVisibleChange={(value) => patchSection('testimonials', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.testimonials.title}
          onChange={(value) => patchSection('testimonials', { title: value })}
          placeholder="What Customers Are Saying"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.testimonials.subtitle}
          onChange={(value) => patchSection('testimonials', { subtitle: value })}
          placeholder="Add social proof with customer photos and quotes."
        />
        <ReviewEditor
          reviews={draft.sections.testimonials.reviews}
          onChange={(reviews) => patchSection('testimonials', { reviews })}
          customerIdentityPools={draft.customerIdentityPools}
          genderTarget={draft.genderTarget}
          previewCountryCode={countryCode}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'footerVideo') ? (
      <SectionCard
        icon={FileVideo}
        title="Footer Video Section"
        description="Configure the second video placeholder shown closer to the footer."
        visible={draft.sections.footerVideo.visible}
        onVisibleChange={(value) => patchSection('footerVideo', { visible: value })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Badge"
            value={draft.sections.footerVideo.badge}
            onChange={(value) => patchSection('footerVideo', { badge: value })}
            placeholder="Footer Video Slot"
          />
          <TextField
            label="Section title"
            value={draft.sections.footerVideo.title}
            onChange={(value) => patchSection('footerVideo', { title: value })}
            placeholder="Watch the Full Walkthrough"
          />
        </div>
        <TextAreaField
          label="Subtitle"
          value={draft.sections.footerVideo.subtitle}
          onChange={(value) => patchSection('footerVideo', { subtitle: value })}
          placeholder="Add a second video slot closer to the footer."
        />
        <MediaAssetField
          label="Footer video poster"
          description="Poster image shown before the lower video plays."
          asset={draft.sections.footerVideo.poster}
          kind="image"
          onChange={(value) => patchSection('footerVideo', { poster: value })}
        />
        <MediaAssetField
          label="Footer video"
          description="Upload a local file or paste a direct video URL."
          asset={draft.sections.footerVideo.video}
          kind="video"
          onChange={(value) => patchSection('footerVideo', { video: value })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'subscription') ? (
      <SectionCard
        icon={BadgePercent}
        title="Subscription Section"
        description="Configure the collapsible subscriber token section and its learn-more messaging."
        visible={draft.sections.subscription.visible}
        onVisibleChange={(value) => patchSection('subscription', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.subscription.title}
          onChange={(value) => patchSection('subscription', { title: value })}
          placeholder="Subscribe for Exclusive Discounts"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.subscription.subtitle}
          onChange={(value) => patchSection('subscription', { subtitle: value })}
          placeholder="Collect subscriber details and generate reusable customer tokens."
        />
        <TextField
          label="Primary button label"
          value={draft.sections.subscription.buttonLabel}
          onChange={(value) => patchSection('subscription', { buttonLabel: value })}
          placeholder="Subscribe Now"
        />
        <TextAreaField
          label="Privacy note"
          value={draft.sections.subscription.privacyNote}
          onChange={(value) => patchSection('subscription', { privacyNote: value })}
          placeholder="We respect customer privacy and only collect what is required for token recovery."
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'offer') ? (
      <SectionCard
        icon={Package2}
        title="Packages, Pricing and Currency Setup"
        description="Set the main offer copy, promo pricing, old prices and card details used across the product page and checkout."
        visible={draft.sections.offer.visible}
        onVisibleChange={(value) => patchSection('offer', { visible: value })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Offer badge"
            value={draft.sections.offer.badge}
            onChange={(value) => patchSection('offer', { badge: value })}
            placeholder="Limited Time Deal"
          />
          <TextField
            label="Countdown hours"
            type="number"
            value={draft.sections.offer.countdownHours}
            onChange={(value) => patchSection('offer', { countdownHours: Number(value) || 0 })}
            placeholder="24"
          />
        </div>
        <TextField
          label="Offer title"
          value={draft.sections.offer.title}
          onChange={(value) => patchSection('offer', { title: value })}
          placeholder="Choose Your Package Before the Offer Ends"
        />
        <TextAreaField
          label="Offer subtitle"
          value={draft.sections.offer.subtitle}
          onChange={(value) => patchSection('offer', { subtitle: value })}
          placeholder="Set up your main package cards and promo pricing."
        />
        <PackageEditor
          currency={draft.currency}
          basePrice={draft.basePrice}
          packages={draft.sections.offer.packages}
          onChange={(packages) => patchSection('offer', { packages })}
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'orderForm') ? (
      <SectionCard
        icon={Package2}
        title="Main Order Form"
        description="Update the order form heading, CTA button, token-prompt link copy and optional token field behavior."
        visible={draft.sections.orderForm.visible}
        onVisibleChange={(value) => patchSection('orderForm', { visible: value })}
      >
        <TextField
          label="Order form title"
          value={draft.sections.orderForm.title}
          onChange={(value) => patchSection('orderForm', { title: value })}
          placeholder="Place Your Order Now"
        />
        <TextAreaField
          label="Order form subtitle"
          value={draft.sections.orderForm.subtitle}
          onChange={(value) => patchSection('orderForm', { subtitle: value })}
          placeholder="Configure the main order form copy and CTA."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Submit button label"
            value={draft.sections.orderForm.submitButtonLabel}
            onChange={(value) => patchSection('orderForm', { submitButtonLabel: value })}
            placeholder="Place My Order"
          />
          <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Enable token field</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Shows the dropdown token input when a shopper clicks the prompt link.
                </p>
              </div>
              <Toggle
                checked={draft.sections.orderForm.enableTokenField}
                onChange={(value) => patchSection('orderForm', { enableTokenField: value })}
              />
            </div>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4">
          <StringListEditor
            label="Sticky mobile CTA captions"
            items={draft.sections.orderForm.mobileStickyCtaTexts}
            onChange={(mobileStickyCtaTexts) => patchSection('orderForm', { mobileStickyCtaTexts })}
            placeholder="Claim today's free delivery offer"
          />
          <p className="mt-3 text-xs leading-5 text-gray-500">
            These captions rotate on the fixed mobile order button. Add, remove, or reorder by editing this list.
          </p>
        </div>
        <TextAreaField
          label="Token prompt text"
          value={draft.sections.orderForm.tokenPrompt}
          onChange={(value) => patchSection('orderForm', { tokenPrompt: value })}
          placeholder="Are you subscribed and want to insert your unique token for extra discount?"
        />
      </SectionCard>
      ) : null}

      {(!onlySectionId || onlySectionId === 'faq') ? (
      <SectionCard
        icon={HelpCircle}
        title="FAQ Section"
        description="This section now appears after the main order form and before the footer."
        visible={draft.sections.faq.visible}
        onVisibleChange={(value) => patchSection('faq', { visible: value })}
      >
        <TextField
          label="Section title"
          value={draft.sections.faq.title}
          onChange={(value) => patchSection('faq', { title: value })}
          placeholder="Frequently Asked Questions"
        />
        <TextAreaField
          label="Subtitle"
          value={draft.sections.faq.subtitle}
          onChange={(value) => patchSection('faq', { subtitle: value })}
          placeholder="Add concise answers that remove purchase friction."
        />
        <FaqEditor
          items={draft.sections.faq.items}
          onChange={(items) => patchSection('faq', { items })}
        />
      </SectionCard>
      ) : null}
    </>
  );
}

export function ProductBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateFrom = searchParams.get('duplicateFrom');
  const source = searchParams.get('source');

  const [draft, setDraft] = useState<AdminProductDraft | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [deviceView, setDeviceView] = useState<BuilderDeviceView>('desktop');
  const [activeEditorTarget, setActiveEditorTarget] = useState<EditorTargetId | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedPreviewSectionId, setSelectedPreviewSectionId] = useState<PreviewSectionId | null>(null);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveIntent, setSaveIntent] = useState<'draft' | 'publish' | 'delete' | null>(null);

  useEffect(() => {
    let isActive = true;

    void resolveInitialDraft(id, duplicateFrom, source).then((initialDraft) => {
      if (isActive) {
        setDraft(initialDraft);
      }
    });

    return () => {
      isActive = false;
    };
  }, [duplicateFrom, id, source]);

  const visibleSectionCount = useMemo(() => {
    if (!draft) {
      return 0;
    }

    return Object.values(draft.sections).filter((section) => section.visible).length;
  }, [draft]);

  const livePreviewSections = useMemo(() => {
    if (!draft) {
      return [] as LivePreviewSection[];
    }

    return getLivePreviewSections(draft);
  }, [draft]);

  const popupEditorSections = useMemo(
    () => livePreviewSections.filter((section) => !inlineEditableSectionIds.includes(section.id)),
    [livePreviewSections],
  );

  const orderedEditorTargets = useMemo(() => ['pageSetup'] as EditorTargetId[], []);

  const currentEditorIndex = useMemo(() => {
    if (!activeEditorTarget) {
      return -1;
    }

    return orderedEditorTargets.indexOf(activeEditorTarget);
  }, [activeEditorTarget, orderedEditorTargets]);

  const nextEditorTarget =
    currentEditorIndex >= 0 ? orderedEditorTargets[currentEditorIndex + 1] ?? null : null;

  useEffect(() => {
    const firstCompletedSection = popupEditorSections.find((section) => section.complete)?.id ?? null;

    setSelectedPreviewSectionId((current) => {
      if (current && popupEditorSections.some((section) => section.id === current && section.complete)) {
        return current;
      }

      return firstCompletedSection;
    });
  }, [popupEditorSections]);

  if (!draft) {
    return null;
  }

  const updateDraft = (updater: (current: AdminProductDraft) => AdminProductDraft) => {
    setDraft((current) => (current ? normalizeAdminProductDraft(updater(current)) : current));
  };

  const setTopLevel: SetTopLevelFn = (key, value) => {
    updateDraft((current) => ({ ...current, [key]: value }));
  };

  const patchSection: PatchSectionFn = (key, patch) => {
    updateDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [key]: {
          ...current.sections[key],
          ...patch,
        },
      },
    }));
  };

  const handlePageNameChange = (value: string) => {
    updateDraft((current) => {
      const currentDerivedSlug = normalizeSlug(current.pageName || current.productName);
      const nextSlug =
        !current.slug || current.slug === currentDerivedSlug
          ? normalizeSlug(value || current.productName)
          : current.slug;

      return {
        ...current,
        pageName: value,
        slug: nextSlug,
      };
    });
  };

  const handleProductNameChange = (value: string) => {
    updateDraft((current) => {
      const currentDerivedSlug = normalizeSlug(current.pageName || current.productName);
      const nextSlug =
        !current.slug || current.slug === currentDerivedSlug
          ? normalizeSlug(current.pageName || value)
          : current.slug;

      return {
        ...current,
        productName: value,
        slug: nextSlug,
      };
    });
  };

  const persistDraft = async (
    successMessage: string,
    statusOverride?: AdminProductDraft['status'],
    errorMessage = 'Saving failed. Check your Supabase connection or use a valid media URL.',
  ) => {
    setIsSaving(true);
    setSaveIntent(
      statusOverride === 'published' ? 'publish' : statusOverride === 'draft' ? 'draft' : null,
    );
    setSaveFeedback('');

    try {
      const savedDraft = await saveAdminProductDraft({
        ...draft,
        status: statusOverride ?? draft.status,
        updatedAt: new Date().toISOString(),
      });

      setDraft(savedDraft);
      setSaveFeedback(successMessage);
      return true;
    } catch {
      setSaveFeedback(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
      setSaveIntent(null);
    }
  };

  const handleSave = () => {
    void persistDraft(
      'Product page saved as draft. Publish it when you want it to appear on the homepage.',
      'draft',
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    updateDraft((current) => {
      const selection = resolveProductCategorySelection({ categoryId });

      return {
        ...current,
        category: selection.category.name,
        categoryId: selection.category.id,
        categorySlug: selection.category.slug,
        subcategory: selection.subcategory.name,
        subcategorySlug: selection.subcategory.slug,
      };
    });
  };

  const handleSubcategoryChange = (subcategorySlug: string) => {
    updateDraft((current) => {
      const selection = resolveProductCategorySelection({
        categoryId: current.categoryId,
        subcategorySlug,
      });

      return {
        ...current,
        category: selection.category.name,
        categoryId: selection.category.id,
        categorySlug: selection.category.slug,
        subcategory: selection.subcategory.name,
        subcategorySlug: selection.subcategory.slug,
      };
    });
  };

  const handlePublish = () => {
    if (draft.purchaseCost <= 0) {
      setSaveFeedback('Set the product purchase cost price before publishing this page.');
      return;
    }

    void persistDraft(
      'Product page published successfully. It is now available on the homepage.',
      'published',
      'Publishing failed. Check your Supabase connection or use a valid media URL.',
    );
  };

  const handleDeletePage = async () => {
    if (!id) {
      setSaveFeedback('Save this page first before trying to delete it.');
      return;
    }

    const confirmed = window.confirm(
      `Delete "${draft.pageName}"? This will remove the product page from the admin dashboard and storefront.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setSaveIntent('delete');
    setSaveFeedback('');

    try {
      await deleteAdminProductDraft(draft.id);
      navigate('/admin/products', { replace: true });
    } catch {
      setSaveFeedback(
        'Unable to delete this product page right now. Check your Supabase connection and try again.',
      );
    } finally {
      setIsSaving(false);
      setSaveIntent(null);
    }
  };

  const handleSectionSave = async () => {
    const saved = await persistDraft(
      `${getEditorTargetLabel(activeEditorTarget ?? 'pageSetup')} saved. Continue with the next section.`,
    );

    if (saved) {
      setActiveEditorTarget(null);
    }
  };

  const handleSaveAndNext = async () => {
    const currentTarget = activeEditorTarget ?? 'pageSetup';
    const nextTarget = nextEditorTarget;
    const saved = await persistDraft(
      nextTarget
        ? `${getEditorTargetLabel(currentTarget)} saved. Opening ${getEditorTargetLabel(nextTarget)} next.`
        : `${getEditorTargetLabel(currentTarget)} saved. You have reached the end of the section flow.`,
    );

    if (!saved) {
      return;
    }

    if (nextTarget) {
      if (nextTarget !== 'pageSetup') {
        setSelectedPreviewSectionId(nextTarget);
      }
      setActiveEditorTarget(nextTarget);
      return;
    }

    setActiveEditorTarget(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Link
            to="/admin/products"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#0E7C7B]/20 hover:text-[#0E7C7B]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <button
              type="button"
              onClick={() => setDeviceView('desktop')}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                deviceView === 'desktop'
                  ? 'bg-[#eef7f6] text-[#0E7C7B]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers3 className="h-4 w-4" />
              Desktop view
            </button>

            <button
              type="button"
              onClick={() => setDeviceView('mobile')}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                deviceView === 'mobile'
                  ? 'bg-[#eef7f6] text-[#0E7C7B]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              Mobile view
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode((current) => !current)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                previewMode
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-[#eef7f6] text-[#0E7C7B] hover:bg-[#e2f2f0]'
              }`}
            >
              <Eye className="h-4 w-4" />
              {previewMode ? 'Back to editing' : 'Preview mode'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit builder
            </button>

            {id ? (
              <button
                type="button"
                onClick={() => void handleDeletePage()}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {isSaving && saveIntent === 'delete' ? 'Deleting...' : 'Delete page'}
              </button>
            ) : null}

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-2xl"
            >
              <Save className="h-4 w-4" />
              {isSaving && saveIntent === 'draft' ? 'Saving...' : 'Save Draft'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handlePublish}
              disabled={isSaving}
              className="rounded-2xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSaving && saveIntent === 'publish' ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>

        {saveFeedback ? (
          <p className="text-sm font-medium text-[#0E7C7B]">{saveFeedback}</p>
        ) : null}

        <Card className="overflow-hidden rounded-[2rem] border-gray-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="bg-gradient-to-br from-[#eef7f6] via-white to-[#f8fbff] p-6 sm:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <span className={sectionChipClasses}>
                    {id ? 'Edit product page' : 'Create new product page'}
                  </span>
                  <span className={sectionChipClasses}>{visibleSectionCount} visible sections</span>
                  <span className={sectionChipClasses}>
                    {draft.sections.offer.packages.length} package cards
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-gray-900 sm:text-4xl">
                  Build a mobile-first product page that scales cleanly across screen sizes.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                  Hero and Product Features now edit inline directly on the live template. Use the
                  remaining section workflow below for media slots, packages, forms, alerts and FAQ
                  content. Theme selection is restricted to light and dark modes as requested.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Target market</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{draft.targetAudience}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Currency</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{draft.currency}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Theme</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-gray-900">
                    {draft.themeMode} mode
                  </p>
                </div>
              </div>
            </div>

            {draft.duplicatedFromId ? (
              <div className="mt-6 rounded-[1.5rem] border border-[#0E7C7B]/15 bg-white/90 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      This page is a duplicate draft.
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Keep the section setup, then change the target audience, currency and market
                      copy below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/products')}
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0E7C7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a5f5e]"
                  >
                    <Package2 className="h-4 w-4" />
                    View all product pages
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className={sectionChipClasses}>Page setup</span>
                <span className={sectionChipClasses}>{deviceView} canvas</span>
                <span className={sectionChipClasses}>
                  {previewMode ? 'Preview mode' : 'Inline editing mode'}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                Product-page sections now edit directly on the live template.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Use page setup for market-level settings like page name, audience, currency and
                theme. All product-page content below now edits inline on the canvas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Current market</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {draft.targetAudience} • {draft.currency}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {draft.pageName} • {draft.themeMode} mode
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveEditorTarget('pageSetup')}
                className="rounded-[1.5rem] border border-[#0E7C7B]/15 bg-[#eef7f6] px-4 py-4 text-left transition hover:bg-[#e2f2f0]"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[#0E7C7B]">Edit</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">Page setup and theme</p>
                <p className="mt-1 text-xs text-gray-600">
                  Update market settings without leaving the builder canvas.
                </p>
              </button>
            </div>
          </div>
        </Card>

        <InlineEditableProductCanvas
          pageData={draft}
          deviceView={deviceView}
          readOnly={previewMode}
          onChange={updateDraft}
        />
      </div>

      <ElementEditorModal
        target={activeEditorTarget === 'pageSetup' ? activeEditorTarget : null}
        draft={draft}
        setTopLevel={setTopLevel}
        patchSection={patchSection}
        onChangeDraft={(value) => setDraft(normalizeAdminProductDraft(value))}
        handlePageNameChange={handlePageNameChange}
        handleProductNameChange={handleProductNameChange}
        handleCategoryChange={handleCategoryChange}
        handleSubcategoryChange={handleSubcategoryChange}
        orderedTargets={orderedEditorTargets}
        currentIndex={currentEditorIndex}
        nextTarget={nextEditorTarget}
        onClose={() => setActiveEditorTarget(null)}
        onSave={handleSectionSave}
        onSaveAndNext={handleSaveAndNext}
        saving={isSaving}
      />
    </div>
  );
}
