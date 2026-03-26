import { ChevronRight, LayoutGrid, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { marketplaceCategoryIconMap, type CategoryFilterItem } from './marketplaceShared';

interface MarketplaceCategorySheetProps {
  activeFilterSlug: string;
  categoryFilters: CategoryFilterItem[];
  onClose: () => void;
  onSelectCategory: (slug: string | null, label: string) => void;
}

export function MarketplaceCategorySheet({
  activeFilterSlug,
  categoryFilters,
  onClose,
  onSelectCategory,
}: MarketplaceCategorySheetProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close category filter"
        className="fixed inset-0 z-[58] bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-0 z-[60] max-h-[82vh] overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white px-4 pb-8 pt-5 shadow-[0_-18px_54px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2B63D9] dark:text-[#8ab4ff]">
                Category filter
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Shop by category
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close category filter"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectCategory(null, 'All categories');
              onClose();
            }}
            className={cn(
              'mt-5 flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-3 text-left transition',
              activeFilterSlug === 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white',
            )}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2B63D9] shadow-sm">
                <LayoutGrid className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">All categories</span>
                <span className={cn('mt-1 block text-xs', activeFilterSlug === 'all' ? 'text-white/70' : 'text-slate-500')}>
                  Reset filters and browse everything
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="mt-4 space-y-3">
            {categoryFilters.map((category) => {
              const Icon = marketplaceCategoryIconMap[category.icon];
              const isActive = activeFilterSlug === category.slug;

              return (
                <div key={category.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(category.slug, category.name);
                      onClose();
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-[1.2rem] px-2 py-2 text-left transition',
                      isActive ? 'bg-white dark:bg-slate-950' : 'hover:bg-white dark:hover:bg-slate-950',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2B63D9] dark:bg-[#12305f] dark:text-[#9fc0ff]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                          {category.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                          {category.productCount} products
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </button>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {category.subcategories.map((subcategory) => {
                      const isSubActive = activeFilterSlug === subcategory.slug;

                      return (
                        <button
                          key={subcategory.id}
                          type="button"
                          onClick={() => {
                            onSelectCategory(subcategory.slug, subcategory.name);
                            onClose();
                          }}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition',
                            isSubActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
                          )}
                        >
                          <span>{subcategory.name}</span>
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[10px]',
                              isSubActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                            )}
                          >
                            {subcategory.productCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
