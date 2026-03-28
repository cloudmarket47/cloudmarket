import {
  getLocaleConfig,
  normalizeCountryCode,
  SUPPORTED_COUNTRY_CODES,
  type SupportedCountryCode,
} from './localeData';

export type CustomerGenderTarget = 'all' | 'men' | 'women' | 'unisex' | 'kids';
export type CustomerNameGender = 'male' | 'female';

export interface CountryCustomerIdentityPool {
  male: string[];
  female: string[];
}

export type CustomerIdentityPools = Record<SupportedCountryCode, CountryCustomerIdentityPool>;

export const LOCATION_POOLS: Record<SupportedCountryCode | 'DEFAULT', string[]> = {
  NG: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu'],
  GH: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Tema'],
  US: ['New York', 'Houston', 'Los Angeles', 'Atlanta', 'Miami', 'Chicago'],
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
  DEFAULT: ['London', 'Dubai', 'Toronto', 'Berlin'],
};

const DEFAULT_CUSTOMER_IDENTITY_POOLS: CustomerIdentityPools = {
  NG: {
    male: [
      'Chinedu Okafor',
      'Tunde Adeyemi',
      'Emeka Nwosu',
      'Ibrahim Musa',
      'Seyi Ogunleye',
      'Yusuf Danjuma',
      'Kelechi Eze',
      'Olamide Afolabi',
      'Ebuka Obi',
      'Daniel Essien',
    ],
    female: [
      'Adaeze Okonkwo',
      'Kemi Adewale',
      'Amina Bello',
      'Ifeoma Nnaji',
      'Zainab Abdullahi',
      'Chioma Eze',
      'Temilola Ogunsiwaju',
      'Ngozi Nwankwo',
      'Yetunde Bakare',
      'Halima Sule',
    ],
  },
  GH: {
    male: [
      'Kwame Asare',
      'Kofi Mensah',
      'Kojo Owusu',
      'Nana Osei',
      'Yaw Boateng',
      'Emmanuel Kwarteng',
      'Joseph Addo',
      'Ebenezer Appiah',
      'Daniel Agyeman',
      'Samuel Tetteh',
    ],
    female: [
      'Akosua Mensima',
      'Abena Ofori',
      'Efua Asante',
      'Ama Serwaa',
      'Adwoa Nyarko',
      'Gifty Owusu',
      'Nana Ama Boateng',
      'Mansa Quartey',
      'Priscilla Tetteh',
      'Yaa Asiedu',
    ],
  },
  US: {
    male: [
      'Michael Carter',
      'James Robinson',
      'Daniel Brooks',
      'Christopher Hayes',
      'Andrew Foster',
      'Joshua Bennett',
      'Tyler Morgan',
      'Ethan Collins',
      'Brandon Price',
      'Noah Mitchell',
    ],
    female: [
      'Olivia Parker',
      'Ava Johnson',
      'Sophia Martinez',
      'Chloe Thompson',
      'Madison Reed',
      'Emily Cooper',
      'Hannah Brooks',
      'Grace Turner',
      'Natalie Rivera',
      'Lauren Bennett',
    ],
  },
  KE: {
    male: [
      'Brian Otieno',
      'Kevin Mwangi',
      'Samuel Kiptoo',
      'Denis Ochieng',
      'Eric Mutiso',
      'Peter Kamau',
      'Victor Maina',
      'John Kariuki',
      'David Ombati',
      'Joseph Kiprono',
    ],
    female: [
      'Faith Njeri',
      'Mary Wanjiku',
      'Sharon Achieng',
      'Ruth Atieno',
      'Grace Nyambura',
      'Irene Chebet',
      'Diana Jepkorir',
      'Esther Muthoni',
      'Mercy Akinyi',
      'Lilian Moraa',
    ],
  },
  ZA: {
    male: [
      'Thabo Mokoena',
      'Sipho Dlamini',
      'Kabelo Nkosi',
      'Themba Khumalo',
      'Sibusiso Ndlovu',
      'Bongani Zulu',
      'Mpho Mahlangu',
      'Anele Mthembu',
      'Luthando Jacobs',
      'Kagiso Molefe',
    ],
    female: [
      'Lerato Mokoena',
      'Naledi Dlamini',
      'Ayanda Nkosi',
      'Zanele Khumalo',
      'Nandi Ndlovu',
      'Boitumelo Zulu',
      'Thandeka Mthembu',
      'Nosipho Buthelezi',
      'Amahle Mokoena',
      'Karabo Molefe',
    ],
  },
};

