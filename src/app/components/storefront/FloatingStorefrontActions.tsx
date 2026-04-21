import { useAppTheme } from '../../context/AppThemeContext';
import { cn } from '../../lib/utils';

const WHATSAPP_LINK =
  "https://wa.me/13364596552?text=hello%2C%20please%20i'm%20intrested%20in%20this%20product";

export function FloatingStorefrontActions({ className }: { className?: string }) {
  const { isDarkMode, toggleThemeMode } = useAppTheme();
  const themeEmoji = isDarkMode ? '\u{1F319}' : '\u2600\uFE0F';
  const themeLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

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
        href={WHATSAPP_LINK}
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
