export type ProductCategoryIconName =
  | 'Smartphone'
  | 'Laptop'
  | 'Home'
  | 'ShoppingBag'
  | 'Sparkles'
  | 'Car'
  | 'Activity'
  | 'Hammer'
  | 'ShoppingBasket'
  | 'Baby'
  | 'Gamepad2'
  | 'BookOpen'
  | 'PawPrint'
  | 'Trees';

export interface ProductSubcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  icon: ProductCategoryIconName;
  subcategories: ProductSubcategory[];
}

interface RawCategory {
  id: string;
  name: string;
  slug: string;
  icon: ProductCategoryIconName;
  subcategories: string[];
}

interface CategorySelectionInput {
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  subcategorySlug?: string | null;
  subcategoryName?: string | null;
}

interface ProductCategoryRecord {
  category?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  subcategory?: string | null;
  subcategorySlug?: string | null;
}

export interface ProductCategorySelection {
  category: ProductCategory;
  subcategory: ProductSubcategory;
  displayName: string;
  tagLabel: string;
  heroLabel: string;
  filterSlug: string;
}

export interface ResolvedCategoryFilter {
  kind: 'all' | 'category' | 'subcategory';
  filterSlug: string;
  label: string;
  category: ProductCategory | null;
  subcategory: ProductSubcategory | null;
}