function cleanNames(names: string[]) {
  const seen = new Set<string>();

  return names
    .map((name) => name.trim().replace(/\s+/g, ' '))
    .filter((name) => name.length > 0)
    .filter((name) => {
      const key = name.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function interleaveNames(male: string[], female: string[]) {
  const mixed: string[] = [];
  const maxLength = Math.max(male.length, female.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (female[index]) {
      mixed.push(female[index]);
    }

    if (male[index]) {
      mixed.push(male[index]);
    }
  }

  return mixed;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function createDefaultCustomerIdentityPools(): CustomerIdentityPools {
  return JSON.parse(JSON.stringify(DEFAULT_CUSTOMER_IDENTITY_POOLS)) as CustomerIdentityPools;
}

export function normalizeCustomerIdentityPools(
  value?: Partial<Record<SupportedCountryCode, Partial<CountryCustomerIdentityPool>>> | null,
) {
  const defaults = createDefaultCustomerIdentityPools();

  for (const countryCode of SUPPORTED_COUNTRY_CODES) {
    const sourcePool = value?.[countryCode];
    const maleNames = cleanNames(sourcePool?.male ?? defaults[countryCode].male);
    const femaleNames = cleanNames(sourcePool?.female ?? defaults[countryCode].female);

    defaults[countryCode] = {
      male: maleNames.length > 0 ? maleNames : DEFAULT_CUSTOMER_IDENTITY_POOLS[countryCode].male,
      female:
        femaleNames.length > 0 ? femaleNames : DEFAULT_CUSTOMER_IDENTITY_POOLS[countryCode].female,
    };
  }

  return defaults;
}

export function getCountryCustomerIdentityPool(
  customerIdentityPools: CustomerIdentityPools | undefined,
  countryCode?: string | null,
) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedPools = normalizeCustomerIdentityPools(customerIdentityPools);

  return normalizedPools[normalizedCountryCode];
}

export function getCustomerNamePoolForContext({
  customerIdentityPools,
  countryCode,
  genderTarget,
}: {
  customerIdentityPools?: CustomerIdentityPools | null;
  countryCode?: string | null;
  genderTarget?: CustomerGenderTarget | null;
}) {
  const countryPool = getCountryCustomerIdentityPool(customerIdentityPools ?? undefined, countryCode);

  if (genderTarget === 'men') {
    return countryPool.male;
  }

  if (genderTarget === 'women') {
    return countryPool.female;
  }

  return interleaveNames(countryPool.male, countryPool.female);
}

export function getDeterministicCustomerNameForIndex({
  customerIdentityPools,
  countryCode,
  genderTarget,
  index,
  seed = '',
  fallbackName = 'Verified Customer',
}: {
  customerIdentityPools?: CustomerIdentityPools | null;
  countryCode?: string | null;
  genderTarget?: CustomerGenderTarget | null;
  index: number;
  seed?: string;
  fallbackName?: string;
}) {
  const pool = getCustomerNamePoolForContext({
    customerIdentityPools,
    countryCode,
    genderTarget,
  });

  if (pool.length === 0) {
    return fallbackName;
  }

  const offset = hashString(seed) % pool.length;

  return pool[(index + offset) % pool.length] ?? fallbackName;
}

export function getCustomerPoolGenderLabel(gender: CustomerNameGender) {
  return gender === 'female' ? 'Female names' : 'Male names';
}

export function getCountryCustomerPoolLabel(countryCode: SupportedCountryCode) {
  return getLocaleConfig(countryCode).countryName;
}
