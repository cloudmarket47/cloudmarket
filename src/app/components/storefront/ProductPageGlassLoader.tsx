import { useAppTheme } from '../../context/AppThemeContext';

interface ProductPageGlassLoaderProps {
  companyName: string;
}

export function ProductPageGlassLoader({ companyName }: ProductPageGlassLoaderProps) {
  const { isDarkMode } = useAppTheme();

  return (
    <div
      className={`relative min-h-screen overflow-hidden px-4 py-8 ${
        isDarkMode
          ? 'storefront-dark bg-[radial-gradient(circle_at_top,rgba(122,174,255,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(14,124,123,0.16),transparent_24%),linear-gradient(180deg,#07111f_0%,#081a35_52%,#0a1324_100%)]'
          : 'bg-[radial-gradient(circle_at_top,rgba(43,99,217,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,124,123,0.18),transparent_28%),linear-gradient(180deg,#eef4ff_0%,#f7f9fe_46%,#edf3ff_100%)]'
      }`}
    >
      <style>
        {`
          @keyframes cloudmarket-loader-gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-[-4rem] top-16 h-44 w-44 rounded-full bg-[#2B63D9]/14 blur-3xl" />
        <div className="absolute right-[-5rem] top-1/3 h-56 w-56 rounded-full bg-[#0E7C7B]/12 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-1/3 h-64 w-64 rounded-full bg-[#FF7A00]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div
          className={`w-full max-w-xl rounded-[2.6rem] border px-8 py-14 text-center shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl ${
            isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-white/50 bg-white/34'
          }`}
        >
          <div
            className={`mx-auto mb-7 h-20 w-20 rounded-full border shadow-[0_18px_40px_rgba(43,99,217,0.18)] backdrop-blur-xl ${
              isDarkMode ? 'border-white/10 bg-white/[0.08]' : 'border-white/45 bg-white/42'
            }`}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#2B63D9]/18 border-t-[#2B63D9] border-r-[#0E7C7B]" />
            </div>
          </div>

          <h1
            className="bg-[linear-gradient(120deg,#0E7C7B_0%,#2B63D9_38%,#7aaeff_56%,#FF7A00_74%,#0E7C7B_100%)] bg-[length:220%_220%] bg-clip-text text-4xl font-black uppercase tracking-[0.16em] text-transparent sm:text-5xl"
            style={{ animation: 'cloudmarket-loader-gradient 6s ease infinite' }}
          >
            {companyName}
          </h1>

          <p className={`mt-5 text-base font-medium leading-7 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Loading your page please wait.
          </p>
        </div>
      </div>
    </div>
  );
}
