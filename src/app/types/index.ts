// Product data structure
export interface Product {
  id: string;
  name: string;
  category: string;
  slug: string;
  price: number;
  purchaseCost?: number;
  currencyCode?: 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR';
  shortDescription: string;
  image: string;
  status: 'published' | 'draft';
  views: number;
  orders: number;
  theme: 'classic' | 'modern' | 'bold' | 'premium';
  displayMode?: 'light' | 'dark';
  createdAt: string;
  
  // Product page sections
  sections: {
    hero: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      ctaText: string;
      image: string;
      benefits: string[];
      offers: { text: string; highlight: string }[];
    };
    seeInAction: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      ratio: '16:9' | '4:5' | '1:1' | '3:4';
      poster: string;
      video: string;
    };
    headline: {
      visible: boolean;
      eyebrow: string;
      title: string;
      description: string;
    };
    alerts: {
      visible: boolean;
      items: {
        kind: 'offer' | 'stock' | 'order';
        title: string;
        message: string;
        badge: string;
      }[];
    };
    featureMarquee: {
      visible: boolean;
      title: string;
      subtitle: string;
      images: string[];
    };
    problem: {
      visible: boolean;
      title: string;
      subtitle: string;
      problems: { icon: string; title: string; description: string }[];
    };
    solution: {
      visible: boolean;
      badge: string;
      title: string;
      description: string;
      image: string;
      features: string[];
      ctaText: string;
    };
    features: {
      visible: boolean;
      title: string;
      subtitle: string;
      items: { icon: string; title: string; description: string }[];
    };
    howItWorks: {
      visible: boolean;
      title: string;
      subtitle: string;
      steps: { number: number; icon: string; title: string; description: string }[];
    };
    showcase: {
      visible: boolean;
      title: string;
      subtitle: string;
      images: string[];
    };
    testimonials: {
      visible: boolean;
      title: string;
      subtitle: string;
      reviews: { name: string; location: string; rating: number; text: string; image: string; avatar?: string }[];
    };
    footerVideo: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      ratio: '16:9' | '4:5' | '1:1' | '3:4';
      poster: string;
      video: string;
    };
    subscription: {
      visible: boolean;
      title: string;
      subtitle: string;
      buttonLabel: string;
      privacyNote: string;
    };
    offer: {
      visible: boolean;
      title: string;
      subtitle: string;
      badge: string;
      countdownHours: number;
      packages: {
        title: string;
        price: number;
        oldPrice?: number;
        description: string;
        features: string[];
        isBestValue: boolean;
        image?: string;
      }[];
    };
    orderForm: {
      visible: boolean;
      title: string;
      subtitle: string;
      submitButtonLabel: string;
      tokenPrompt: string;
      enableTokenField: boolean;
      quickCheckoutLabel: string;
      orderDetailsLabel: string;
      packagePreviewLabel: string;
      childSheetLabel: string;
      childSheetTitle: string;
      childSheetDescription: string;
      changeSelectionLabel: string;
      summaryLabel: string;
      totalLabel: string;
      confirmationNote: string;
    };
    faq: {
      visible: boolean;
      title: string;
      subtitle: string;
      items: { question: string; answer: string }[];
    };
  };
}

// Order data structure
export interface Order {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  quantity: number;
  totalAmount: number;
  customerEmail?: string;
  deliveryMessage?: string;
  customerToken?: string;
  discountAmount?: number;
  discountPercentage?: number;
  finalAmount?: number;
  packageTitle?: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface CustomerTokenRecord {
  email: string;
  fullName: string;
  gender: string;
  location: string;
  token: string;
  discountPercentage: number;
  remainingUses: number;
  createdAt: string;
  orderNumbers: string[];
  sourceProductSlug?: string;
  sourceProductName?: string;
  sourcePageUrl?: string;
  source: 'supabase' | 'local';
}

export interface PlacedOrder {
  orderNumber: string;
  createdAt: string;
  localeCountryCode: 'NG' | 'US' | 'GH' | 'KE' | 'ZA';
  productId: string;
  productSlug: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  quantity: number;
  packageTitle: string;
  packageDescription: string;
  packageLabel: string;
  setsIncluded: string;
  shortDeliveryMessage: string;
  customerToken: string;
  baseAmount: number;
  discountPercentage: number;
  discountAmount: number;
  finalAmount: number;
}

// Subscriber data structure
export interface Subscriber {
  id: string;
  email: string;
  source: string; // which product page they subscribed from
  subscribedAt: string;
}

// Analytics data structure
export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  conversionRate: number;
  netProfit: number;
  revenueData: { date: string; revenue: number }[];
  visitorData: { date: string; visitors: number }[];
}

// Expense data structure
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}
