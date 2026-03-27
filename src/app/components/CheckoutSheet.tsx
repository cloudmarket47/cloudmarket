import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, MapPin, MessageSquare, MoreVertical, Package, Phone, Tag, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../lib/analyticsTelemetry';
import { convertNairaAmount, getCurrencyForCountry } from '../lib/currencyRates';
import { recordSubmittedOrder } from '../lib/adminOrders';
import { redeemCustomerDiscountToken, validateCustomerDiscountToken } from '../lib/customerTokens';
import type { SupportedCountryCode } from '../lib/localeData';
import { syncOrderSubmission } from '../lib/netlifyOrders';
import { getPackagePriceBreakdown } from '../lib/packagePricing';
import { calculateOrderPricing, createPlacedOrder, persistPlacedOrder } from '../lib/orders';
import { trackMetaPurchase } from '../lib/siteTracking';
import { trackSubscriberActivity } from '../lib/subscriberTelemetry';
import { formatCurrency } from '../lib/utils';
import type { CustomerTokenRecord, Product } from '../types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface CheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

interface CheckoutBundle {
  id: string;
  title: string;
  price: number;
  oldPrice: number;
  savings: number;
  description: string;
  features: string[];
  isBestValue: boolean;
  image: string;
  orderQuantity: string;
  spotlight: string;
}

const motionEase = [0.4, 0, 0.2, 1] as const;

function buildCheckoutBundles(product: Product, countryCode: SupportedCountryCode): CheckoutBundle[] {
  const gallery = [
    product.sections.hero.image,
    product.image,
    ...product.sections.showcase.images,
  ].filter((image, index, collection): image is string => {
    return Boolean(image) && collection.indexOf(image) === index;
  });

  return product.sections.offer.packages.map((bundle, index) => {
    const parsedQuantity = bundle.title.match(/buy\s+(\d+)/i)?.[1] ?? String(index + 1);
    const priceBreakdown = getPackagePriceBreakdown({
      packageTitle: bundle.title,
      promoPrice: bundle.price,
      oldPrice: bundle.oldPrice,
    });
    const currency = getCurrencyForCountry(countryCode);

    return {
      id: `${product.id}-bundle-${index}`,
      title: bundle.title,
      price: convertNairaAmount(priceBreakdown.promoPrice, currency),
      oldPrice: convertNairaAmount(priceBreakdown.oldPrice, currency),
      savings: convertNairaAmount(priceBreakdown.savings, currency),
      description: bundle.description,
      features: bundle.features,
      isBestValue: bundle.isBestValue,
      image: bundle.image || gallery[index % Math.max(gallery.length, 1)] || product.image,
      orderQuantity: parsedQuantity,
      spotlight:
        index === 0 ? 'Easy starter bundle' : index === 1 ? 'Most popular' : 'Maximum savings',
    };
  });
}

function ensurePhonePrefix(value: string, phonePrefix: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return `${phonePrefix} `;
  }

  if (trimmedValue.startsWith(phonePrefix)) {
    return trimmedValue;
  }

  const normalizedLocalNumber = trimmedValue.replace(/^\+\d+\s*/, '').replace(/^0+/, '');
  return `${phonePrefix} ${normalizedLocalNumber}`.trim();
}

