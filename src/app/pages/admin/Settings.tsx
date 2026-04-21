import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Eye,
  Globe2,
  ImagePlus,
  LayoutDashboard,
  Package,
  Plus,
  Save,
  Settings2,
  ShoppingBag,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/design-system/Button';
import { readAdminAnalyticsSnapshot } from '../../lib/adminAnalytics';
import {
  readAdminNotificationsSnapshot,
  type AdminNotificationSnapshot,
} from '../../lib/adminNotifications';
import {
  ensureAdminPreferencesLoaded,
  readAdminPreferences,
  updateAdminPreferences,
  type AdminPreferences,
} from '../../lib/adminPreferences';
import { ensureAdminOrdersLoaded, readAdminOrders } from '../../lib/adminOrders';
import {
  ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT,
  ensureAdminProductDraftsLoaded,
  readAdminProductDrafts,
  getCurrencyLabel,
  type AdminCurrency,
} from '../../lib/adminProductDrafts';
import { readAdminSubscribersSnapshot } from '../../lib/adminSubscribers';
import {
  type AppThemeMode,
  ensureFinanceSettingsLoaded,
  readFinanceSnapshot,
  updateFinanceSettings,
} from '../../lib/adminFinance';
import { deriveCompanyShortName } from '../../lib/branding';
import {
  DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES,
  normalizeHomepageHighlightImages,
} from '../../lib/homepageHighlights';
import { getOptimizedMedia } from '../../lib/media';
import { PRODUCT_CATEGORIES } from '../../lib/productCategories';
import { uploadAssetToSupabaseStorage } from '../../lib/supabaseStorage';
import { formatCurrency } from '../../lib/utils';

const CURRENCY_OPTIONS: AdminCurrency[] = ['NGN', 'USD', 'GHS', 'KES', 'ZAR'];
const DEFAULT_LOGO_URL = '/brand/cloudmarket-logo.jfif';

interface SettingsOverview {
  publishedPages: number;
  draftPages: number;
  newOrders: number;
  activeSubscribers: number;
  financeAlerts: number;
  unreadNotifications: number;
  todayRevenue: number;
  topPage: string;
}

function OverviewMetric({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{sublabel}</p>
    </div>
  );
}

function ControlCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon: typeof Globe2;
  eyebrow: string;
  title: string;
  description: string;
  actions: Array<{ label: string; href: string; tone?: 'primary' | 'secondary' }>;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[#eef4ff] text-[#2B63D9]">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {actions.map((action) => (
          <Link
            key={`${title}-${action.label}`}
            to={action.href}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              action.tone === 'secondary'
                ? 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                : 'bg-[#0E7C7B] text-white hover:bg-[#0b6968]'
            }`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const highlightFileInputRef = useRef<HTMLInputElement | null>(null);
  const categoryImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [brandingForm, setBrandingForm] = useState(() => ({
    companyName: 'CloudMarket',
    currency: 'NGN' as AdminCurrency,
    appThemeMode: 'dark' as AppThemeMode,
    logoUrl: DEFAULT_LOGO_URL,
    logoUrlInput: DEFAULT_LOGO_URL,
    homepageHighlightImages: [...DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES],
    homepageCategoryImages: {} as Record<string, string>,
    highlightImageUrlInput: '',
    mobileStickyCtaTexts: [
      'Order Now - Pay on Delivery',
      'Claim Today\'s Free Delivery Offer',
      'Get the Bundle Before It Sells Out',
      'Unlock the Best Promo Package Now',
      'Tap to Reserve Your Discounted Order',
    ],
    mobileCtaTextInput: '',
  }));
  const [categoryImageUrlInputs, setCategoryImageUrlInputs] = useState<Record<string, string>>({});
  const [activeCategoryImageSlug, setActiveCategoryImageSlug] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState(() => ({
    metaPixelId: '',
    metaPurchaseTrackingEnabled: false,
    formspreeEndpointUrl: '',
    customHeadMarkup: '',
    customFooterMarkup: '',
  }));
  const [preferencesForm, setPreferencesForm] = useState<AdminPreferences>(() =>
    readAdminPreferences(),
  );
  const [overview, setOverview] = useState<SettingsOverview>({
    publishedPages: 0,
    draftPages: 0,
    newOrders: 0,
    activeSubscribers: 0,
    financeAlerts: 0,
    unreadNotifications: 0,
    todayRevenue: 0,
    topPage: 'No product leader yet',
  });
  const [notificationPreview, setNotificationPreview] =
    useState<AdminNotificationSnapshot | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [isSavingHighlights, setIsSavingHighlights] = useState(false);
  const [isSavingCategoryImages, setIsSavingCategoryImages] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    const syncForms = async () => {
      const nextFinanceSettings = await ensureFinanceSettingsLoaded();
      setBrandingForm({
        companyName: nextFinanceSettings.companyName,
        currency: nextFinanceSettings.currency,
        appThemeMode: nextFinanceSettings.appThemeMode,
        logoUrl: nextFinanceSettings.logoUrl || DEFAULT_LOGO_URL,
        logoUrlInput: nextFinanceSettings.logoUrl || DEFAULT_LOGO_URL,
        homepageHighlightImages: nextFinanceSettings.homepageHighlightImages,
        homepageCategoryImages: nextFinanceSettings.homepageCategoryImages,
        highlightImageUrlInput: '',
        mobileStickyCtaTexts: nextFinanceSettings.mobileStickyCtaTexts,
        mobileCtaTextInput: '',
      });
      setCategoryImageUrlInputs({});
      setActiveCategoryImageSlug(null);
      setTrackingForm({
        metaPixelId: nextFinanceSettings.metaPixelId,
        metaPurchaseTrackingEnabled: nextFinanceSettings.metaPurchaseTrackingEnabled,
        formspreeEndpointUrl: nextFinanceSettings.formspreeEndpointUrl,
        customHeadMarkup: nextFinanceSettings.customHeadMarkup,
        customFooterMarkup: nextFinanceSettings.customFooterMarkup,
      });
      await ensureAdminPreferencesLoaded().catch(() => undefined);
      setPreferencesForm(readAdminPreferences());
    };

    const loadOverview = async () => {
      await Promise.all([ensureAdminProductDraftsLoaded(), ensureAdminOrdersLoaded()]);
      const drafts = readAdminProductDrafts();
      const orders = readAdminOrders();
      const [financeSnapshot, subscriberSnapshot, analyticsSnapshot, notificationsSnapshot] =
        await Promise.all([
          readFinanceSnapshot(),
          readAdminSubscribersSnapshot(),
          readAdminAnalyticsSnapshot(7),
          readAdminNotificationsSnapshot(),
        ]);

      setOverview({
        publishedPages: drafts.filter((draft) => draft.status === 'published').length,
        draftPages: drafts.filter((draft) => draft.status === 'draft').length,
        newOrders: orders.filter((order) => order.status === 'new').length,
        activeSubscribers: subscriberSnapshot.metrics.activeToday,
        financeAlerts: financeSnapshot.alerts.length,
        unreadNotifications: notificationsSnapshot.unreadCount,
        todayRevenue: financeSnapshot.todaySummary.totalSales,
        topPage: analyticsSnapshot.topPerformingPage?.productName ?? 'No product leader yet',
      });
      setNotificationPreview(notificationsSnapshot);
    };

    void syncForms();
    void loadOverview();

    const handleRefresh = () => {
      void syncForms();
      void loadOverview();
    };

    const refreshEvents = [
      'cloudmarket-finance-data-change',
      'cloudmarket-admin-orders-change',
      'cloudmarket-admin-product-drafts-change',
      'cloudmarket-subscriber-data-change',
      'cloudmarket-admin-notifications-change',
      'cloudmarket-admin-preferences-change',
      'cloudmarket-analytics-data-change',
    ];

    refreshEvents.forEach((eventName) => window.addEventListener(eventName, handleRefresh));

    return () => {
      refreshEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleRefresh),
      );
    };
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const nextDataUrl = await uploadAssetToSupabaseStorage(file, 'branding');
    setBrandingForm((current) => ({
      ...current,
      logoUrl: nextDataUrl,
      logoUrlInput: nextDataUrl,
    }));
    event.target.value = '';
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);

    try {
      await updateFinanceSettings({
        companyName: brandingForm.companyName.trim() || 'CloudMarket',
        companyShortName: deriveCompanyShortName(
          brandingForm.companyName.trim() || 'CloudMarket',
        ),
        currency: brandingForm.currency,
        appThemeMode: brandingForm.appThemeMode,
        logoUrl: brandingForm.logoUrl.trim() || DEFAULT_LOGO_URL,
        mobileStickyCtaTexts: brandingForm.mobileStickyCtaTexts,
      });
      setFeedbackMessage('Branding saved. The logo, currency, default app theme, and mobile CTA rotation are now updated.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleHighlightUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const nextImages = await Promise.all(
      files.map((file) => uploadAssetToSupabaseStorage(file, 'homepage-highlights')),
    );
    setBrandingForm((current) => ({
      ...current,
      homepageHighlightImages: normalizeHomepageHighlightImages([
        ...current.homepageHighlightImages,
        ...nextImages,
      ]),
    }));
    event.target.value = '';
  };

  const handleAddHighlightUrl = () => {
    const nextUrl = brandingForm.highlightImageUrlInput.trim();

    if (!nextUrl) {
      return;
    }

    setBrandingForm((current) => ({
      ...current,
      homepageHighlightImages: normalizeHomepageHighlightImages([
        ...current.homepageHighlightImages,
        nextUrl,
      ]),
      highlightImageUrlInput: '',
    }));
  };

  const handleRemoveHighlightImage = (imageToRemove: string) => {
    setBrandingForm((current) => ({
      ...current,
      homepageHighlightImages: current.homepageHighlightImages.filter(
        (image) => image !== imageToRemove,
      ),
    }));
  };

  const handleResetHighlightImages = () => {
    setBrandingForm((current) => ({
      ...current,
      homepageHighlightImages: [...DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES],
      highlightImageUrlInput: '',
    }));
  };

  const handleSaveHomepageHighlights = async () => {
    setIsSavingHighlights(true);

    try {
      await updateFinanceSettings({
        homepageHighlightImages: brandingForm.homepageHighlightImages,
      });
      setFeedbackMessage('Homepage highlight images saved and updated on the live homepage.');
    } finally {
      setIsSavingHighlights(false);
    }
  };

  const handleOpenCategoryImageUpload = (categorySlug: string) => {
    setActiveCategoryImageSlug(categorySlug);
    categoryImageFileInputRef.current?.click();
  };

  const handleCategoryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !activeCategoryImageSlug) {
      event.target.value = '';
      return;
    }

    const nextDataUrl = await uploadAssetToSupabaseStorage(file, `homepage-category-${activeCategoryImageSlug}`);
    setBrandingForm((current) => ({
      ...current,
      homepageCategoryImages: {
        ...current.homepageCategoryImages,
        [activeCategoryImageSlug]: nextDataUrl,
      },
    }));
    setActiveCategoryImageSlug(null);
    event.target.value = '';
  };

  const handleApplyCategoryImageUrl = (categorySlug: string) => {
    const nextUrl = categoryImageUrlInputs[categorySlug]?.trim();

    if (!nextUrl) {
      return;
    }

    setBrandingForm((current) => ({
      ...current,
      homepageCategoryImages: {
        ...current.homepageCategoryImages,
        [categorySlug]: nextUrl,
      },
    }));
    setCategoryImageUrlInputs((current) => ({
      ...current,
      [categorySlug]: '',
    }));
  };

  const handleRemoveCategoryImage = (categorySlug: string) => {
    setBrandingForm((current) => {
      const nextImages = { ...current.homepageCategoryImages };
      delete nextImages[categorySlug];

      return {
        ...current,
        homepageCategoryImages: nextImages,
      };
    });
    setCategoryImageUrlInputs((current) => ({
      ...current,
      [categorySlug]: '',
    }));
  };

  const handleSaveHomepageCategoryImages = async () => {
    setIsSavingCategoryImages(true);

    try {
      await updateFinanceSettings({
        homepageCategoryImages: brandingForm.homepageCategoryImages,
      });
      setFeedbackMessage('Homepage category card images saved and updated on the live homepage.');
    } finally {
      setIsSavingCategoryImages(false);
    }
  };

  const handleSaveTracking = async () => {
    setIsSavingTracking(true);

    try {
      await updateFinanceSettings({
        metaPixelId: trackingForm.metaPixelId.trim(),
        metaPurchaseTrackingEnabled: trackingForm.metaPurchaseTrackingEnabled,
        formspreeEndpointUrl: trackingForm.formspreeEndpointUrl.trim(),
        customHeadMarkup: trackingForm.customHeadMarkup,
        customFooterMarkup: trackingForm.customFooterMarkup,
      });
      setFeedbackMessage('Tracking settings saved. Storefront scripts, Formspree submissions, and purchase events are now updated.');
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);

    try {
      await updateAdminPreferences(preferencesForm);
      setFeedbackMessage('Admin notification preferences updated.');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(239,246,255,0.95))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              <Settings2 className="h-3.5 w-3.5" />
              Global Control Center
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Settings that control the brand, storefront, product pages, and admin workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Manage the company identity, the live admin notification system, and the quick controls
              that lead into homepage, product page, and operations management.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Live leader
            </p>
            <p className="mt-2 text-lg font-black text-slate-950">{overview.topPage}</p>
            <p className="mt-1 text-sm text-slate-600">
              Top performing product page from the latest analytics window.
            </p>
          </div>
        </div>

        {feedbackMessage ? (
          <div className="mt-5 rounded-[1.4rem] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]">
            {feedbackMessage}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          label="Published pages"
          value={String(overview.publishedPages)}
          sublabel={`${overview.draftPages} drafts still private`}
        />
        <OverviewMetric
          label="Unread notifications"
          value={String(overview.unreadNotifications)}
          sublabel={`${overview.newOrders} fresh orders waiting in the queue`}
        />
        <OverviewMetric
          label="Active subscribers"
          value={String(overview.activeSubscribers)}
          sublabel="Subscribers active today"
        />
        <OverviewMetric
          label="Today revenue"
          value={formatCurrency(overview.todayRevenue)}
          sublabel={`${overview.financeAlerts} finance alerts need review`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)] md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#eef4ff] text-[#2B63D9]">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Brand and global storefront identity
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                This logo and brand name now flow into the storefront, footer, admin avatar, and receipts.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Live preview
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-900">
                  <img
                    src={getOptimizedMedia(brandingForm.logoUrl || DEFAULT_LOGO_URL)}
                    alt={`${brandingForm.companyName || 'Company'} logo`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-slate-950">
                    {brandingForm.companyName || 'CloudMarket'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Currency: {brandingForm.currency} - {getCurrencyLabel(brandingForm.currency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Default theme: {brandingForm.appThemeMode === 'dark' ? 'Dark' : 'Light'}
                  </p>
                  <p className="mt-2 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Admin avatar + storefront mark
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <input
                value={brandingForm.companyName}
                onChange={(event) =>
                  setBrandingForm((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
                placeholder="Company name"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
              />

              <select
                value={brandingForm.currency}
                onChange={(event) =>
                  setBrandingForm((current) => ({
                    ...current,
                    currency: event.target.value as AdminCurrency,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
              >
                {CURRENCY_OPTIONS.map((currencyCode) => (
                  <option key={currencyCode} value={currencyCode}>
                    {currencyCode} - {getCurrencyLabel(currencyCode)}
                  </option>
                ))}
              </select>

              <select
                value={brandingForm.appThemeMode}
                onChange={(event) =>
                  setBrandingForm((current) => ({
                    ...current,
                    appThemeMode: event.target.value as AppThemeMode,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
              >
                <option value="dark">Default theme: Dark</option>
                <option value="light">Default theme: Light</option>
              </select>

              <p className="text-sm leading-6 text-slate-600">
                This controls the default theme for the homepage, product pages, and admin dashboard.
                Visitors can still switch their own view manually.
              </p>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Mobile sticky CTA captions</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  These captions rotate on the fixed mobile order button when a product page has no custom CTA list.
                </p>
                <div className="mt-3 space-y-2">
                  {brandingForm.mobileStickyCtaTexts.map((caption, index) => (
                    <div key={`${caption}-${index}`} className="flex items-center gap-2">
                      <input
                        value={caption}
                        onChange={(event) =>
                          setBrandingForm((current) => {
                            const nextCaptions = [...current.mobileStickyCtaTexts];
                            nextCaptions[index] = event.target.value;
                            return {
                              ...current,
                              mobileStickyCtaTexts: nextCaptions,
                            };
                          })
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setBrandingForm((current) => ({
                            ...current,
                            mobileStickyCtaTexts: current.mobileStickyCtaTexts.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                        aria-label="Remove CTA caption"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={brandingForm.mobileCtaTextInput}
                    onChange={(event) =>
                      setBrandingForm((current) => ({
                        ...current,
                        mobileCtaTextInput: event.target.value,
                      }))
                    }
                    placeholder="Add a new mobile CTA caption"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setBrandingForm((current) => {
                        const nextValue = current.mobileCtaTextInput.trim();
                        if (!nextValue) {
                          return current;
                        }

                        return {
                          ...current,
                          mobileStickyCtaTexts: [...current.mobileStickyCtaTexts, nextValue].slice(0, 20),
                          mobileCtaTextInput: '',
                        };
                      })
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2B63D9] px-4 text-sm font-semibold text-white transition hover:bg-[#1f56c6]"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload logo from device
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBrandingForm((current) => ({
                        ...current,
                        logoUrl: DEFAULT_LOGO_URL,
                        logoUrlInput: DEFAULT_LOGO_URL,
                      }))
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white"
                  >
                    Reset logo
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <input
                  value={brandingForm.logoUrlInput}
                  onChange={(event) =>
                    setBrandingForm((current) => ({
                      ...current,
                      logoUrlInput: event.target.value,
                    }))
                  }
                  placeholder="Paste logo image URL"
                  className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBrandingForm((current) => ({
                      ...current,
                      logoUrl: current.logoUrlInput.trim() || DEFAULT_LOGO_URL,
                    }))
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Use pasted URL
                </button>
              </div>

              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={isSavingBranding}
                onClick={handleSaveBranding}
              >
                <Save className="h-4 w-4" />
                {isSavingBranding ? 'Saving Branding...' : 'Save Branding Settings'}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)] md:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#fff4ea] text-[#f97316]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Admin notification controls
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Control how the admin bell behaves while keeping order, subscriber, finance, and product alerts live.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={preferencesForm.notificationsEnabled}
                onChange={(event) =>
                  setPreferencesForm((current) => ({
                    ...current,
                    notificationsEnabled: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0E7C7B] focus:ring-[#0E7C7B]"
              />
              Enable the admin bell dropdown and keep live notifications flowing across the dashboard.
            </label>

            <label className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={preferencesForm.showUnreadBadge}
                onChange={(event) =>
                  setPreferencesForm((current) => ({
                    ...current,
                    showUnreadBadge: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0E7C7B] focus:ring-[#0E7C7B]"
              />
              Show the unread badge on the bell icon whenever there are fresh notifications.
            </label>

            <label className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={preferencesForm.autoMarkNotificationsRead}
                onChange={(event) =>
                  setPreferencesForm((current) => ({
                    ...current,
                    autoMarkNotificationsRead: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0E7C7B] focus:ring-[#0E7C7B]"
              />
              Automatically mark bell notifications as read when the dropdown is opened.
            </label>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Notification preview
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-950">
                    {notificationPreview?.unreadCount ?? 0} unread of {notificationPreview?.totalCount ?? 0}
                  </p>
                </div>
                <Link
                  to="/admin/orders"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  <Eye className="h-4 w-4" />
                  Open operations
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {(notificationPreview?.notifications ?? []).slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={isSavingPreferences}
              onClick={handleSavePreferences}
            >
              <Save className="h-4 w-4" />
              {isSavingPreferences ? 'Saving Preferences...' : 'Save Notification Settings'}
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)] md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Tracking and scripts
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Manage Meta Pixel and custom header or footer tracking code
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Use the Meta Pixel ID field for built-in storefront page views and purchase events. Use the
              custom code fields for third-party tags or raw snippets, similar to a header and footer script plugin.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Purchase tracking
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {trackingForm.metaPurchaseTrackingEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
          <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Setup guide
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                Add your Meta Pixel ID here if you want CloudMarket to load the pixel automatically on storefront pages.
              </p>
              <p>
                Turn on purchase tracking to send a Meta <span className="font-semibold text-slate-900">Purchase</span> event whenever a shopper completes an order.
              </p>
              <p>
                When your Netlify environment includes a Meta Conversions API access token, CloudMarket also sends the same purchase server-side with the matching event ID for Meta deduplication.
              </p>
              <p>
                Add your Formspree endpoint here to route storefront form submissions directly from the browser into your Formspree inbox.
              </p>
              <p>
                Paste extra tracking code into the header or footer boxes only when you need scripts beyond the built-in Meta Pixel loader.
              </p>
              <p className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                Avoid pasting the same Meta Pixel base code into the custom boxes if you already entered a Meta Pixel ID here, or you may create duplicate events.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              value={trackingForm.metaPixelId}
              onChange={(event) =>
                setTrackingForm((current) => ({
                  ...current,
                  metaPixelId: event.target.value,
                }))
              }
              placeholder="Meta Pixel ID"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            />

            <input
              value={trackingForm.formspreeEndpointUrl}
              onChange={(event) =>
                setTrackingForm((current) => ({
                  ...current,
                  formspreeEndpointUrl: event.target.value,
                }))
              }
              placeholder="Formspree Endpoint URL (https://formspree.io/f/xyz123)"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
            />

            <label className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={trackingForm.metaPurchaseTrackingEnabled}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    metaPurchaseTrackingEnabled: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0E7C7B] focus:ring-[#0E7C7B]"
              />
              Send a Meta Purchase event when a shopper submits a real product order.
            </label>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Header code</p>
              <textarea
                value={trackingForm.customHeadMarkup}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    customHeadMarkup: event.target.value,
                  }))
                }
                rows={7}
                placeholder="<script>/* custom head tracking */</script>"
                className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Footer code</p>
              <textarea
                value={trackingForm.customFooterMarkup}
                onChange={(event) =>
                  setTrackingForm((current) => ({
                    ...current,
                    customFooterMarkup: event.target.value,
                  }))
                }
                rows={7}
                placeholder="<script>/* custom footer tracking */</script>"
                className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={isSavingTracking}
              onClick={handleSaveTracking}
            >
              <Save className="h-4 w-4" />
              {isSavingTracking ? 'Saving Tracking...' : 'Save Tracking Settings'}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)] md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Homepage highlights
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Manage the hero carousel images on the homepage
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Upload images from your device or add them with direct URLs. These images power the
              homepage hero carousel and rotating storefront image panel.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Active set
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {brandingForm.homepageHighlightImages.length} image
              {brandingForm.homepageHighlightImages.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Live preview
            </p>
            <div className="mt-4 space-y-3">
              {[0, 1].map((row) => (
                <div key={`highlight-row-${row}`} className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {Array.from({ length: 5 }, (_, index) => {
                    const imageIndex =
                      (row * 5 + index) % Math.max(1, brandingForm.homepageHighlightImages.length);
                    const image =
                      brandingForm.homepageHighlightImages[imageIndex] ||
                      DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES[imageIndex % DEFAULT_HOMEPAGE_HIGHLIGHT_IMAGES.length];

                    return (
                      <div
                        key={`preview-${row}-${index}`}
                        className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-1.5 shadow-sm"
                      >
                        <div className="aspect-[4/5] overflow-hidden rounded-[0.95rem] bg-slate-100">
                          <img src={getOptimizedMedia(image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => highlightFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload highlight images
                </button>
                <button
                  type="button"
                  onClick={handleResetHighlightImages}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Reset defaults
                </button>
              </div>
              <input
                ref={highlightFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleHighlightUpload}
                className="hidden"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={brandingForm.highlightImageUrlInput}
                  onChange={(event) =>
                    setBrandingForm((current) => ({
                      ...current,
                      highlightImageUrlInput: event.target.value,
                    }))
                  }
                  placeholder="Paste homepage highlight image URL"
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                />
                <button
                  type="button"
                  onClick={handleAddHighlightUrl}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0E7C7B] px-5 text-sm font-semibold text-white transition hover:bg-[#0b6968]"
                >
                  <Plus className="h-4 w-4" />
                  Add URL
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {brandingForm.homepageHighlightImages.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-slate-100">
                    <img src={getOptimizedMedia(image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Image {index + 1}</p>
                      <p className="text-xs text-slate-500">Homepage hero carousel slot</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlightImage(image)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                      aria-label={`Remove image ${index + 1}`}
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={isSavingHighlights}
              onClick={handleSaveHomepageHighlights}
            >
              <Save className="h-4 w-4" />
              {isSavingHighlights ? 'Saving Homepage Highlights...' : 'Save Homepage Highlights'}
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Browse category cards
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                Manage the category images shown in the homepage browse section
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Upload a custom image or paste a URL for each category card. If no image is saved,
                the storefront falls back to the default icon-based design.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Customized cards
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {Object.keys(brandingForm.homepageCategoryImages).length} image
                {Object.keys(brandingForm.homepageCategoryImages).length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <input
            ref={categoryImageFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCategoryImageUpload}
            className="hidden"
          />

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {PRODUCT_CATEGORIES.map((category) => {
              const currentImage = brandingForm.homepageCategoryImages[category.slug] ?? '';

              return (
                <div
                  key={category.id}
                  className="rounded-[1.55rem] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-4 md:grid-cols-[11rem,1fr]">
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100">
                      {currentImage ? (
                        <img
                          src={getOptimizedMedia(currentImage)}
                          alt={`${category.name} category card`}
                          loading="lazy"
                          className="aspect-[4/3] h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(145deg,#f7faff,#edf3ff)] px-4 text-center">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{category.name}</p>
                            <p className="mt-1 text-xs text-slate-500">Using icon fallback on the homepage</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-base font-black tracking-tight text-slate-950">
                          {category.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {category.subcategories.length} subcategories • slug: {category.slug}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCategoryImageUpload(category.slug)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <UploadCloud className="h-4 w-4" />
                          Upload image
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategoryImage(category.slug)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove image
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          value={categoryImageUrlInputs[category.slug] ?? ''}
                          onChange={(event) =>
                            setCategoryImageUrlInputs((current) => ({
                              ...current,
                              [category.slug]: event.target.value,
                            }))
                          }
                          placeholder={`Paste ${category.name} image URL`}
                          className="h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/20"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCategoryImageUrl(category.slug)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0E7C7B] px-5 text-sm font-semibold text-white transition hover:bg-[#0b6968]"
                        >
                          <Plus className="h-4 w-4" />
                          Apply URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={isSavingCategoryImages}
              onClick={handleSaveHomepageCategoryImages}
            >
              <Save className="h-4 w-4" />
              {isSavingCategoryImages ? 'Saving Category Images...' : 'Save Category Card Images'}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)] md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Control panels
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Fast control over homepage, product pages, and the admin workspace
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              These shortcuts open the exact areas where you manage the homepage catalog, product pages,
              operations, analytics, and finance.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Globe2 className="h-4 w-4" />
            View Homepage
          </Link>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          <ControlCard
            icon={Globe2}
            eyebrow="Homepage"
            title="Storefront and homepage"
            description="Open the live homepage, inspect the published catalog, and jump into the customer-facing storefront experience."
            actions={[
              { label: 'View homepage', href: '/' },
              { label: 'Open products', href: '/admin/products', tone: 'secondary' },
            ]}
          />
          <ControlCard
            icon={Package}
            eyebrow="Product pages"
            title="Product page control"
            description="Create new product pages, manage published inventory, and jump straight into the page builder."
            actions={[
              { label: 'Create product', href: '/admin/products/create' },
              { label: 'Manage products', href: '/admin/products', tone: 'secondary' },
            ]}
          />
          <ControlCard
            icon={LayoutDashboard}
            eyebrow="Admin"
            title="Operations and business"
            description="Go directly into orders, subscribers, analytics, or finance to manage live business activity."
            actions={[
              { label: 'Orders', href: '/admin/orders' },
              { label: 'Analytics', href: '/admin/analytics', tone: 'secondary' },
            ]}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/admin/orders"
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:bg-white"
          >
            <ShoppingBag className="h-5 w-5 text-[#2B63D9]" />
            <p className="mt-4 text-lg font-bold text-slate-950">Orders</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {overview.newOrders} fresh order alerts are waiting in the operations queue.
            </p>
          </Link>
          <Link
            to="/admin/subscribers"
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:bg-white"
          >
            <Users className="h-5 w-5 text-[#0E7C7B]" />
            <p className="mt-4 text-lg font-bold text-slate-950">Subscribers</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {overview.activeSubscribers} subscriber records were active today.
            </p>
          </Link>
          <Link
            to="/admin/analytics"
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:bg-white"
          >
            <BarChart3 className="h-5 w-5 text-[#7c3aed]" />
            <p className="mt-4 text-lg font-bold text-slate-950">Analytics</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Follow the top page, button clicks, visits, and source traffic signals.
            </p>
          </Link>
          <Link
            to="/admin/finance"
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:bg-white"
          >
            <Wallet className="h-5 w-5 text-[#f97316]" />
            <p className="mt-4 text-lg font-bold text-slate-950">Finance</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {overview.financeAlerts} live finance alert(s) are active right now.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
