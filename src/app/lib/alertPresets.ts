export interface AlertPreset {
  id: string;
  kind: 'offer' | 'stock' | 'order';
  badge: string;
  title: string;
  message: string;
}

export const ALERT_PRESETS: AlertPreset[] = [
  {
    id: 'preset_flash_sale',
    kind: 'offer',
    badge: 'Flash Deal',
    title: 'Flash Sale Live',
    message: 'Promo pricing is active right now. Secure this deal before the timer resets.',
  },
  {
    id: 'preset_limited_stock',
    kind: 'stock',
    badge: 'Low Stock',
    title: 'Stock Running Low',
    message: 'Demand is moving fast and only a few units remain for this batch.',
  },
  {
    id: 'preset_order_burst',
    kind: 'order',
    badge: 'Hot Orders',
    title: 'Orders Coming In',
    message: 'Recent customer orders are pushing this product higher on the bestseller list.',
  },
  {
    id: 'preset_free_delivery',
    kind: 'offer',
    badge: 'Free Delivery',
    title: 'Delivery Included',
    message: 'This offer still includes delivery support, so customers can order without extra shipping surprises.',
  },
  {
    id: 'preset_bundle_savings',
    kind: 'offer',
    badge: 'Bundle Save',
    title: 'Best Bundle Savings',
    message: 'Multi-pack buyers unlock the strongest savings on this page today.',
  },
  {
    id: 'preset_weekend_drop',
    kind: 'offer',
    badge: 'Weekend Drop',
    title: 'Weekend Offer Window',
    message: 'This landing page is running a short weekend-only pricing push.',
  },
  {
    id: 'preset_almost_sold_out',
    kind: 'stock',
    badge: 'Almost Gone',
    title: 'Almost Sold Out',
    message: 'The current batch is nearly exhausted, so late visitors may miss this stock window.',
  },
  {
    id: 'preset_verified_buyers',
    kind: 'order',
    badge: 'Verified',
    title: 'Verified Buyers Active',
    message: 'New verified customers are still placing orders through this page.',
  },
  {
    id: 'preset_priority_dispatch',
    kind: 'order',
    badge: 'Dispatch',
    title: 'Priority Dispatch Queue',
    message: 'Early orders are queued first for faster processing and dispatch.',
  },
  {
    id: 'preset_launch_offer',
    kind: 'offer',
    badge: 'Launch Deal',
    title: 'Launch Offer Still Live',
    message: 'The launch pricing window is still open for a limited number of orders.',
  },
];

export function getAlertPresetById(presetId?: string | null) {
  return ALERT_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function applyAlertPreset(
  presetId: string,
  currentItem?: Partial<{
    kind: 'offer' | 'stock' | 'order';
    badge: string;
    title: string;
    message: string;
    presetId?: string;
  }>,
) {
  const preset = getAlertPresetById(presetId) ?? ALERT_PRESETS[0];

  return {
    ...currentItem,
    kind: preset.kind,
    badge: preset.badge,
    title: preset.title,
    message: preset.message,
    presetId: preset.id,
  };
}
