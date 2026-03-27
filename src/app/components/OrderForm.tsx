import { useEffect, useMemo, useState } from 'react';
import { MapPin, MessageSquare, Package, Phone, Tag, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { trackAnalyticsButtonClick, trackAnalyticsEvent } from '../lib/analyticsTelemetry';
import { redeemCustomerDiscountToken, validateCustomerDiscountToken } from '../lib/customerTokens';
import { recordSubmittedOrder } from '../lib/adminOrders';
import {
  buildPackageOptions,
  calculateOrderPricing,
  createPlacedOrder,
  persistPlacedOrder,
} from '../lib/orders';
import { syncOrderSubmission } from '../lib/netlifyOrders';
import { trackMetaPurchase } from '../lib/siteTracking';
import { trackSubscriberActivity } from '../lib/subscriberTelemetry';
import { formatCurrency } from '../lib/utils';
import type { CustomerTokenRecord, Product } from '../types';
import { ScrollReveal } from './animations/ScrollReveal';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface OrderFormProps {
  product: Product;
  selectedPackage?: string;
  onPackageChange?: (quantity: string) => void;
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

export function OrderForm({
  product,
  selectedPackage = '1',
  onPackageChange,
}: OrderFormProps) {
  const navigate = useNavigate();
  const { countryCode, countryName, phoneExample, phonePrefix, regionLabel, regions, ratesUpdatedAt } = useLocale();
  const isDark = product.displayMode === 'dark';
  const orderFormCopy = product.sections.orderForm;
  const packageOptions = useMemo(
    () => buildPackageOptions(product, countryCode),
    [countryCode, product, ratesUpdatedAt],
  );
  const fallbackQuantity = Object.keys(packageOptions)[0] ?? '1';
  const [formData, setFormData] = useState({
    fullName: '',
    phone: `${phonePrefix} `,
    address: '',
    city: '',
    quantity: selectedPackage || fallbackQuantity,
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

  useEffect(() => {
    setFormData((currentData) => ({
      ...currentData,
      quantity: selectedPackage || fallbackQuantity,
    }));
  }, [fallbackQuantity, selectedPackage]);

  useEffect(() => {
    setFormData((currentData) => ({
      ...currentData,
      phone: ensurePhonePrefix(currentData.phone, phonePrefix),
      city: regions.includes(currentData.city) ? currentData.city : '',
    }));
  }, [phonePrefix, regions]);

  const selectedPackageDetails =
    packageOptions[formData.quantity] ?? packageOptions[fallbackQuantity];
  const pricing = calculateOrderPricing(
    selectedPackageDetails?.total ?? 0,
    tokenRecord?.discountPercentage ?? 0,
  );

  const clearTokenFeedback = () => {
    setTokenRecord(null);
    setTokenMessage('');
    setTokenError('');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === 'quantity') {
      onPackageChange?.(value);
    }

    if (name === 'phone') {
      value = ensurePhonePrefix(value, phonePrefix);
    }

    if (name === 'customerToken') {
      clearTokenFeedback();
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
        buttonId: 'order_form_apply_token',
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
        packageTitle: selectedPackageDetails?.title ?? '',
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

  const handleSubmit = async (event: React.FormEvent) => {
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
          if (!resolvedTokenRecord) {
            return;
          }
        }
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
        buttonId: 'main_order_form_submit',
        buttonLabel: orderFormCopy.submitButtonLabel,
        orderNumber: placedOrder.orderNumber,
        amount: placedOrder.finalAmount,
        metadata: {
          checkoutMode: 'main',
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

  return (
    <ScrollReveal>
      <section
        id="order-section"
        className={isDark ? 'bg-gradient-to-b from-[#07101f] to-[#040916] py-16 md:py-24' : 'bg-gradient-to-b from-gray-50 to-white py-16 md:py-24'}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-12 text-center">
              <h2 className={`mb-4 text-3xl font-bold md:text-5xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {orderFormCopy.title}
              </h2>
              <p className={`text-xl ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                {orderFormCopy.subtitle}
              </p>
            </div>

            <div
              className={`rounded-3xl p-8 shadow-2xl md:p-12 ${
                isDark
                  ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] text-white shadow-[0_30px_80px_rgba(2,6,23,0.55)]'
                  : 'card-3d bg-white'
              }`}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <User className="h-4 w-4 text-[#0E7C7B]" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={`h-12 rounded-xl text-lg focus:border-[#0E7C7B] focus:ring-[#0E7C7B] ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                    className={`h-12 rounded-xl text-lg focus:border-[#0E7C7B] focus:ring-[#0E7C7B] ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <MapPin className="h-4 w-4 text-[#0E7C7B]" />
                    Delivery Address
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your full address"
                    className={`h-12 rounded-xl text-lg focus:border-[#0E7C7B] focus:ring-[#0E7C7B] ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <MapPin className="h-4 w-4 text-[#0E7C7B]" />
                    {regionLabel}
                  </Label>
                  <select
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className={`h-12 w-full rounded-xl border px-4 text-lg focus:border-[#0E7C7B] focus:outline-none focus:ring-2 focus:ring-[#0E7C7B] ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
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
                  <Label htmlFor="quantity" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Package className="h-4 w-4 text-[#0E7C7B]" />
                    Select Your Package
                  </Label>
                  <select
                    id="quantity"
                    name="quantity"
                    required
                    value={formData.quantity}
                    onChange={handleChange}
                    className={`h-12 w-full rounded-xl border px-4 text-lg focus:border-[#0E7C7B] focus:outline-none focus:ring-2 focus:ring-[#0E7C7B] ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    {Object.entries(packageOptions).map(([value, option]) => (
                      <option key={value} value={value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDeliveryMessage" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                    className={`w-full rounded-xl border px-4 py-3 text-base focus:border-[#0E7C7B] focus:outline-none focus:ring-2 focus:ring-[#0E7C7B] ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400'
                        : 'border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {orderFormCopy.enableTokenField ? (
                  <div
                    className={`rounded-2xl border border-dashed p-5 ${
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
                      {orderFormCopy.tokenPrompt}{' '}
                      {isTokenSectionOpen ? 'Hide token field' : 'Add token'}
                    </button>

                    {isTokenSectionOpen ? (
                      <div className="mt-4 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="customerToken" className={`flex items-center gap-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Tag className="h-4 w-4 text-[#2B7FFF]" />
                            Customer Discount Token
                          </Label>
                          <Input
                            id="customerToken"
                            name="customerToken"
                            type="text"
                            value={formData.customerToken}
                            onChange={handleChange}
                            placeholder="Optional token for 10% off your order"
                            className={`h-12 rounded-xl text-lg uppercase focus:border-[#2B7FFF] focus:ring-[#2B7FFF] ${
                              isDark
                                ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400'
                                : 'border-gray-300 text-gray-900'
                            }`}
                          />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className={`text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            Subscribers receive a unique token for 10% off their next 5 orders.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              trackAnalyticsButtonClick({
                                pagePath: `/product/${product.slug}`,
                                pageType: 'product',
                                productId: product.id,
                                productSlug: product.slug,
                                productName: product.name,
                                buttonId: isTokenSectionOpen ? 'order_form_hide_token' : 'order_form_show_token',
                                buttonLabel: isTokenSectionOpen ? 'Hide token field' : 'Add token',
                              });
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
                ) : null}

                <div
                  className={`rounded-xl p-6 ${
                    isDark
                      ? 'border border-white/10 bg-gradient-to-br from-[#0E7C7B]/18 to-[#2B7FFF]/18 text-slate-200'
                      : 'card-3d bg-gradient-to-br from-[#0E7C7B]/10 to-[#2B7FFF]/10'
                  }`}
                >
                  <h3 className={`mb-3 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Order Summary:</h3>
                  <div className={`space-y-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    <p>{selectedPackageDetails?.sets} ({selectedPackageDetails?.title})</p>
                    <p>Fast delivery across {countryName}</p>
                    <p>Pay on Delivery</p>
                    {formData.shortDeliveryMessage.trim() ? (
                      <p>Delivery note: {formData.shortDeliveryMessage.trim()}</p>
                    ) : null}
                    <p className={`pt-2 text-base font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                      Subtotal: {formatCurrency(pricing.baseAmount, countryCode)}
                    </p>
                    {pricing.discountAmount > 0 ? (
                      <>
                        <p className="text-base font-semibold text-emerald-600">
                          Token discount ({pricing.discountPercentage}%): -{formatCurrency(pricing.discountAmount, countryCode)}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          Applied token: {tokenRecord?.token}
                        </p>
                      </>
                    ) : null}
                    <p className="pt-2 text-2xl font-bold text-[#0E7C7B]">
                      Total: {formatCurrency(pricing.finalAmount, countryCode)}
                    </p>
                  </div>
                </div>

                {submitError ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                      isDark
                        ? 'border-red-500/40 bg-red-500/10 text-red-200'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn-3d btn-3d-orange w-full py-5 text-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting Order...' : orderFormCopy.submitButtonLabel}
                </button>

                <p className={`text-center text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {orderFormCopy.confirmationNote}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
