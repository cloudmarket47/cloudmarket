import { emitBrowserEvent } from './supabase';
import { readAppSetting, writeAppSetting } from './supabaseSettings';

export const ADMIN_INVENTORY_STOCK_CHANGE_EVENT = 'cloudmarket-admin-inventory-stock-change';

const INVENTORY_STOCK_SETTING_KEY = 'admin_inventory_stock_levels';

export interface AdminInventoryStockEntry {
  productId: string;
  productSlug: string;
  quantityOnHand: number;
  updatedAt: string;
}

let inventoryStockCache: AdminInventoryStockEntry[] = [];
let inventoryStockLoaded = false;
let inventoryStockRequest: Promise<AdminInventoryStockEntry[]> | null = null;

function emitInventoryStockChange() {
  emitBrowserEvent(ADMIN_INVENTORY_STOCK_CHANGE_EVENT);
}

function normalizeInventoryStockEntry(
  entry: Partial<AdminInventoryStockEntry> | null | undefined,
): AdminInventoryStockEntry | null {
  if (!entry) {
    return null;
  }

  const productId = typeof entry.productId === 'string' ? entry.productId.trim() : '';
  const productSlug = typeof entry.productSlug === 'string' ? entry.productSlug.trim() : '';

  if (!productId && !productSlug) {
    return null;
  }

  return {
    productId,
    productSlug,
    quantityOnHand:
      typeof entry.quantityOnHand === 'number' && Number.isFinite(entry.quantityOnHand)
        ? Math.max(0, Math.round(entry.quantityOnHand))
        : 0,
    updatedAt:
      typeof entry.updatedAt === 'string' && entry.updatedAt.trim().length > 0
        ? entry.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeInventoryStockEntries(
  value: Partial<AdminInventoryStockEntry>[] | null | undefined,
) {
  if (!Array.isArray(value)) {
    return [] as AdminInventoryStockEntry[];
  }

  const entriesByKey = new Map<string, AdminInventoryStockEntry>();

  value.forEach((entry) => {
    const normalized = normalizeInventoryStockEntry(entry);

    if (!normalized) {
      return;
    }

    const cacheKey = normalized.productId || normalized.productSlug;
    entriesByKey.set(cacheKey, normalized);
  });

  return Array.from(entriesByKey.values()).sort((left, right) =>
    (left.productSlug || left.productId).localeCompare(right.productSlug || right.productId),
  );
}

async function persistInventoryStock(entries: AdminInventoryStockEntry[]) {
  inventoryStockCache = normalizeInventoryStockEntries(entries);
  inventoryStockLoaded = true;
  await writeAppSetting(INVENTORY_STOCK_SETTING_KEY, inventoryStockCache);
  emitInventoryStockChange();
  return inventoryStockCache;
}

export async function ensureAdminInventoryStockLoaded(force = false) {
  if (inventoryStockLoaded && !force) {
    return inventoryStockCache;
  }

  if (inventoryStockRequest && !force) {
    return inventoryStockRequest;
  }

  inventoryStockRequest = (async () => {
    const loadedEntries = await readAppSetting<Partial<AdminInventoryStockEntry>[]>(
      INVENTORY_STOCK_SETTING_KEY,
      [],
    );

    inventoryStockCache = normalizeInventoryStockEntries(loadedEntries);
    inventoryStockLoaded = true;
    inventoryStockRequest = null;
    return inventoryStockCache;
  })();

  return inventoryStockRequest;
}

export function readAdminInventoryStock() {
  return inventoryStockCache;
}

export async function addAdminInventoryStock(input: {
  productId: string;
  productSlug: string;
  quantity: number;
}) {
  const quantity = Math.max(0, Math.round(input.quantity));

  if (quantity <= 0) {
    throw new Error('Add a stock quantity greater than zero.');
  }

  const entries = await ensureAdminInventoryStockLoaded();
  const lookupKey = input.productId.trim() || input.productSlug.trim();
  const now = new Date().toISOString();
  const nextEntries = [...entries];
  const existingIndex = nextEntries.findIndex(
    (entry) => (entry.productId || entry.productSlug) === lookupKey,
  );

  if (existingIndex >= 0) {
    const existingEntry = nextEntries[existingIndex];
    nextEntries[existingIndex] = {
      ...existingEntry,
      productId: input.productId.trim() || existingEntry.productId,
      productSlug: input.productSlug.trim() || existingEntry.productSlug,
      quantityOnHand: existingEntry.quantityOnHand + quantity,
      updatedAt: now,
    };
  } else {
    nextEntries.push({
      productId: input.productId.trim(),
      productSlug: input.productSlug.trim(),
      quantityOnHand: quantity,
      updatedAt: now,
    });
  }

  return persistInventoryStock(nextEntries);
}

export async function removeAdminInventoryStock(productId: string, productSlug: string) {
  const lookupKey = productId.trim() || productSlug.trim();
  const entries = await ensureAdminInventoryStockLoaded();

  return persistInventoryStock(
    entries.filter((entry) => (entry.productId || entry.productSlug) !== lookupKey),
  );
}
