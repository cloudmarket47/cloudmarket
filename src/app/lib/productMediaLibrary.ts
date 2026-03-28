export type ProductLibraryMediaKind = 'image' | 'video';

export const PRODUCT_LIBRARY_LIMITS = {
  image: {
    maxItems: 30,
    maxFileSizeBytes: 5 * 1024 * 1024,
  },
  video: {
    maxItems: 3,
    maxFileSizeBytes: 15 * 1024 * 1024,
  },
} as const;

export const PRODUCT_LIBRARY_BATCH_UPLOAD_LIMITS = {
  image: 20,
  video: 1,
} as const;

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
  }

  return `${Math.round(bytes / 1024)}KB`;
}

export function getProductLibraryCountLimit(kind: ProductLibraryMediaKind) {
  return PRODUCT_LIBRARY_LIMITS[kind].maxItems;
}

export function getProductLibraryFileSizeLimit(kind: ProductLibraryMediaKind) {
  return PRODUCT_LIBRARY_LIMITS[kind].maxFileSizeBytes;
}

export function getProductLibraryBatchUploadLimit(kind: ProductLibraryMediaKind) {
  return PRODUCT_LIBRARY_BATCH_UPLOAD_LIMITS[kind];
}

export function getProductLibraryLimitLabel(kind: ProductLibraryMediaKind) {
  return `${getProductLibraryCountLimit(kind)} ${kind}s max, ${formatBytes(getProductLibraryFileSizeLimit(kind))} each`;
}

export function validateProductLibraryUpload({
  file,
  kind,
  existingCount,
}: {
  file: File;
  kind: ProductLibraryMediaKind;
  existingCount: number;
}) {
  const limit = PRODUCT_LIBRARY_LIMITS[kind];

  if (existingCount >= limit.maxItems) {
    return `This product library already has the maximum ${limit.maxItems} ${kind}s.`;
  }

  if (file.size > limit.maxFileSizeBytes) {
    return `${kind === 'image' ? 'Images' : 'Videos'} must be ${formatBytes(limit.maxFileSizeBytes)} or smaller.`;
  }

  return null;
}

export function inferProductLibraryKindFromUrl(value: string): ProductLibraryMediaKind {
  const normalizedValue = value.trim().toLowerCase();

  return /\.(mp4|webm|mov|m4v|ogg)(?:\?|#|$)/.test(normalizedValue) ? 'video' : 'image';
}