export function CheckoutSheet({ isOpen, onClose, product }: CheckoutSheetProps) {
  const navigate = useNavigate();
  const childScrollRef = useRef<HTMLDivElement>(null);
  const { countryCode, countryName, phoneExample, phonePrefix, regionLabel, regions, ratesUpdatedAt } = useLocale();
  const bundles = useMemo(() => buildCheckoutBundles(product, countryCode), [countryCode, product, ratesUpdatedAt]);
  const orderFormCopy = product.sections.orderForm;
  const isDark = product.displayMode === 'dark';
  const [selectedBundleIndex, setSelectedBundleIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: `${phonePrefix} `,
    address: '',
    city: '',
    quantity: '',
    shortDeliveryMessage: '',
    customerToken: '',
  });
  const [tokenRecord, setTokenRecord] = useState<CustomerTokenRecord | null>(null);
  const [tokenMessage, setTokenMessage] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isTokenSectionOpen, setIsTokenSectionOpen] = useState(false);
  const [isApplyingToken, setIsApplyingToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const activeBundle = bundles[selectedBundleIndex ?? 0] ?? null;
  const selectedBundle = selectedBundleIndex === null ? null : bundles[selectedBundleIndex] ?? null;
  const isExpanded = selectedBundle !== null;
  const summaryBundle = selectedBundle ?? activeBundle;
  const pricing = calculateOrderPricing(summaryBundle?.price ?? 0, tokenRecord?.discountPercentage ?? 0);

  useEffect(() => {
    if (!isOpen) {
      setSelectedBundleIndex(null);
      setFormData({
        fullName: '',
        phone: `${phonePrefix} `,
        address: '',
        city: '',
        quantity: '',
        shortDeliveryMessage: '',
        customerToken: '',
      });
      setTokenRecord(null);
      setTokenMessage('');
      setTokenError('');
      setIsTokenSectionOpen(false);
      setSubmitError('');
    }
  }, [isOpen, phonePrefix]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      phone: ensurePhonePrefix(currentData.phone, phonePrefix),
      city: regions.includes(currentData.city) ? currentData.city : '',
    }));
  }, [isOpen, phonePrefix, regions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    childScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isOpen, selectedBundleIndex]);

  if (bundles.length === 0 || !activeBundle) {
    return null;
  }

  const handleBundleSelect = (bundleIndex: number) => {
    const bundle = bundles[bundleIndex];

    setSelectedBundleIndex(bundleIndex);
    setFormData((currentData) => ({
      ...currentData,
      quantity: bundle.orderQuantity,
    }));
    trackAnalyticsButtonClick({
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: 'quick_checkout_package_select',
      buttonLabel: bundle.title,
      metadata: {
        quantity: bundle.orderQuantity,
      },
    });
    trackAnalyticsEvent({
      type: 'package_select',
      pagePath: `/product/${product.slug}`,
      pageType: 'product',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buttonId: 'quick_checkout_package_select',
      buttonLabel: bundle.title,
      metadata: {
        quantity: bundle.orderQuantity,
      },
    });
    trackSubscriberActivity({
      type: 'package_selected',
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      packageTitle: bundle.title,
      pagePath: `/product/${product.slug}`,
    });
  };

  const handleChangeSelection = () => {
    setSelectedBundleIndex(null);
    setFormData((currentData) => ({
      ...currentData,
      quantity: '',
    }));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === 'quantity') {
      const matchingBundleIndex = bundles.findIndex((bundle) => bundle.orderQuantity === value);

      if (matchingBundleIndex >= 0) {
        setSelectedBundleIndex(matchingBundleIndex);
      }
    }

    if (name === 'phone') {
      value = ensurePhonePrefix(value, phonePrefix);
    }

    if (name === 'customerToken') {
      setTokenRecord(null);
      setTokenMessage('');
      setTokenError('');
    }

    if (submitError) {
      setSubmitError('');
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const applyCustomerToken = async () => {
    if (!formData.customerToken.trim()) {
      setTokenError('Enter your customer token to unlock the discount.');
      setTokenMessage('');
      setTokenRecord(null);
      return null;
    }

    setIsApplyingToken(true);
    setTokenError('');
    setTokenMessage('');

    try {
      const validation = await validateCustomerDiscountToken(formData.customerToken);

      if (!validation.isValid || !validation.record) {
        setTokenRecord(null);
        setTokenError(validation.message);
        return null;
      }

      setTokenRecord(validation.record);
      setTokenMessage(validation.message);
      trackAnalyticsButtonClick({
        pagePath: `/product/${product.slug}`,
        pageType: 'product',
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        buttonId: 'quick_checkout_apply_token',
        buttonLabel: 'Apply Token',
      });
      trackSubscriberActivity({
        type: 'token_applied',
        token: validation.record.token,
        email: validation.record.email,
        fullName: validation.record.fullName,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        packageTitle: summaryBundle?.title ?? '',
        pagePath: `/product/${product.slug}`,
        meta: {
          discountPercentage: validation.record.discountPercentage,
        },
      });
      return validation.record;
    } finally {
      setIsApplyingToken(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError('');
    setIsSubmitting(true);

    try {
      let resolvedTokenRecord = tokenRecord;

      if (formData.customerToken.trim()) {
        const normalizedInputToken = formData.customerToken.trim().toUpperCase();
        const appliedToken = tokenRecord?.token?.trim().toUpperCase();

        if (!tokenRecord || normalizedInputToken !== appliedToken) {
          resolvedTokenRecord = await applyCustomerToken();
          if (!resolvedTokenRecord || !selectedBundle) {
            return;
          }
        }
      }

      if (!selectedBundle) {
        return;
      }

      const placedOrder = createPlacedOrder({
        product,
        quantity: formData.quantity,
        customerName: formData.fullName,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        city: formData.city,
        shortDeliveryMessage: formData.shortDeliveryMessage,
        customerToken: formData.customerToken,
        tokenRecord: resolvedTokenRecord,
        localeCountryCode: countryCode,
      });

      await persistPlacedOrder(placedOrder);
      void recordSubmittedOrder(placedOrder).catch(() => undefined);
      trackAnalyticsEvent({
        type: 'form_submit',
        pagePath: `/product/${product.slug}`,
        pageType: 'product',
        productId: placedOrder.productId,
        productSlug: placedOrder.productSlug,
        productName: placedOrder.productName,
        buttonId: 'quick_checkout_submit',
        buttonLabel: orderFormCopy.submitButtonLabel,
        orderNumber: placedOrder.orderNumber,
        amount: placedOrder.finalAmount,
        metadata: {
          checkoutMode: 'quick',
          quantity: placedOrder.quantity,
          region: placedOrder.city,
          hasToken: Boolean(placedOrder.customerToken),
        },
      });

      trackSubscriberActivity({
        type: 'order_submitted',
        token: resolvedTokenRecord?.token,
        email: resolvedTokenRecord?.email,
        fullName: resolvedTokenRecord?.fullName,
        orderNumber: placedOrder.orderNumber,
        productId: placedOrder.productId,
        productSlug: placedOrder.productSlug,
        productName: placedOrder.productName,
        packageTitle: placedOrder.packageTitle,
        amount: placedOrder.finalAmount,
        pagePath: `/product/${product.slug}`,
        meta: {
          quantity: placedOrder.quantity,
          region: placedOrder.city,
        },
      });

      if (resolvedTokenRecord) {
        await redeemCustomerDiscountToken(resolvedTokenRecord.token, placedOrder.orderNumber, {
          productId: placedOrder.productId,
          productSlug: placedOrder.productSlug,
          productName: placedOrder.productName,
          packageTitle: placedOrder.packageTitle,
          amount: placedOrder.finalAmount,
          pagePath: `/product/${product.slug}`,
        });
      }

      await syncOrderSubmission(placedOrder, {
        customerEmail: resolvedTokenRecord?.email,
      }).catch((error) => {
        console.warn('Order notification email failed.', error);
      });
      void trackMetaPurchase(placedOrder, {
        customerEmail: resolvedTokenRecord?.email,
      }).catch(() => undefined);

      onClose();
      navigate(`/thank-you?order=${placedOrder.orderNumber}`, {
        state: { order: placedOrder },
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'We could not place your order right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelClassName = isDark ? 'text-slate-200' : 'text-stone-700';
  const fieldClassName = isDark
    ? 'h-12 rounded-2xl border-white/10 bg-white/5 px-4 text-white placeholder:text-slate-400'
    : 'h-12 rounded-2xl border-stone-200 bg-white px-4';
  const selectClassName = isDark
    ? 'h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20'
    : 'h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20';
  const textareaClassName = isDark
    ? 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20'
    : 'w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20';
  const warmCardClassName = isDark
    ? 'rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-4 text-white shadow-[0_18px_36px_rgba(2,6,23,0.5)]'
    : 'rounded-[1.7rem] bg-[#f8f1e8] p-4 text-stone-950 shadow-[0_12px_24px_rgba(15,23,42,0.12)]';
  const warmPillClassName = isDark
    ? 'rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200'
    : 'rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600';

  const renderTokenField = () => (
    <div
      className={`rounded-[1.5rem] border border-dashed p-4 ${
        isDark
          ? 'border-[#2B7FFF]/30 bg-[#08182f]'
          : 'border-[#2B7FFF]/35 bg-[#f5f9ff]'
      }`}
    >
      <button
        type="button"
        onClick={() => setIsTokenSectionOpen((currentState) => !currentState)}
        className="text-left text-sm font-semibold text-[#1f56c6] underline underline-offset-4"
      >
        {orderFormCopy.tokenPrompt} {isTokenSectionOpen ? 'Hide token field' : 'Add token'}
      </button>

      {isTokenSectionOpen ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customerToken" className={labelClassName}>
              <Tag className="h-4 w-4 text-[#2B7FFF]" />
              Customer Discount Token
            </Label>
            <Input
              id="customerToken"
              name="customerToken"
              value={formData.customerToken}
              onChange={handleChange}
              placeholder="Optional token for 10% off"
              className={`${fieldClassName} uppercase`}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              Subscribers receive 10% off their next 5 orders with a valid token.
            </p>
            <button
              type="button"
              onClick={() => {
                void applyCustomerToken();
              }}
              className="inline-flex items-center justify-center rounded-full bg-[#2B63D9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f56c6]"
              disabled={isApplyingToken}
            >
              {isApplyingToken ? 'Checking...' : 'Apply Token'}
            </button>
          </div>

          {tokenMessage ? (
            <p className="text-sm font-medium text-emerald-600">{tokenMessage}</p>
          ) : null}
          {tokenError ? (
            <p className="text-sm font-medium text-red-600">{tokenError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const renderSelectedBundleSummary = (showChangeButton = true) => {
    if (!selectedBundle) {
      return null;
    }

    return (
      <div className={warmCardClassName}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[1.25rem] bg-white">
            <ImageWithFallback
              src={selectedBundle.image}
              alt={selectedBundle.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold uppercase tracking-[0.26em] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
              {orderFormCopy.childSheetLabel}
            </p>
            <h3 className={`mt-1 text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-stone-950'}`}>
              {selectedBundle.title}
            </h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
              {selectedBundle.description}
            </p>
            <p className={`mt-1 text-xs font-semibold line-through ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
              Old Price: {formatCurrency(selectedBundle.oldPrice, countryCode)}
            </p>
            <p className="text-sm font-bold text-[#FF7A00]">
              Promo: {formatCurrency(selectedBundle.price, countryCode)}
            </p>
          </div>

          {showChangeButton ? (
            <button
              type="button"
              onClick={handleChangeSelection}
              className="btn-3d btn-3d-orange rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
            >
              {orderFormCopy.changeSelectionLabel}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCheckoutForm = () => {
    if (!selectedBundle) {
      return null;
    }

    return (
      <div className={`${warmCardClassName} md:p-5`}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className={labelClassName}>
                <User className="h-4 w-4 text-[#0E7C7B]" />
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={fieldClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={labelClassName}>
                <Phone className="h-4 w-4 text-[#0E7C7B]" />
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder={phoneExample}
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className={labelClassName}>
              <MapPin className="h-4 w-4 text-[#0E7C7B]" />
              Delivery Address
            </Label>
            <Input
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, area, landmark"
              className={fieldClassName}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city" className={labelClassName}>
                <MapPin className="h-4 w-4 text-[#0E7C7B]" />
                {regionLabel}
              </Label>
              <select
                id="city"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                className={selectClassName}
              >
                <option value="">{`Select your ${regionLabel.toLowerCase()}`}</option>
                {regions.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className={labelClassName}>
                <Package className="h-4 w-4 text-[#0E7C7B]" />
                Selected Bundle
              </Label>
              <select
                id="quantity"
                name="quantity"
                required
                value={formData.quantity}
                onChange={handleChange}
                className={selectClassName}
              >
                {bundles.map((bundle) => (
                  <option key={bundle.id} value={bundle.orderQuantity}>
                    {bundle.title} - {formatCurrency(bundle.price, countryCode)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDeliveryMessage" className={labelClassName}>
              <MessageSquare className="h-4 w-4 text-[#0E7C7B]" />
              Short Delivery Message
            </Label>
            <textarea
              id="shortDeliveryMessage"
              name="shortDeliveryMessage"
              rows={3}
              value={formData.shortDeliveryMessage}
              onChange={handleChange}
              placeholder="Optional note for delivery, landmark or preferred call instruction"
              className={textareaClassName}
            />
          </div>

          {orderFormCopy.enableTokenField ? renderTokenField() : null}

          <div className="rounded-[1.6rem] bg-[#FF7A00] p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/45">
                  {orderFormCopy.summaryLabel}
                </p>
                <h4 className="mt-2 text-xl font-bold">{selectedBundle.title}</h4>
                <p className="mt-1 text-sm text-white/68">
                  {selectedBundle.features.join(' / ')}
                </p>
                {formData.shortDeliveryMessage.trim() ? (
                  <p className="mt-2 text-sm text-white/72">
                    Delivery note: {formData.shortDeliveryMessage.trim()}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">{orderFormCopy.totalLabel}</p>
                <p className="mt-2 text-2xl font-black">
                  {formatCurrency(pricing.finalAmount, countryCode)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1 border-t border-white/15 pt-4 text-sm text-white/82">
              <p>Subtotal: {formatCurrency(pricing.baseAmount, countryCode)}</p>
              <p>Delivery region: {countryName}</p>
              {pricing.discountAmount > 0 ? (
                <>
                  <p>
                    Token discount ({pricing.discountPercentage}%): -{formatCurrency(pricing.discountAmount, countryCode)}
                  </p>
                  <p>Applied token: {tokenRecord?.token}</p>
                </>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            className="btn-3d btn-3d-orange w-full py-4 text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting Order...' : orderFormCopy.submitButtonLabel}
          </button>

          {submitError ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                isDark
                  ? 'border-red-500/40 bg-red-500/10 text-red-200'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {submitError}
            </div>
          ) : null}

          <p className={`text-center text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-stone-500'}`}>
            {orderFormCopy.confirmationNote}
          </p>
        </form>
      </div>
    );
  };

  const parentSurfaceClassName = isDark
    ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] text-white shadow-[0_-28px_90px_rgba(2,6,23,0.68)]'
    : 'bg-white shadow-[0_-28px_90px_rgba(15,23,42,0.36)]';
  const childSurfaceClassName = isDark
    ? 'bg-gradient-to-br from-[#07111f] via-[#0b2448] to-[#11336d]'
    : 'bg-gradient-to-br from-[#0E7C7B] via-[#1f6ebf] to-[#2B7FFF]';
  const headerButtonClassName = isDark
    ? 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white shadow-sm transition hover:bg-white/14'
    : 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-700 shadow-sm transition hover:bg-stone-200';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={onClose}
          />

          <motion.aside
            aria-modal="true"
            className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:px-6 md:py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
          >
            <motion.div
              animate={{ height: isExpanded ? '100dvh' : '99dvh' }}
              transition={{ duration: 0.42, ease: motionEase }}
              className={`relative flex h-full w-full max-w-[29rem] min-h-0 flex-col overflow-hidden rounded-t-[2.25rem] ${parentSurfaceClassName} md:hidden`}
            >
              <div className="px-4 pt-3">
                <div className={`mx-auto h-1.5 w-14 rounded-full ${isDark ? 'bg-white/18' : 'bg-stone-300'}`} />
              </div>

              <div className="flex items-center justify-between px-5 pt-4">
                <button
                  type="button"
                  className={headerButtonClassName}
                  onClick={onClose}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="sr-only">Close checkout</span>
                </button>

                <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                  {selectedBundle ? orderFormCopy.orderDetailsLabel : orderFormCopy.quickCheckoutLabel}
                </p>

                <div className={headerButtonClassName}>
                  <MoreVertical className="h-5 w-5" />
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-4">
                <AnimatePresence initial={false} mode="wait">
                  {!selectedBundle && (
                    <motion.div
                      key={activeBundle.id}
                      className="pointer-events-none flex h-full flex-col items-center px-4 pt-2 text-center"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -28, scale: 0.98 }}
                      transition={{ duration: 0.28, ease: motionEase }}
                    >
                      <div className={`h-36 w-36 overflow-hidden rounded-[2.4rem] ${isDark ? 'bg-slate-900' : 'bg-[#f4ede3]'} shadow-[0_18px_32px_rgba(15,23,42,0.1)]`}>
                        <ImageWithFallback
                          src={activeBundle.image}
                          alt={`${activeBundle.title} preview`}
                          className="h-full w-full object-cover [will-change:transform,opacity]"
                        />
                      </div>

                      <p className={`mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                        {orderFormCopy.packagePreviewLabel}
                      </p>
                      <h2 className={`mt-3 text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-stone-950'}`}>
                        {product.name}
                      </h2>
                      <p className={`mt-2 text-base font-medium ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>{activeBundle.title}</p>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <span className={`rounded-full px-4 py-2 text-xs font-semibold line-through ${isDark ? 'bg-white/10 text-slate-300' : 'bg-stone-200 text-stone-500'}`}>
                          {formatCurrency(activeBundle.oldPrice, countryCode)}
                        </span>
                        <span className="inline-flex rounded-full bg-stone-950 px-5 py-2 text-sm font-semibold text-white shadow-lg">
                          Promo {formatCurrency(activeBundle.price, countryCode)}
                        </span>
                      </div>

                      <p className={`mx-auto mt-4 max-w-[18rem] text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-stone-500'}`}>
                        {product.shortDescription}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.section
                  animate={{ height: isExpanded ? 'calc(100% - 0.5rem)' : '58%' }}
                  transition={{ duration: 0.38, ease: motionEase }}
                  className={`absolute inset-x-0 bottom-0 flex min-h-0 flex-col rounded-t-[2.8rem] ${childSurfaceClassName}`}
                >
                  <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/16" />

                  <div ref={childScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">
                    <AnimatePresence initial={false} mode="wait">
                      {!selectedBundle ? (
                        <motion.div
                          key="bundle-selection"
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -18 }}
                          transition={{ duration: 0.24, ease: motionEase }}
                          className="space-y-4"
                        >
                          <div>
                            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
                              {orderFormCopy.childSheetLabel}
                            </p>
                            <h3 className="mt-2 text-center text-2xl font-black tracking-tight text-white">
                              {orderFormCopy.childSheetTitle}
                            </h3>
                            <p className="mt-2 text-center text-sm leading-6 text-white/65">
                              {orderFormCopy.childSheetDescription}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {bundles.map((bundle, index) => (
                              <button
                                key={bundle.id}
                                type="button"
                                onClick={() => handleBundleSelect(index)}
                                className={`w-full rounded-[1.7rem] p-4 text-center shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(15,23,42,0.16)] ${
                                  isDark ? 'bg-slate-950/60 text-white' : 'bg-[#f8f1e8] text-stone-950'
                                }`}
                              >
                                <div className="flex flex-col items-center gap-4">
                                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[1.25rem] bg-white">
                                    <ImageWithFallback
                                      src={bundle.image}
                                      alt={bundle.title}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                      <h4 className="text-lg font-black tracking-tight">{bundle.title}</h4>
                                      {bundle.isBestValue && (
                                        <span className="rounded-full bg-[#FF7A00]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF7A00]">
                                          Best value
                                        </span>
                                      )}
                                    </div>

                                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>{bundle.description}</p>

                                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                      <span className={warmPillClassName}>{bundle.spotlight}</span>
                                      <span className={`rounded-full px-3 py-1 text-xs font-semibold line-through ${isDark ? 'bg-white/10 text-slate-300' : 'bg-stone-200 text-stone-500'}`}>
                                        {formatCurrency(bundle.oldPrice, countryCode)}
                                      </span>
                                      <span className="rounded-full bg-[#FF7A00] px-3 py-1 text-xs font-semibold text-white">
                                        Promo {formatCurrency(bundle.price, countryCode)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-white">
                                    <Check className="h-4 w-4" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="checkout-form"
                          initial={{ opacity: 0, y: 22 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.28, ease: motionEase }}
                          className="space-y-4"
                        >
                          {renderSelectedBundleSummary()}
                          {renderCheckoutForm()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.section>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: motionEase }}
              className={`hidden h-[92vh] max-h-[860px] w-full max-w-[78rem] overflow-hidden rounded-[2.5rem] ${parentSurfaceClassName} md:flex`}
            >
              <div className={`relative flex w-[43%] min-w-0 flex-col overflow-hidden border-r ${isDark ? 'border-white/10' : 'border-stone-200'} px-8 py-8`}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className={headerButtonClassName}
                    onClick={onClose}
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">Close checkout</span>
                  </button>

                  <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                    {selectedBundle ? orderFormCopy.orderDetailsLabel : orderFormCopy.quickCheckoutLabel}
                  </p>
                </div>

                <div className={`mt-8 rounded-[2.2rem] border p-5 ${isDark ? 'border-white/10 bg-white/5' : 'border-stone-200 bg-[#f8f5ee]'}`}>
                  <div className={`overflow-hidden rounded-[2rem] ${isDark ? 'bg-slate-950' : 'bg-white'} shadow-[0_18px_40px_rgba(15,23,42,0.12)]`}>
                    <ImageWithFallback
                      src={(selectedBundle ?? activeBundle).image}
                      alt={`${(selectedBundle ?? activeBundle).title} preview`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-stone-400'}`}>
                    {orderFormCopy.packagePreviewLabel}
                  </p>
                  <h2 className={`mt-3 text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-stone-950'}`}>
                    {product.name}
                  </h2>
                  <p className={`mt-3 text-xl font-semibold ${isDark ? 'text-slate-200' : 'text-stone-700'}`}>
                    {(selectedBundle ?? activeBundle).title}
                  </p>
                  <p className={`mt-3 max-w-xl text-base leading-7 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                    {selectedBundle ? selectedBundle.description : product.shortDescription}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold line-through ${isDark ? 'bg-white/8 text-slate-300' : 'bg-stone-100 text-stone-500'}`}>
                    {formatCurrency((selectedBundle ?? activeBundle).oldPrice, countryCode)}
                  </span>
                  <span className="rounded-full bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white">
                    Promo {formatCurrency((selectedBundle ?? activeBundle).price, countryCode)}
                  </span>
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${isDark ? 'bg-[#1d355f] text-slate-100' : 'bg-[#eef4ff] text-[#1f56c6]'}`}>
                    Save {formatCurrency((selectedBundle ?? activeBundle).savings, countryCode)}
                  </span>
                </div>

                <div className="mt-auto space-y-3">
                  {(selectedBundle ?? activeBundle).features.slice(0, 3).map((feature) => (
                    <div
                      key={feature}
                      className={`rounded-[1.4rem] border px-4 py-4 text-sm font-medium ${
                        isDark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex min-w-0 flex-1 flex-col ${childSurfaceClassName}`}>
                <div className="flex items-center justify-between border-b border-white/10 px-8 py-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
                      {orderFormCopy.childSheetLabel}
                    </p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                      {selectedBundle ? orderFormCopy.orderDetailsLabel : orderFormCopy.childSheetTitle}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                      {selectedBundle ? 'Complete the details below to lock in your selected package.' : orderFormCopy.childSheetDescription}
                    </p>
                  </div>

                  {selectedBundle ? (
                    <button
                      type="button"
                      onClick={handleChangeSelection}
                      className="btn-3d btn-3d-orange rounded-full px-5 py-3 text-sm font-semibold text-white"
                    >
                      {orderFormCopy.changeSelectionLabel}
                    </button>
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
                      <MoreVertical className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
                  {!selectedBundle ? (
                    <div className="grid grid-cols-2 gap-5 xl:grid-cols-2">
                      {bundles.map((bundle, index) => (
                        <button
                          key={bundle.id}
                          type="button"
                          onClick={() => handleBundleSelect(index)}
                          className={`flex h-full flex-col items-center rounded-[2rem] p-6 text-center shadow-[0_18px_34px_rgba(2,6,23,0.18)] transition duration-200 hover:-translate-y-1 ${
                            isDark ? 'bg-slate-950/60 text-white' : 'bg-[#f8f1e8] text-stone-950'
                          }`}
                        >
                          <div className="h-20 w-20 overflow-hidden rounded-[1.4rem] bg-white">
                            <ImageWithFallback
                              src={bundle.image}
                              alt={bundle.title}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                            <h4 className="text-xl font-black tracking-tight">{bundle.title}</h4>
                            {bundle.isBestValue ? (
                              <span className="rounded-full bg-[#FF7A00]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF7A00]">
                                Best value
                              </span>
                            ) : null}
                          </div>

                          <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                            {bundle.description}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <span className={warmPillClassName}>{bundle.spotlight}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold line-through ${isDark ? 'bg-white/10 text-slate-300' : 'bg-stone-200 text-stone-500'}`}>
                              {formatCurrency(bundle.oldPrice, countryCode)}
                            </span>
                            <span className="rounded-full bg-[#FF7A00] px-3 py-1 text-xs font-semibold text-white">
                              Promo {formatCurrency(bundle.price, countryCode)}
                            </span>
                          </div>

                          <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-white text-stone-900'}`}>
                            Continue
                            <Check className="h-4 w-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                      <div className="space-y-4">
                        {renderSelectedBundleSummary(false)}
                        <div className={`${warmCardClassName} text-center`}>
                          <p className={`text-xs font-semibold uppercase tracking-[0.26em] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                            {orderFormCopy.summaryLabel}
                          </p>
                          <h4 className={`mt-3 text-2xl font-black ${isDark ? 'text-white' : 'text-stone-950'}`}>
                            {selectedBundle.title}
                          </h4>
                          <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-stone-600'}`}>
                            {selectedBundle.features.join(' / ')}
                          </p>
                          <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-white text-stone-700'}`}>
                              {regionLabel}: {formData.city || `Select your ${regionLabel.toLowerCase()}`}
                            </span>
                            <span className="rounded-full bg-[#FF7A00] px-3 py-1 text-xs font-semibold text-white">
                              {formatCurrency(pricing.finalAmount, countryCode)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {renderCheckoutForm()}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
