import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRIMARY_API_URL =
  'https://api.frankfurter.dev/v1/latest?base=NGN&symbols=USD,GHS,KES,ZAR';
const FALLBACK_API_URL =
  'https://latest.currency-api.pages.dev/v1/currencies/ngn.json';
const OUTPUT_FILE_NAME = 'rates.json';
const SAFETY_BUFFER_MULTIPLIER = 1.05;
const TARGET_CURRENCIES = ['USD', 'GHS', 'KES', 'ZAR'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputFilePath = path.join(projectRoot, 'public', OUTPUT_FILE_NAME);
const generatedModulePath = path.join(
  projectRoot,
  'src',
  'app',
  'lib',
  'generatedRatesSnapshot.ts',
);

function normalizeRate(value) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid rate value received: ${value}`);
  }

  return parsedValue;
}

async function fetchFrankfurterRates() {
  const response = await fetch(PRIMARY_API_URL, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter API request failed with status ${response.status}`);
  }

  const payload = await response.json();

  return {
    source: PRIMARY_API_URL,
    sourceDate: typeof payload.date === 'string' ? payload.date : '',
    rates: {
      NGN: 1,
      USD: normalizeRate(payload.rates?.USD),
      GHS: normalizeRate(payload.rates?.GHS),
      KES: normalizeRate(payload.rates?.KES),
      ZAR: normalizeRate(payload.rates?.ZAR),
    },
  };
}

async function fetchFallbackRates() {
  const response = await fetch(FALLBACK_API_URL, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Fallback currency API request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const baseRates =
    payload && typeof payload === 'object' && payload.ngn && typeof payload.ngn === 'object'
      ? payload.ngn
      : {};

  return {
    source: FALLBACK_API_URL,
    sourceDate: typeof payload.date === 'string' ? payload.date : '',
    rates: {
      NGN: 1,
      USD: normalizeRate(baseRates.usd),
      GHS: normalizeRate(baseRates.ghs),
      KES: normalizeRate(baseRates.kes),
      ZAR: normalizeRate(baseRates.zar),
    },
  };
}

async function fetchLatestRates() {
  try {
    return await fetchFrankfurterRates();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Frankfurter error';
    console.warn(`Frankfurter could not provide the requested NGN rates. Falling back. ${message}`);
    return fetchFallbackRates();
  }
}

async function updateRatesFile() {
  const payload = await fetchLatestRates();
  const fetchedAt = new Date().toISOString();
  const nextSnapshot = {
    base: 'NGN',
    source: payload.source,
    updatedAt: fetchedAt,
    fetchedAt,
    sourceDate: payload.sourceDate,
    safetyBufferMultiplier: SAFETY_BUFFER_MULTIPLIER,
    rates: payload.rates,
  };

  await mkdir(path.dirname(outputFilePath), { recursive: true });
  await writeFile(outputFilePath, `${JSON.stringify(nextSnapshot, null, 2)}\n`, 'utf8');
  await mkdir(path.dirname(generatedModulePath), { recursive: true });
  await writeFile(
    generatedModulePath,
    `import type { RatesSnapshot } from './currencyRates';

export const GENERATED_RATES_SNAPSHOT: RatesSnapshot = ${JSON.stringify(nextSnapshot, null, 2)};
`,
    'utf8',
  );

  console.log(`Currency rates written to ${outputFilePath}`);
  console.log(`Generated fallback snapshot written to ${generatedModulePath}`);
  console.log(`Rate source: ${payload.source}`);
  console.log(`Tracked currencies: ${TARGET_CURRENCIES.join(', ')}`);
  console.log(JSON.stringify(nextSnapshot, null, 2));
}

updateRatesFile().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to update rates file.');
  process.exitCode = 1;
});
