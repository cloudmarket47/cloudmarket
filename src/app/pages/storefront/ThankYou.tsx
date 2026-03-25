import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Download, FileDown, Sparkles } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { ScrollReveal } from '../../components/animations/ScrollReveal';
import { OrderSlipPreview } from '../../components/order/OrderSlipPreview';
import { SuccessSticker } from '../../components/order/SuccessSticker';
import { downloadElementAsImage, saveElementAsPdf } from '../../lib/domExport';
import { getPlacedOrder } from '../../lib/orders';
import { formatCurrency } from '../../lib/utils';
import type { PlacedOrder } from '../../types';

const COMPANY_PHONE = '+234 800 000 0000';

export function ThankYou() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');
  const routedOrder = (location.state as { order?: PlacedOrder } | null)?.order ?? null;
  const [order, setOrder] = useState<PlacedOrder | null>(routedOrder);
  const slipRef = useRef<HTMLDivElement>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isSlipPreviewOpen, setIsSlipPreviewOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (routedOrder) {
      setOrder(routedOrder);
      return;
    }

    let isActive = true;

    void getPlacedOrder(orderNumber).then((loadedOrder) => {
      if (isActive) {
        setOrder(loadedOrder);
      }
    });

    return () => {
      isActive = false;
    };
  }, [orderNumber, routedOrder]);

  const websiteUrl = typeof window === 'undefined' ? 'https://cloudmarket.ng' : window.location.origin;

  const handleDownloadImage = async () => {
    if (!slipRef.current || !order) {
      return;
    }

    setIsDownloadingImage(true);

    try {
      await downloadElementAsImage(slipRef.current, `${order.orderNumber.toLowerCase()}-slip.png`);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!slipRef.current || !order) {
      return;
    }

    setIsPreparingPdf(true);

    try {
      saveElementAsPdf(slipRef.current, `${order.orderNumber} Order Slip`);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-slate-200 bg-white p-10 text-center shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
            Order Complete
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            Thank You for Your Order
          </h1>
          <p className="mt-4 text-lg leading-7 text-slate-600">
            Your order was received, but the full order preview is not available in this session.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/">
              <Button variant="primary" size="lg">
                Return to Homepage
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" size="lg">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-950">
      <ScrollReveal>
        <section className="px-4 pb-12 pt-8 text-center md:pb-16 md:pt-12">
          <div className="mx-auto max-w-6xl rounded-[2.75rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] md:p-10">
            <div className="mx-auto flex max-w-4xl flex-col items-center">
              <SuccessSticker />

              <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-[#eef5ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B63D9]">
                <Sparkles className="h-3.5 w-3.5" />
                Order Successful
              </span>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
                Thank You, {order.customerName}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Your order is confirmed, and you are the heart of our business. We appreciate your trust and we are already preparing your delivery.
              </p>

              <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
                <div className="rounded-[1.6rem] bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Order Number</p>
                  <p className="mt-3 text-lg font-bold text-slate-950">{order.orderNumber}</p>
                </div>
                <div className="rounded-[1.6rem] bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Final Total</p>
                  <p className="mt-3 text-lg font-bold text-slate-950">
                    {formatCurrency(order.finalAmount, order.localeCountryCode)}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Package</p>
                  <p className="mt-3 text-lg font-bold text-slate-950">{order.packageTitle}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/">
                  <Button variant="primary" size="lg">
                    Continue Shopping
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSlipPreviewOpen((currentState) => !currentState)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  Preview Order Slip
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isSlipPreviewOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
              </div>

              {isSlipPreviewOpen ? (
                <div className="mt-8 w-full rounded-[2rem] border border-slate-200 bg-[#f8fafc] p-4 md:p-6">
                  <div className="mb-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      disabled={isDownloadingImage}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      {isDownloadingImage ? 'Preparing Image...' : 'Download as Image'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isPreparingPdf}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      <FileDown className="h-4 w-4" />
                      {isPreparingPdf ? 'Preparing PDF...' : 'Save as PDF'}
                    </button>
                  </div>

                  <OrderSlipPreview
                    ref={slipRef}
                    order={order}
                    companyPhone={COMPANY_PHONE}
                    websiteUrl={websiteUrl}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
