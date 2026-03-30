import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CalendarDays,
  Copy,
  Edit,
  Eye,
  Globe2,
  Layers3,
  PackagePlus,
  Palette,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import {
  ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT,
  deleteAdminProductDraft,
  ensureAdminProductDraftsLoaded,
  type AdminCurrency,
  type AdminProductDraft,
  formatDraftCurrency,
  readAdminProductDrafts,
} from '../../lib/adminProductDrafts';
import {
  ADMIN_ORDERS_DATA_CHANGE_EVENT,
  ensureAdminOrdersLoaded,
  readAdminOrders,
} from '../../lib/adminOrders';
import {
  addAdminInventoryStock,
  ADMIN_INVENTORY_STOCK_CHANGE_EVENT,
  ensureAdminInventoryStockLoaded,
  readAdminInventoryStock,
} from '../../lib/adminInventoryStock';
import { getProductCategoryDisplay } from '../../lib/productCategories';
import { formatDate } from '../../lib/utils';

function getDraftCoverImage(draft: AdminProductDraft) {
  return (
    draft.coverImage.src ||
    draft.sections.hero.images.find((image) => image.src)?.src ||
    draft.sections.hero.image.src ||
    'https://placehold.co/800x600?text=Draft+Product'
  );
}

function MetaPill({
  icon: Icon,
  label,
  value,
  tone = 'slate',
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
  tone?: 'slate' | 'blue' | 'emerald' | 'orange';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'bg-[#eef5ff] text-[#2B63D9]'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'orange'
          ? 'bg-orange-50 text-orange-700'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${toneClassName}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}: {value}</span>
    </div>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)] md:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}

function AdminMetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Globe2;
  tone: 'blue' | 'orange' | 'emerald';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'bg-[#eef5ff] text-[#2B63D9]'
      : tone === 'orange'
        ? 'bg-orange-50 text-orange-700'
        : 'bg-emerald-50 text-emerald-700';

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClassName}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function DraftProductCard({
  draft,
  isDeleting,
  onDelete,
}: {
  draft: AdminProductDraft;
  isDeleting: boolean;
  onDelete: (draft: AdminProductDraft) => void;
}) {
  const isPublished = draft.status === 'published';

  return (
    <Card
      key={draft.id}
      padding="none"
      hover
      className="group overflow-hidden rounded-[1.9rem] border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_65px_rgba(15,23,42,0.12)]"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-slate-100">
        <ImageWithFallback src={getDraftCoverImage(draft)} alt={draft.productName} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
        <div className="absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-white/90 text-slate-700'}`}>{draft.status}</span>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-slate-700">{draft.currency}</span>
            <span className="inline-flex rounded-full bg-slate-950/72 px-3 py-1 text-[11px] font-semibold capitalize text-white backdrop-blur">{draft.themeMode} mode</span>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">{getProductCategoryDisplay(draft)}</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{draft.pageName}</h3>
          <p className="mt-1 text-sm text-white/78">{draft.productName}</p>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[1.35rem] bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Base Price</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-[#0E7C7B]">{formatDraftCurrency(draft.basePrice, draft.currency)}</p>
          </div>
          <div className="rounded-[1.35rem] bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Last Updated</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(draft.updatedAt)}</p>
            <p className="mt-1 text-xs text-slate-500">Slug: /product/{draft.slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <MetaPill icon={Target} label="Audience" value={draft.targetAudience} tone="blue" />
          <MetaPill icon={Palette} label="Gender" value={draft.genderTarget} />
          <MetaPill icon={Tag} label="Status" value={draft.status} tone={isPublished ? 'emerald' : 'orange'} />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link to={`/admin/products/${draft.id}/edit`}><Button variant="secondary" size="sm" fullWidth className="rounded-2xl"><Edit className="h-4 w-4" />Edit</Button></Link>
          <Link to={`/admin/products/create?duplicateFrom=${draft.id}&source=draft`}><Button variant="ghost" size="sm" fullWidth className="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100"><Copy className="h-4 w-4" />Duplicate</Button></Link>
          {isPublished ? (
            <Link to={`/product/${draft.slug}`}><Button variant="primary" size="sm" fullWidth className="rounded-2xl"><Eye className="h-4 w-4" />View Live</Button></Link>
          ) : (
            <Button variant="ghost" size="sm" fullWidth className="rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-50" disabled><Eye className="h-4 w-4" />Draft Only</Button>
          )}
        </div>
        <button type="button" onClick={() => onDelete(draft)} disabled={isDeleting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Deleting page...' : 'Delete Page'}
        </button>
      </div>
    </Card>
  );
}

interface InventoryItem {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  category: string;
  subcategory: string;
  currency: AdminCurrency;
  sellingPrice: number;
  purchaseCost: number;
  profit: number;
  stockRecorded: number;
  stockAvailable: number;
  soldCount: number;
  sourceLabel: string;
}

const STOCK_REDUCING_STATUSES = new Set(['new', 'confirmed', 'processing', 'delivered']);

function matchesInventorySearch(item: InventoryItem, query: string) {
  if (!query.trim()) return true;
  const normalizedQuery = query.trim().toLowerCase();
  return [item.name, item.slug, item.category, item.subcategory, item.sourceLabel].some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function Products() {
  const [draftProducts, setDraftProducts] = useState<AdminProductDraft[]>([]);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [selectedStockProductId, setSelectedStockProductId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [isRecordingStock, setIsRecordingStock] = useState(false);
  const [soldQuantities, setSoldQuantities] = useState<Map<string, number>>(new Map());
  const [stockLevels, setStockLevels] = useState<Map<string, number>>(new Map());
  const [actionFeedback, setActionFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [stockFeedback, setStockFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const loadAdminData = async () => {
      await Promise.all([
        ensureAdminProductDraftsLoaded().catch(() => undefined),
        ensureAdminOrdersLoaded().catch(() => undefined),
        ensureAdminInventoryStockLoaded().catch(() => undefined),
      ]);
      setDraftProducts(readAdminProductDrafts());
      const nextSoldQuantities = new Map<string, number>();
      readAdminOrders().forEach((order) => {
        if (!STOCK_REDUCING_STATUSES.has(order.status)) return;
        const key = order.productId || order.productSlug;
        if (!key) return;
        nextSoldQuantities.set(key, (nextSoldQuantities.get(key) ?? 0) + order.quantity);
      });
      const nextStockLevels = new Map<string, number>();
      readAdminInventoryStock().forEach((entry) => {
        const key = entry.productId || entry.productSlug;
        if (!key) return;
        nextStockLevels.set(key, entry.quantityOnHand);
      });
      setSoldQuantities(nextSoldQuantities);
      setStockLevels(nextStockLevels);
    };

    void loadAdminData();
    window.addEventListener(ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT, loadAdminData as EventListener);
    window.addEventListener(ADMIN_ORDERS_DATA_CHANGE_EVENT, loadAdminData as EventListener);
    window.addEventListener(ADMIN_INVENTORY_STOCK_CHANGE_EVENT, loadAdminData as EventListener);
    return () => {
      window.removeEventListener(ADMIN_PRODUCT_DRAFTS_CHANGE_EVENT, loadAdminData as EventListener);
      window.removeEventListener(ADMIN_ORDERS_DATA_CHANGE_EVENT, loadAdminData as EventListener);
      window.removeEventListener(ADMIN_INVENTORY_STOCK_CHANGE_EVENT, loadAdminData as EventListener);
    };
  }, []);

  const metrics = useMemo(() => {
    const publishedDrafts = draftProducts.filter((draft) => draft.status === 'published').length;
    return { totalDraftPages: draftProducts.length, publishedDrafts, baseCatalogCount: 1 };
  }, [draftProducts]);

  const inventoryItems = useMemo(() => {
    const items = new Map<string, InventoryItem>();
    draftProducts.filter((draft) => draft.status === 'published').forEach((draft) => {
      const soldCount = soldQuantities.get(draft.id) ?? soldQuantities.get(draft.slug) ?? 0;
      const stockRecorded = stockLevels.get(draft.id) ?? stockLevels.get(draft.slug) ?? 0;
      items.set(draft.id, {
        id: draft.id,
        slug: draft.slug,
        name: draft.productName,
        categoryId: draft.categoryId,
        category: draft.category,
        subcategory: draft.subcategory,
        currency: draft.currency,
        sellingPrice: draft.basePrice,
        purchaseCost: draft.purchaseCost,
        profit: draft.basePrice - draft.purchaseCost,
        stockRecorded,
        stockAvailable: Math.max(0, stockRecorded - soldCount),
        soldCount,
        sourceLabel: 'Published page',
      });
    });
    return Array.from(items.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [draftProducts, soldQuantities, stockLevels]);

  const inventoryCategoryOptions = useMemo(() => {
    const categories = new Map<string, string>();
    inventoryItems.forEach((item) => categories.set(item.categoryId, item.category));
    return Array.from(categories.entries()).map(([value, label]) => ({ value, label })).sort((left, right) => left.label.localeCompare(right.label));
  }, [inventoryItems]);

  const inventorySearchSuggestions = useMemo(() => {
    const normalizedQuery = inventorySearch.trim().toLowerCase();
    if (!normalizedQuery) return [] as string[];
    const suggestions = new Set<string>();
    inventoryItems.forEach((item) => {
      [item.name, item.category, item.subcategory, item.slug].forEach((value) => {
        if (value.toLowerCase().includes(normalizedQuery)) suggestions.add(value);
      });
    });
    return Array.from(suggestions).slice(0, 6);
  }, [inventoryItems, inventorySearch]);

  const filteredInventoryItems = useMemo(() => inventoryItems.filter((item) => (inventoryCategoryFilter === 'all' || item.categoryId === inventoryCategoryFilter) && matchesInventorySearch(item, inventorySearch)), [inventoryCategoryFilter, inventoryItems, inventorySearch]);
  const groupedInventoryItems = useMemo(() => {
    const groups = new Map<string, { label: string; items: InventoryItem[] }>();
    filteredInventoryItems.forEach((item) => {
      const groupKey = item.categoryId || item.category;
      const currentGroup = groups.get(groupKey);
      if (currentGroup) currentGroup.items.push(item);
      else groups.set(groupKey, { label: item.category, items: [item] });
    });
    return Array.from(groups.values()).map((group) => ({ ...group, items: group.items.sort((left, right) => left.name.localeCompare(right.name)) })).sort((left, right) => left.label.localeCompare(right.label));
  }, [filteredInventoryItems]);

  const inventorySummary = useMemo(() => ({
    publishedProducts: inventoryItems.length,
    inStock: inventoryItems.reduce((total, item) => total + item.stockAvailable, 0),
    sold: inventoryItems.reduce((total, item) => total + item.soldCount, 0),
  }), [inventoryItems]);

  const selectedStockProduct = useMemo(() => inventoryItems.find((item) => item.id === selectedStockProductId) ?? null, [inventoryItems, selectedStockProductId]);

  useEffect(() => {
    if (inventoryItems.length === 0) {
      if (selectedStockProductId) setSelectedStockProductId('');
      return;
    }
    if (!inventoryItems.some((item) => item.id === selectedStockProductId)) setSelectedStockProductId(inventoryItems[0].id);
  }, [inventoryItems, selectedStockProductId]);

  const handleDeleteDraft = async (draft: AdminProductDraft) => {
    const confirmed = window.confirm(`Delete "${draft.pageName}"? This will remove the product page from the admin dashboard and storefront.`);
    if (!confirmed) return;
    setDeletingDraftId(draft.id);
    setActionFeedback(null);
    try {
      const deleted = await deleteAdminProductDraft(draft.id);
      setActionFeedback(deleted ? { tone: 'success', message: `${draft.pageName} was deleted successfully.` } : { tone: 'error', message: 'This product page could not be deleted.' });
    } catch (error) {
      setActionFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to delete this product page right now.' });
    } finally {
      setDeletingDraftId(null);
    }
  };

  const handleAddStock = async () => {
    if (!selectedStockProduct) {
      setStockFeedback({ tone: 'error', message: 'Select a published product before recording stock.' });
      return;
    }
    const quantity = Number(stockQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStockFeedback({ tone: 'error', message: 'Enter a stock quantity greater than zero.' });
      return;
    }
    setIsRecordingStock(true);
    setStockFeedback(null);
    try {
      await addAdminInventoryStock({ productId: selectedStockProduct.id, productSlug: selectedStockProduct.slug, quantity });
      setStockQuantity('');
      setStockFeedback({ tone: 'success', message: `${selectedStockProduct.name} stock increased by ${Math.round(quantity)} unit${Math.round(quantity) === 1 ? '' : 's'}.` });
    } catch (error) {
      setStockFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to record stock for this product right now.' });
    } finally {
      setIsRecordingStock(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(238,245,255,0.9))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Product Pages
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Manage your live pages and reusable product templates
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Create new product pages from the default template, save drafts privately, and publish only the pages you want shoppers to see.
            </p>
          </div>
          <Link to="/admin/products/create">
            <Button variant="primary" size="md" className="rounded-2xl">
              <Plus className="h-5 w-5" />
              Create New Product
            </Button>
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminMetricCard label="Saved product pages" value={String(metrics.totalDraftPages)} icon={Layers3} tone="blue" />
          <AdminMetricCard label="Published pages" value={String(metrics.publishedDrafts)} icon={Globe2} tone="emerald" />
          <AdminMetricCard label="Base templates" value={String(metrics.baseCatalogCount)} icon={CalendarDays} tone="orange" />
        </div>
      </div>

      {actionFeedback ? (
        <p className={`text-sm font-medium ${actionFeedback.tone === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {actionFeedback.message}
        </p>
      ) : null}

      {draftProducts.length > 0 ? (
        <SectionShell
          title="Saved Product Pages"
          description="Save drafts privately, publish product pages to push them to the homepage, or duplicate a page to reuse its setup for another market."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {draftProducts.map((draft) => (
              <DraftProductCard key={draft.id} draft={draft} isDeleting={deletingDraftId === draft.id} onDelete={handleDeleteDraft} />
            ))}
          </div>
        </SectionShell>
      ) : (
        <SectionShell
          title="Saved Product Pages"
          description="You have not saved any custom product pages yet. Start with a new page or duplicate one of the base templates below."
        >
          <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <Plus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-950">No saved product pages yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Start with a fresh product page or duplicate a base catalog template and customize it for your audience, currency, and market.
            </p>
            <Link to="/admin/products/create" className="mt-6 inline-block">
              <Button variant="primary" className="rounded-2xl">
                <Plus className="h-5 w-5" />
                Create Your First Product
              </Button>
            </Link>
          </div>
        </SectionShell>
      )}

      <SectionShell
        title="Default Product Template"
        description="Start every new page from the built-in template so you can launch products without seeded sample catalog data."
      >
        <Card className="rounded-[1.9rem] border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(238,245,255,0.92))] p-8 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Template ready</p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Clean product page starter</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The builder opens with the default page structure already loaded, so the admin can create a real product page without any mock storefront inventory.
              </p>
            </div>
            <Link to="/admin/products/create">
              <Button variant="primary" size="md" className="rounded-2xl">
                <Plus className="h-5 w-5" />
                Open Default Template
              </Button>
            </Link>
          </div>
        </Card>
      </SectionShell>
      <SectionShell
        title="Stock Recording"
        description="Record stock for any published product here. As new orders land in the order page, sold units are deducted automatically from the stock available."
      >
        {inventoryItems.length > 0 ? (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_180px_auto]">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Select published product</label>
                <select value={selectedStockProductId} onChange={(event) => setSelectedStockProductId(event.target.value)} className="mt-2 w-full rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/10">
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantity to add</label>
                <input type="number" min="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} placeholder="50" className="mt-2 w-full rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2B63D9] focus:ring-2 focus:ring-[#2B63D9]/10" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleAddStock} disabled={isRecordingStock} className="inline-flex w-full items-center justify-center gap-2 rounded-[1.4rem] bg-[#2B63D9] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1f4eb0] disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto">
                  <PackagePlus className="h-4 w-4" />
                  {isRecordingStock ? 'Recording...' : 'Add Stock'}
                </button>
              </div>
            </div>

            {selectedStockProduct ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected product</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{selectedStockProduct.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedStockProduct.category}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Available stock</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">{selectedStockProduct.stockAvailable}</p>
                  <p className="mt-1 text-xs text-slate-500">From {selectedStockProduct.stockRecorded} recorded units</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sold units</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-[#2B63D9]">{selectedStockProduct.soldCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Updates automatically from active orders</p>
                </div>
              </div>
            ) : null}

            {stockFeedback ? (
              <p className={`text-sm font-medium ${stockFeedback.tone === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{stockFeedback.message}</p>
            ) : null}

            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {inventoryItems.map((item) => (
                <div key={`stock-row-${item.id}`} className="flex flex-col gap-4 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.category} / {item.subcategory}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
                    <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">In stock</p>
                      <p className="mt-2 text-lg font-bold text-emerald-700">{item.stockAvailable}</p>
                    </div>
                    <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sold</p>
                      <p className="mt-2 text-lg font-bold text-[#2B63D9]">{item.soldCount}</p>
                    </div>
                    <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Profit</p>
                      <p className="mt-2 text-sm font-bold text-slate-950">{formatDraftCurrency(item.profit, item.currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-bold text-slate-950">No published products available for stock yet</h3>
            <p className="mt-2 text-sm text-slate-600">Publish a product page first, then come back here to record incoming stock for it.</p>
          </div>
        )}
      </SectionShell>
    </div>
  );
}
