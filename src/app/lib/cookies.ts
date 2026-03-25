interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

function isBrowser() {
  return typeof document !== 'undefined';
}

export function readCookie(name: string) {
  if (!isBrowser()) {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookieParts = document.cookie.split(';');

  for (const part of cookieParts) {
    const trimmed = part.trim();

    if (!trimmed.startsWith(encodedName)) {
      continue;
    }

    return decodeURIComponent(trimmed.slice(encodedName.length));
  }

  return null;
}

export function writeCookie(name: string, value: string, options: CookieOptions = {}) {
  if (!isBrowser()) {
    return;
  }

  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);

  if (typeof options.maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }

  const shouldUseSecure =
    typeof options.secure === 'boolean'
      ? options.secure
      : window.location.protocol === 'https:';

  if (shouldUseSecure) {
    parts.push('Secure');
  }

  document.cookie = parts.join('; ');
}

export function removeCookie(name: string) {
  writeCookie(name, '', { maxAgeSeconds: 0 });
}

export function readJsonCookie<T>(name: string): T | null {
  const raw = readCookie(name);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonCookie(name: string, value: unknown, options?: CookieOptions) {
  writeCookie(name, JSON.stringify(value), options);
}
