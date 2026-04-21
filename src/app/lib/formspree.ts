import { useEffect, useState } from 'react';
import {
  ensureFinanceSettingsLoaded,
  FINANCE_DATA_CHANGE_EVENT,
  readFinanceSettings,
} from './adminFinance';

function normalizeFormspreeEndpoint(url?: string | null) {
  return url?.trim() ?? '';
}

function isValidFormspreeEndpoint(url: string) {
  return /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(url);
}

export async function getFormspreeEndpoint() {
  const settings = await ensureFinanceSettingsLoaded();
  return normalizeFormspreeEndpoint(settings.formspreeEndpointUrl);
}

export async function requireFormspreeEndpoint() {
  const endpoint = await getFormspreeEndpoint();

  if (!endpoint) {
    console.warn('Formspree endpoint URL is not configured.');
    throw new Error('Form currently unavailable.');
  }

  if (!isValidFormspreeEndpoint(endpoint)) {
    console.warn('Formspree endpoint URL is invalid.');
    throw new Error('Form currently unavailable.');
  }

  return endpoint;
}

function appendFormspreeField(
  formData: FormData,
  key: string,
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined) {
    return;
  }

  const normalizedValue = typeof value === 'string' ? value.trim() : String(value);

  if (!normalizedValue) {
    return;
  }

  formData.append(key, normalizedValue);
}

export async function submitFormspreeForm(
  fields: Record<string, string | number | boolean | null | undefined>,
  options?: { subject?: string },
) {
  const endpoint = await requireFormspreeEndpoint();
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    appendFormspreeField(formData, key, value);
  });

  appendFormspreeField(formData, '_subject', options?.subject);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
    keepalive: true,
  });

  let responsePayload: { error?: string } | null = null;

  try {
    responsePayload = (await response.json()) as { error?: string };
  } catch {
    responsePayload = null;
  }

  if (!response.ok) {
    throw new Error(
      responsePayload?.error?.trim() || 'We could not submit this form right now.',
    );
  }

  return responsePayload;
}

export function useFormspreeEndpoint() {
  const [endpoint, setEndpoint] = useState(() =>
    normalizeFormspreeEndpoint(readFinanceSettings().formspreeEndpointUrl),
  );

  useEffect(() => {
    const syncEndpoint = async () => {
      await ensureFinanceSettingsLoaded().catch(() => undefined);
      setEndpoint(normalizeFormspreeEndpoint(readFinanceSettings().formspreeEndpointUrl));
    };

    void syncEndpoint();
    window.addEventListener(FINANCE_DATA_CHANGE_EVENT, syncEndpoint as EventListener);

    return () => {
      window.removeEventListener(FINANCE_DATA_CHANGE_EVENT, syncEndpoint as EventListener);
    };
  }, []);

  return endpoint;
}
