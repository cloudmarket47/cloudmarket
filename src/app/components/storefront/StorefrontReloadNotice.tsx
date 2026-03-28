import { RefreshCcw } from 'lucide-react';
import { Button } from '../design-system/Button';

interface StorefrontReloadNoticeProps {
  title?: string;
  message?: string;
  className?: string;
}

export function StorefrontReloadNotice({
  title = 'Unable to load this page',
  message = 'We could not fetch the latest page data from Supabase. Please reload the page and try again.',
  className = 'min-h-screen bg-[#f5f7fb] px-4 py-12 dark:bg-[#081225]',
}: StorefrontReloadNoticeProps) {
  return (
    <div className={className}>
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[2.2rem] border border-slate-200 bg-white/88 p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/88">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(43,99,217,0.14),rgba(14,124,123,0.12))] text-[#2B63D9] dark:text-[#9fc0ff]">
            <RefreshCcw className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {message}
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.reload()}
              className="rounded-full px-7"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