const rawCategories: RawCategory[] = [
  {
    id: 'cat_01',
    name: 'Electronics & Gadgets',
    slug: 'electronics-gadgets',
    icon: 'Smartphone',
    subcategories: [
      'Phones & Tablets',
      'Audio & Headphones',
      'Power & Charging',
      'Smart Home & Security',
    ],
  },
  {
    id: 'cat_02',
    name: 'Computing & Office',
    slug: 'computing-office',
    icon: 'Laptop',
    subcategories: [
      'Laptops & MacBooks',
      'Computer Accessories',
      'Networking & WiFi',
      'Printers & Scanners',
    ],
  },
  {
    id: 'cat_03',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    icon: 'Home',
    subcategories: [
      'Small Appliances',
      'Smart Kitchen Gadgets',
      'Bedding & Decor',
      'Solar & Lighting',
    ],
  },
  {
    id: 'cat_04',
    name: 'Fashion & Apparel',
    slug: 'fashion-apparel',
    icon: 'ShoppingBag',
    subcategories: [
      "Men's Wear",
      "Women's Wear",
      'Watches & Jewelry',
      'Sneakers & Footwear',
    ],
  },
  {
    id: 'cat_05',
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    icon: 'Sparkles',
    subcategories: [
      'Hair Styling Tools',
      'Skin Care & Fragrance',
      'Grooming Kits',
      'Wigs & Extensions',
    ],
  },
  {
    id: 'cat_06',
    name: 'Automotive Accessories',
    slug: 'auto-accessories',
    icon: 'Car',
    subcategories: [
      'Car Gadgets',
      'Interior Organizers',
      'Maintenance Tools',
      'Motorcycle Gear',
    ],
  },
  {
    id: 'cat_07',
    name: 'Health & Fitness',
    slug: 'health-fitness',
    icon: 'Activity',
    subcategories: ['Fitness Gear', 'Wellness Gadgets', 'Supplements', 'Massagers'],
  },
  {
    id: 'cat_08',
    name: 'Tools & Home Improvement',
    slug: 'tools-home-improvement',
    icon: 'Hammer',
    subcategories: [
      'Power Tools',
      'Hand Tools',
      'Electrical & Plumbing',
      'Paint & Wall Repair',
    ],
  },
  {
    id: 'cat_09',
    name: 'Groceries & Beverages',
    slug: 'groceries-beverages',
    icon: 'ShoppingBasket',
    subcategories: [
      'Pantry Staples',
      'Snacks & Confectionery',
      'Beverages',
      'Breakfast & Cereals',
    ],
  },
  {
    id: 'cat_10',
    name: 'Baby & Kids',
    slug: 'baby-kids',
    icon: 'Baby',
    subcategories: [
      'Diapering & Feeding',
      'Baby Gear',
      'Kids Fashion',
      'Learning & School',
    ],
  },
  {
    id: 'cat_11',
    name: 'Toys & Games',
    slug: 'toys-games',
    icon: 'Gamepad2',
    subcategories: [
      'Educational Toys',
      'Board Games',
      'Outdoor Play',
      'Action Figures & Dolls',
    ],
  },
  {
    id: 'cat_12',
    name: 'Books & Stationery',
    slug: 'books-stationery',
    icon: 'BookOpen',
    subcategories: [
      'Books & E-books',
      'Office Stationery',
      'Art Supplies',
      'School Essentials',
    ],
  },
  {
    id: 'cat_13',
    name: 'Pet Supplies',
    slug: 'pet-supplies',
    icon: 'PawPrint',
    subcategories: [
      'Pet Food',
      'Pet Grooming',
      'Pet Accessories',
      'Pet Health',
    ],
  },
  {
    id: 'cat_14',
    name: 'Garden & Outdoor Living',
    slug: 'garden-outdoor-living',
    icon: 'Trees',
    subcategories: [
      'Garden Tools',
      'Outdoor Furniture',
      'BBQ & Picnic',
      'Camping & Hiking',
    ],
  },
  {
    id: 'cat_15',
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    icon: 'Activity',
    subcategories: [
      'Team Sports',
      'Outdoor Adventure',
      'Cycling',
      'Workout Accessories',
    ],
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(value?: string | null) {
  return slugify(value ?? '').replace(/-/g, ' ').trim();
}

export const PRODUCT_CATEGORIES: ProductCategory[] = rawCategories.map((category) => ({
  ...category,
  subcategories: category.subcategories.map((subcategoryName, index) => ({
    id: `${category.id}_sub_${index + 1}`,
    name: subcategoryName,
    slug: slugify(subcategoryName),
    categoryId: category.id,
    categorySlug: category.slug,
  })),
}));

const categoryById = new Map(PRODUCT_CATEGORIES.map((category) => [category.id, category]));
const categoryBySlug = new Map(PRODUCT_CATEGORIES.map((category) => [category.slug, category]));
const categoryByName = new Map(
  PRODUCT_CATEGORIES.map((category) => [normalizeText(category.name), category]),
);
const subcategoryBySlug = new Map(
  PRODUCT_CATEGORIES.flatMap((category) =>
    category.subcategories.map((subcategory) => [subcategory.slug, subcategory] as const),
  ),
);
const subcategoryByName = new Map(
  PRODUCT_CATEGORIES.flatMap((category) =>
    category.subcategories.map(
      (subcategory) => [normalizeText(subcategory.name), subcategory] as const,
    ),
  ),
);
const FALLBACK_CATEGORY = categoryBySlug.get('home-kitchen') ?? PRODUCT_CATEGORIES[0];
const FALLBACK_SUBCATEGORY = FALLBACK_CATEGORY.subcategories[0];

const CATEGORY_KEYWORD_MAP: Array<{ categorySlug: string; keywords: string[] }> = [
  {
    categorySlug: 'electronics-gadgets',
    keywords: ['electronics', 'gadget', 'phone', 'tablet', 'audio', 'headphone', 'charging', 'security'],
  },
  {
    categorySlug: 'computing-office',
    keywords: ['computer', 'laptop', 'macbook', 'wifi', 'network', 'printer', 'scanner', 'office'],
  },
  {
    categorySlug: 'home-kitchen',
    keywords: ['home', 'kitchen', 'clean', 'decor', 'lighting', 'solar', 'appliance', 'bedding'],
  },
  {
    categorySlug: 'fashion-apparel',
    keywords: ['fashion', 'apparel', 'wear', 'jewelry', 'watch', 'sneaker', 'footwear'],
  },
  {
    categorySlug: 'beauty-personal-care',
    keywords: ['beauty', 'skin', 'fragrance', 'grooming', 'hair', 'wig'],
  },
  {
    categorySlug: 'auto-accessories',
    keywords: ['auto', 'car', 'motorcycle', 'organizer', 'maintenance'],
  },
  {
    categorySlug: 'health-fitness',
    keywords: ['health', 'fitness', 'wellness', 'supplement', 'massager'],
  },
  {
    categorySlug: 'tools-home-improvement',
    keywords: ['tool', 'drill', 'repair', 'electrical', 'plumbing', 'paint', 'hardware', 'improvement'],
  },
  {
    categorySlug: 'groceries-beverages',
    keywords: ['grocery', 'food', 'snack', 'drink', 'beverage', 'cereal', 'pantry'],
  },
  {
    categorySlug: 'baby-kids',
    keywords: ['baby', 'kid', 'kids', 'diaper', 'feeding', 'school', 'learning'],
  },
  {
    categorySlug: 'toys-games',
    keywords: ['toy', 'toys', 'game', 'board', 'doll', 'figure', 'play'],
  },
  {
    categorySlug: 'books-stationery',
    keywords: ['book', 'books', 'stationery', 'school', 'office', 'pen', 'paper', 'art'],
  },
  {
    categorySlug: 'pet-supplies',
    keywords: ['pet', 'dog', 'cat', 'food', 'grooming', 'leash', 'animal'],
  },
  {
    categorySlug: 'garden-outdoor-living',
    keywords: ['garden', 'outdoor', 'camping', 'hiking', 'picnic', 'bbq', 'furniture'],
  },
  {
    categorySlug: 'sports-outdoors',
    keywords: ['sport', 'sports', 'cycling', 'workout', 'gym', 'outdoor', 'adventure'],
  },
];

function getCategoryBySubcategory(subcategory: ProductSubcategory) {
  return categoryById.get(subcategory.categoryId) ?? PRODUCT_CATEGORIES[0];
}

function findCategoryFromKeywords(value?: string | null) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  const matchedCategory = CATEGORY_KEYWORD_MAP.find(({ keywords }) =>
    keywords.some((keyword) => normalizedValue.includes(keyword)),
  );

  return matchedCategory ? categoryBySlug.get(matchedCategory.categorySlug) ?? null : null;
}

function findCategory(categoryInput?: string | null) {
  if (!categoryInput) {
    return null;
  }

  return (
    categoryById.get(categoryInput) ??
    categoryBySlug.get(categoryInput) ??
    categoryByName.get(normalizeText(categoryInput)) ??
    findCategoryFromKeywords(categoryInput)
  );
}

function findSubcategory(subcategoryInput?: string | null) {
  if (!subcategoryInput) {
    return null;
  }

  return (
    subcategoryBySlug.get(subcategoryInput) ??
    subcategoryByName.get(normalizeText(subcategoryInput))
  );
}

export function getProductCategoryById(categoryId?: string | null) {
  return findCategory(categoryId) ?? null;
}

export function getProductSubcategories(categoryId?: string | null) {
  return (findCategory(categoryId) ?? FALLBACK_CATEGORY).subcategories;
}

export function resolveProductCategorySelection(
  input: CategorySelectionInput = {},
): ProductCategorySelection {
  const directSubcategory =
    findSubcategory(input.subcategorySlug) ?? findSubcategory(input.subcategoryName);
  const directCategory =
    findCategory(input.categoryId) ??
    findCategory(input.categorySlug) ??
    findCategory(input.categoryName) ??
    (directSubcategory ? getCategoryBySubcategory(directSubcategory) : null) ??
    FALLBACK_CATEGORY;

  const subcategory =
    directSubcategory && directSubcategory.categoryId === directCategory.id
      ? directSubcategory
      : directCategory.subcategories[0] ?? FALLBACK_SUBCATEGORY;

  return {
    category: directCategory,
    subcategory,
    displayName: `${directCategory.name} / ${subcategory.name}`,
    tagLabel: subcategory.name,
    heroLabel: `${directCategory.name} | ${subcategory.name}`,
    filterSlug: subcategory.slug,
  };
}

export const DEFAULT_PRODUCT_CATEGORY_SELECTION = resolveProductCategorySelection({
  categorySlug: 'home-kitchen',
  subcategorySlug: 'small-appliances',
});

export function getProductCategoryDisplay(record: ProductCategoryRecord) {
  return resolveProductCategorySelection({
    categoryId: record.categoryId,
    categorySlug: record.categorySlug,
    categoryName: record.category,
    subcategorySlug: record.subcategorySlug,
    subcategoryName: record.subcategory,
  }).displayName;
}

export function getProductCategoryTagLabel(record: ProductCategoryRecord) {
  return resolveProductCategorySelection({
    categoryId: record.categoryId,
    categorySlug: record.categorySlug,
    categoryName: record.category,
    subcategorySlug: record.subcategorySlug,
    subcategoryName: record.subcategory,
  }).tagLabel;
}

export function getProductCategoryHeroLabel(record: ProductCategoryRecord) {
  return resolveProductCategorySelection({
    categoryId: record.categoryId,
    categorySlug: record.categorySlug,
    categoryName: record.category,
    subcategorySlug: record.subcategorySlug,
    subcategoryName: record.subcategory,
  }).heroLabel;
}

export function resolveCategoryFilter(categoryId?: string | null): ResolvedCategoryFilter {
  if (!categoryId || categoryId === 'all') {
    return {
      kind: 'all',
      filterSlug: 'all',
      label: 'All categories',
      category: null,
      subcategory: null,
    };
  }

  const category = findCategory(categoryId);

  if (category) {
    return {
      kind: 'category',
      filterSlug: category.slug,
      label: category.name,
      category,
      subcategory: null,
    };
  }

  const subcategory = findSubcategory(categoryId);

  if (subcategory) {
    const parentCategory = getCategoryBySubcategory(subcategory);

    return {
      kind: 'subcategory',
      filterSlug: subcategory.slug,
      label: subcategory.name,
      category: parentCategory,
      subcategory,
    };
  }

  return {
    kind: 'all',
    filterSlug: 'all',
    label: 'All categories',
    category: null,
    subcategory: null,
  };
}

export function filterProductsByCategory<T extends ProductCategoryRecord>(
  products: T[],
  categoryId = 'all',
) {
  const filter = resolveCategoryFilter(categoryId);

  if (filter.kind === 'all') {
    return products;
  }

  return products.filter((product) => {
    const selection = resolveProductCategorySelection({
      categoryId: product.categoryId,
      categorySlug: product.categorySlug,
      categoryName: product.category,
      subcategorySlug: product.subcategorySlug,
      subcategoryName: product.subcategory,
    });

    if (filter.kind === 'category') {
      return selection.category.id === filter.category?.id;
    }

    return selection.subcategory.slug === filter.subcategory?.slug;
  });
}

export function getCategoryRoutePath(filterSlug?: string | null) {
  return filterSlug && filterSlug !== 'all' ? `/category/${filterSlug}` : '/';
}
