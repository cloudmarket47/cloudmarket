interface PackagePriceBreakdownInput {
  packageTitle: string;
  promoPrice: number;
  oldPrice?: number;
}

interface PackagePriceBreakdown {
  oldPrice: number;
  promoPrice: number;
  savings: number;
}

const DEFAULT_PROMO_DISCOUNT_PERCENTAGE = 35;

function parseBundleQuantities(packageTitle: string) {
  const buyQuantity = Number(packageTitle.match(/buy\s+(\d+)/i)?.[1] ?? '');
  const freeQuantity = Number(packageTitle.match(/get\s+(\d+)\s+free/i)?.[1] ?? '');

  if (!Number.isFinite(buyQuantity) || buyQuantity <= 0) {
    return null;
  }

  if (!Number.isFinite(freeQuantity) || freeQuantity <= 0) {
    return null;
  }

  return { buyQuantity, freeQuantity };
}

export function getPackagePriceBreakdown({
  packageTitle,
  promoPrice,
  oldPrice,
}: PackagePriceBreakdownInput): PackagePriceBreakdown {
  const safePromoPrice = Math.max(0, Math.round(promoPrice));
  const safeOldPrice = oldPrice ? Math.max(0, Math.round(oldPrice)) : 0;

  if (safeOldPrice > safePromoPrice) {
    return {
      oldPrice: safeOldPrice,
      promoPrice: safePromoPrice,
      savings: safeOldPrice - safePromoPrice,
    };
  }

  const parsedQuantities = parseBundleQuantities(packageTitle);

  if (parsedQuantities) {
    const unitPrice = safePromoPrice / parsedQuantities.buyQuantity;
    const oldPrice = Math.round(unitPrice * (parsedQuantities.buyQuantity + parsedQuantities.freeQuantity));

    return {
      oldPrice: Math.max(safePromoPrice, oldPrice),
      promoPrice: safePromoPrice,
      savings: Math.max(0, oldPrice - safePromoPrice),
    };
  }

  const fallbackOldPrice = Math.round(safePromoPrice / (1 - DEFAULT_PROMO_DISCOUNT_PERCENTAGE / 100));

  return {
    oldPrice: Math.max(safePromoPrice, fallbackOldPrice),
    promoPrice: safePromoPrice,
    savings: Math.max(0, fallbackOldPrice - safePromoPrice),
  };
}
