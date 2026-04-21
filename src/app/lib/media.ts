const CLOUDINARY_CLOUD_NAME = 'dkk1lpuuf';
const CLOUDINARY_IMAGE_FETCH_PREFIX = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto/`;
const CLOUDINARY_VIDEO_FETCH_PREFIX = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/fetch/f_auto,q_auto/`;

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);

function getUrlExtension(src: string) {
  const normalizedSrc = src.trim();

  if (!normalizedSrc) {
    return '';
  }

  try {
    const url = new URL(normalizedSrc);
    const match = url.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?.[1] ?? '';
  } catch {
    const sanitized = normalizedSrc.split('#')[0]?.split('?')[0] ?? normalizedSrc;
    const match = sanitized.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?.[1] ?? '';
  }
}

function isRemoteUrl(src: string) {
  return /^https?:\/\//i.test(src.trim());
}

function isSupabaseStorageUrl(src: string) {
  return /\/storage\/v1\/object\/public\//i.test(src);
}

function isCloudinaryFetchUrl(src: string) {
  return (
    src.includes(CLOUDINARY_IMAGE_FETCH_PREFIX) ||
    src.includes(CLOUDINARY_VIDEO_FETCH_PREFIX)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function getOptimizedMedia(src?: string | null) {
  const normalizedSrc = src?.trim() ?? '';

  if (!normalizedSrc || isCloudinaryFetchUrl(normalizedSrc)) {
    return normalizedSrc;
  }

  if (!isRemoteUrl(normalizedSrc) || !isSupabaseStorageUrl(normalizedSrc)) {
    return normalizedSrc;
  }

  const extension = getUrlExtension(normalizedSrc);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return `${CLOUDINARY_IMAGE_FETCH_PREFIX}${encodeURIComponent(normalizedSrc)}`;
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return `${CLOUDINARY_VIDEO_FETCH_PREFIX}${encodeURIComponent(normalizedSrc)}`;
  }

  return normalizedSrc;
}

export function transformFetchedMedia<T>(value: T): T {
  if (typeof value === 'string') {
    return getOptimizedMedia(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformFetchedMedia(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, transformFetchedMedia(entry)]),
    ) as T;
  }

  return value;
}
