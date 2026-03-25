function isBrowser() {
  return typeof window !== 'undefined';
}

export async function submitNetlifyForm(
  formName: string,
  fields: Record<string, string | number | boolean | null | undefined>,
) {
  if (!isBrowser()) {
    return;
  }

  const payload = new URLSearchParams({
    'form-name': formName,
  });

  Object.entries(fields).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined') {
      return;
    }

    payload.append(key, String(value));
  });

  await fetch('/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
    keepalive: true,
  });
}
