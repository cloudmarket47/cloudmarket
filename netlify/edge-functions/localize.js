const SUPPORTED_COUNTRIES = new Set(['NG', 'US', 'GH', 'KE', 'ZA']);
const DEFAULT_COUNTRY = 'NG';

export default async (request, context) => {
  const geoCountry = context.geo?.country?.code?.toUpperCase?.() ?? '';
  const countryCode = SUPPORTED_COUNTRIES.has(geoCountry) ? geoCountry : DEFAULT_COUNTRY;
  const response = await context.next();

  response.headers.append(
    'Set-Cookie',
    `nf_country=${countryCode}; Path=/; Max-Age=31536000; SameSite=Lax`,
  );

  return response;
};

export const config = {
  path: '/*',
};
