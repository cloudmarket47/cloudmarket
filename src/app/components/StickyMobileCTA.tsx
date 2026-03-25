interface StickyMobileCTAProps {
  onBuyNow: (source?: string) => void;
}

export function StickyMobileCTA({ onBuyNow }: StickyMobileCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-12px_26px_rgba(15,23,42,0.08)] md:hidden">
      <div className="mx-auto max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button
          onClick={() => onBuyNow('sticky_mobile_order_now')}
          className="btn-3d btn-3d-orange w-full py-4 text-lg"
        >
          Order Now - Pay on Delivery
        </button>
      </div>
    </div>
  );
}
