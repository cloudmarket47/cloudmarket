import { useMemo } from 'react';
import { useAppTheme } from '../../context/AppThemeContext';
import { getOptimizedMedia } from '../../lib/media';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';

const WHATSAPP_PHONE_NUMBER = '13364596552';
const DEFAULT_WHATSAPP_MESSAGE = "Hello, please I'm interested in this product.";

function toAbsoluteUrl(value?: string | null) {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '';
  }

  if (typeof window === 'undefined') {
    return normalizedValue;
  }

  try {
    return new URL(normalizedValue, window.location.origin).toString();
  } catch {
    return normalizedValue;
  }
}

function getProductCoverImage(product: Product) {
  return (
    product.sections.hero.image ||
    product.image ||
    product.sections.seeInAction.poster ||
    product.sections.solution.image ||
    product.sections.footerVideo.poster ||
    product.sections.showcase.images.find(Boolean) ||
    product.sections.featureMarquee.images.find(Boolean) ||
    product.sections.offer.packages.find((item) => Boolean(item.image))?.image ||
    ''
  );
}

interface FloatingStorefrontActionsProps {
  className?: string;
  product?: Product;
}

export function FloatingStorefrontActions({
  className,
  product,
}: FloatingStorefrontActionsProps) {
  const { isDarkMode, toggleThemeMode } = useAppTheme();
  const themeEmoji = isDarkMode ? '\u{1F319}' : '\u2600\uFE0F';
  const themeLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
  const whatsappLink = useMemo(() => {
    const pageUrl = product
      ? toAbsoluteUrl(`/product/${product.slug}`)
      : toAbsoluteUrl(typeof window === 'undefined' ? '/' : window.location.pathname);

    const messageLines = product
      ? [
          `Hello, I'm interested in ${product.name}.`,
          `Product page: ${pageUrl}`,
          `Cover image: ${toAbsoluteUrl(getOptimizedMedia(getProductCoverImage(product)))}`,
        ]
      : [DEFAULT_WHATSAPP_MESSAGE, `Page: ${pageUrl}`];

    return `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(
      messageLines.filter(Boolean).join('\n'),
    )}`;
  }, [product]);

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-[5.5rem] right-3 z-[65] flex flex-col gap-3 sm:bottom-6 sm:right-6',
        className,
      )}
    >
      <button
        type="button"
        onClick={toggleThemeMode}
        aria-label={themeLabel}
        className="floating-action-beat pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-lg shadow-[0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-[20px] transition hover:scale-[1.03] sm:h-14 sm:w-14 sm:text-2xl"
      >
        <span aria-hidden="true">{themeEmoji}</span>
      </button>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="floating-action-beat pointer-events-auto inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] shadow-[0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-[20px] transition hover:scale-[1.03] sm:h-14 sm:w-14"
      >
        <img
          src="/assets/whatsapp-icon.svg"
          alt="WhatsApp"
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="sr-only">WhatsApp</span>
      </a>
    </div>
  );
}
