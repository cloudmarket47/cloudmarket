import { House, LayoutGrid, Search, ShoppingCart } from 'lucide-react';
import { cn } from '../../lib/utils';

export type MarketplaceMobileNavTab = 'home' | 'categories' | 'search' | 'cart';

interface MarketplaceBottomNavProps {
  activeTab: MarketplaceMobileNavTab;
  cartCount: number;
  onTabChange: (tab: MarketplaceMobileNavTab) => void;
  onHome: () => void;
  onCategories: () => void;
  onSearch: () => void;
  onCart: () => void;
}

export function MarketplaceBottomNav({
  activeTab,
  cartCount,
  onTabChange,
  onHome,
  onCategories,
  onSearch,
  onCart,
}: MarketplaceBottomNavProps) {
  const items = [
    { id: 'home' as const, label: 'Home', icon: House, onClick: onHome, badge: null },
    { id: 'categories' as const, label: 'Categories', icon: LayoutGrid, onClick: onCategories, badge: null },
    { id: 'search' as const, label: 'Search', icon: Search, onClick: onSearch, badge: null },
    { id: 'cart' as const, label: 'Cart', icon: ShoppingCart, onClick: onCart, badge: cartCount },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-18px_42px_rgba(15,23,42,0.12)] md:hidden dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl grid-cols-4 gap-1 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onTabChange(item.id);
                item.onClick();
              }}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-[1.2rem] px-1 py-2 text-[11px] font-semibold transition active:scale-[0.98]',
                isActive
                  ? 'bg-[#eaf3ff] text-[#2B63D9] dark:bg-[#12305f] dark:text-[#9fc0ff]'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <span className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive
                      ? 'text-[#2B63D9] dark:text-[#9fc0ff]'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                />
                {typeof item.badge === 'number' ? (
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#ff6a45] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
