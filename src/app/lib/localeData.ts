export type SupportedCountryCode = 'NG' | 'US' | 'GH' | 'KE' | 'ZA';

export interface LocaleConfig {
  countryCode: SupportedCountryCode;
  countryName: string;
  currencyCode: 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR';
  currencySymbol: string;
  phonePrefix: string;
  phoneExample: string;
  regionLabel: 'State' | 'Region' | 'County' | 'Province';
  localeTag: string;
  regions: string[];
}

export const DEFAULT_COUNTRY_CODE: SupportedCountryCode = 'NG';

export const SUPPORTED_COUNTRY_CODES: SupportedCountryCode[] = ['NG', 'US', 'GH', 'KE', 'ZA'];

const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

const USA_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
] as const;

const GHANA_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
] as const;

const KENYA_COUNTIES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  'Murang’a',
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
] as const;

const SOUTH_AFRICA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

export const LOCALE_DATA: Record<SupportedCountryCode, LocaleConfig> = {
  NG: {
    countryCode: 'NG',
    countryName: 'Nigeria',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    phonePrefix: '+234',
    phoneExample: '+234 8012345678',
    regionLabel: 'State',
    localeTag: 'en-NG',
    regions: [...NIGERIA_STATES],
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currencyCode: 'USD',
    currencySymbol: '$',
    phonePrefix: '+1',
    phoneExample: '+1 2025550143',
    regionLabel: 'State',
    localeTag: 'en-US',
    regions: [...USA_STATES],
  },
  GH: {
    countryCode: 'GH',
    countryName: 'Ghana',
    currencyCode: 'GHS',
    currencySymbol: 'GH₵',
    phonePrefix: '+233',
    phoneExample: '+233 241234567',
    regionLabel: 'Region',
    localeTag: 'en-GH',
    regions: [...GHANA_REGIONS],
  },
  KE: {
    countryCode: 'KE',
    countryName: 'Kenya',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    phonePrefix: '+254',
    phoneExample: '+254 712345678',
    regionLabel: 'County',
    localeTag: 'en-KE',
    regions: [...KENYA_COUNTIES],
  },
  ZA: {
    countryCode: 'ZA',
    countryName: 'South Africa',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    phonePrefix: '+27',
    phoneExample: '+27 821234567',
    regionLabel: 'Province',
    localeTag: 'en-ZA',
    regions: [...SOUTH_AFRICA_PROVINCES],
  },
};

export function normalizeCountryCode(countryCode?: string | null): SupportedCountryCode {
  if (!countryCode) {
    return DEFAULT_COUNTRY_CODE;
  }

  const normalizedCode = countryCode.trim().toUpperCase();

  return SUPPORTED_COUNTRY_CODES.includes(normalizedCode as SupportedCountryCode)
    ? (normalizedCode as SupportedCountryCode)
    : DEFAULT_COUNTRY_CODE;
}

export function getLocaleConfig(countryCode?: string | null) {
  return LOCALE_DATA[normalizeCountryCode(countryCode)];
}

function detectCountryCodeFromLocale(localeTag?: string | null) {
  if (!localeTag) {
    return null;
  }

  const normalizedLocaleTag = localeTag.trim();

  if (!normalizedLocaleTag) {
    return null;
  }

  const region = normalizedLocaleTag.split('-').at(-1)?.toUpperCase();

  return region && SUPPORTED_COUNTRY_CODES.includes(region as SupportedCountryCode)
    ? (region as SupportedCountryCode)
    : null;
}

function detectCountryCodeFromTimeZone(timeZone?: string | null) {
  if (!timeZone) {
    return null;
  }

  const normalizedTimeZone = timeZone.trim().toLowerCase();

  if (!normalizedTimeZone) {
    return null;
  }

  if (normalizedTimeZone.includes('lagos')) {
    return 'NG';
  }

  if (normalizedTimeZone.includes('accra')) {
    return 'GH';
  }

  if (normalizedTimeZone.includes('nairobi')) {
    return 'KE';
  }

  if (normalizedTimeZone.includes('johannesburg')) {
    return 'ZA';
  }

  if (normalizedTimeZone.startsWith('america/')) {
    return 'US';
  }

  return null;
}

export function detectCountryCode() {
  if (typeof window === 'undefined') {
    return DEFAULT_COUNTRY_CODE;
  }

  const navigatorLocales = [
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : []),
    window.navigator.language,
  ];

  for (const localeTag of navigatorLocales) {
    const detectedCountryCode = detectCountryCodeFromLocale(localeTag);

    if (detectedCountryCode) {
      return detectedCountryCode;
    }
  }

  const detectedFromTimeZone = detectCountryCodeFromTimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  return detectedFromTimeZone ?? DEFAULT_COUNTRY_CODE;
}

export function readCountryCookie() {
  if (typeof document === 'undefined') {
    return DEFAULT_COUNTRY_CODE;
  }

  const match = document.cookie.match(/(?:^|;\s*)nf_country=([^;]+)/);

  return match?.[1] ? normalizeCountryCode(match[1]) : detectCountryCode();
}

export function writeCountryCookie(countryCode: SupportedCountryCode) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `nf_country=${countryCode}; path=/; max-age=31536000; samesite=lax`;
}
