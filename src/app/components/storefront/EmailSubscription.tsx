import { type ChangeEvent, type FormEvent, useState } from 'react';
import { BadgeCheck, Mail, ShieldCheck, Ticket } from 'lucide-react';
import { createCustomerDiscountToken, findCustomerDiscountTokenByIdentity } from '../../lib/customerTokens';
import type { CustomerTokenRecord } from '../../types';
import { ScrollReveal } from '../animations/ScrollReveal';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';

interface EmailSubscriptionProps {
  productName?: string;
  productSlug?: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  privacyNote?: string;
}

export function EmailSubscription({
  productName,
  productSlug,
  title = 'Subscribe for Exclusive Discounts',
  subtitle = 'Join our customer subscriber program to get a unique token for 10% off your next 5 orders.',
  buttonLabel = 'Subscribe Now',
  privacyNote = 'We respect customer privacy and only collect what is required for token recovery.',
}: EmailSubscriptionProps) {
  const [subscriptionForm, setSubscriptionForm] = useState({
    fullName: '',
    gender: '',
    location: '',
    email: '',
  });
  const [lookupForm, setLookupForm] = useState({
    fullName: '',
    email: '',
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [subscriptionRecord, setSubscriptionRecord] = useState<CustomerTokenRecord | null>(null);
  const [lookupRecord, setLookupRecord] = useState<CustomerTokenRecord | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [subscriptionError, setSubscriptionError] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupError, setLookupError] = useState('');

  const handleSubscriptionChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setSubscriptionForm((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleLookupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setLookupForm((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubscriptionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setSubscriptionError('');
    setSubscriptionMessage('');
    setSubscriptionRecord(null);

    try {
      const record = await createCustomerDiscountToken({
        fullName: subscriptionForm.fullName,
        gender: subscriptionForm.gender,
        location: subscriptionForm.location,
        email: subscriptionForm.email,
        sourceProductName: productName,
        sourceProductSlug: productSlug,
        sourcePageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });

      setSubscriptionRecord(record);
      setSubscriptionMessage(`Subscription successful. Your token is ${record.token}.`);
      setSubscriptionForm({
        fullName: '',
        gender: '',
        location: '',
        email: '',
      });
    } catch (error) {
      if (error instanceof Error) {
        setSubscriptionError(error.message);
      } else {
        setSubscriptionError('We could not process your subscription right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsCheckingToken(true);
    setLookupMessage('');
    setLookupError('');
    setLookupRecord(null);

    try {
      const result = await findCustomerDiscountTokenByIdentity(lookupForm.fullName, lookupForm.email);

      if (!result.isFound || !result.record) {
        setLookupError(result.message);
        return;
      }

      setLookupRecord(result.record);
      setLookupMessage(result.message);
    } finally {
      setIsCheckingToken(false);
    }
  };

  return (
    <ScrollReveal>
      <section className={`bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] ${isExpanded ? 'py-16 md:py-20' : 'py-10 md:py-12'}`}>
        <div className="container mx-auto max-w-3xl px-4 text-center">
          {!isExpanded ? (
            <Button
              type="button"
              size="lg"
              className="rounded-full bg-white px-10 py-4 text-base font-semibold text-[#0E7C7B] hover:bg-gray-100"
              onClick={() => setIsExpanded(true)}
            >
              {buttonLabel}
            </Button>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>

              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                {title}
              </h2>
              <p className="mb-8 text-xl text-white/90">
                {subtitle}
              </p>

              <Card padding="lg" className="mx-auto max-w-3xl">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="text-sm font-semibold text-[#0E7C7B] underline underline-offset-4"
                  >
                    Hide subscription details
                  </button>
                </div>

                <form onSubmit={handleSubscriptionSubmit} className="grid gap-3 text-left md:grid-cols-2">
                  <input
                    type="text"
                    name="fullName"
                    value={subscriptionForm.fullName}
                    onChange={handleSubscriptionChange}
                    placeholder="Customer name"
                    required
                    className="h-12 rounded-xl border border-gray-300 px-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0E7C7B]"
                  />
                  <select
                    name="gender"
                    value={subscriptionForm.gender}
                    onChange={handleSubscriptionChange}
                    required
                    className="h-12 rounded-xl border border-gray-300 px-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0E7C7B]"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  <input
                    type="text"
                    name="location"
                    value={subscriptionForm.location}
                    onChange={handleSubscriptionChange}
                    placeholder="Location (State / City)"
                    required
                    className="h-12 rounded-xl border border-gray-300 px-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0E7C7B]"
                  />
                  <input
                    type="email"
                    name="email"
                    value={subscriptionForm.email}
                    onChange={handleSubscriptionChange}
                    placeholder="Email address"
                    required
                    className="h-12 rounded-xl border border-gray-300 px-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0E7C7B] md:col-span-2"
                  />
                  <Button
                    variant="primary"
                    type="submit"
                    size="md"
                    className="md:col-span-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Subscribing...' : 'Subscribe and Generate Token'}
                  </Button>
                </form>

                {subscriptionMessage ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-800">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <BadgeCheck className="h-4 w-4" />
                      {subscriptionMessage}
                    </p>
                    {subscriptionRecord ? (
                      <p className="mt-2 text-sm">
                        Token: <span className="font-bold tracking-wide">{subscriptionRecord.token}</span> |{' '}
                        {subscriptionRecord.remainingUses} discounted order(s) left.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {subscriptionError ? (
                  <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm font-semibold text-red-700">
                    {subscriptionError}
                  </p>
                ) : null}

                <div className="mt-5 text-left">
                  <button
                    type="button"
                    onClick={() => setIsLearnMoreOpen((currentValue) => !currentValue)}
                    className="text-sm font-semibold text-[#0E7C7B] underline underline-offset-4"
                  >
                    {isLearnMoreOpen ? 'Hide subscriber details' : 'Learn more about customer subscriber access'}
                  </button>

                  {isLearnMoreOpen ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">What it offers</p>
                      <p>
                        Subscribers receive a unique discount token for 10% off the next 5 orders, plus
                        priority access to selected offers.
                      </p>
                      <p className="font-semibold text-slate-900">How it works</p>
                      <p>
                        Your token is generated after subscription and can be applied in any product order
                        form before checkout.
                      </p>
                      <p className="font-semibold text-slate-900">Data we collect</p>
                      <p>Name, gender, location, and email only, so we can identify your token and support account recovery.</p>
                      <p className="font-semibold text-slate-900">Privacy note</p>
                      <p>{privacyNote}</p>
                      <p className="font-semibold text-slate-900">Data we do not collect</p>
                      <p>No card details, no national ID data, no passwords, and no hidden files from your device.</p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-[#2B7FFF]/40 bg-[#f5f9ff] p-5 text-left">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Ticket className="h-4 w-4 text-[#2B63D9]" />
                    Check your customer token
                  </p>
                  <form onSubmit={handleLookupSubmit} className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      name="fullName"
                      value={lookupForm.fullName}
                      onChange={handleLookupChange}
                      placeholder="Full name"
                      required
                      className="h-11 rounded-xl border border-slate-300 px-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2B63D9]"
                    />
                    <input
                      type="email"
                      name="email"
                      value={lookupForm.email}
                      onChange={handleLookupChange}
                      placeholder="Email address"
                      required
                      className="h-11 rounded-xl border border-slate-300 px-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2B63D9]"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="md:col-span-2"
                      disabled={isCheckingToken}
                    >
                      {isCheckingToken ? 'Checking token...' : 'Find My Token'}
                    </Button>
                  </form>

                  {lookupMessage ? (
                    <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      {lookupMessage}
                    </p>
                  ) : null}
                  {lookupRecord ? (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Token: {lookupRecord.token}
                    </p>
                  ) : null}
                  {lookupError ? (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {lookupError}
                    </p>
                  ) : null}
                </div>
              </Card>
            </>
          )}
        </div>
      </section>
    </ScrollReveal>
  );
}
