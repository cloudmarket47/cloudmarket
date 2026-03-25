import { getSupabaseBucketName, getSupabaseClient } from './supabase';

function getFileExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.trim().toLowerCase() ?? '';
  return extension ? `.${extension.replace(/[^a-z0-9]/g, '')}` : '';
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uploadAssetToSupabaseStorage(
  file: File,
  folder = 'uploads',
): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase storage is not configured.');
  }

  const bucket = getSupabaseBucketName('assets');
  const extension = getFileExtension(file.name);
  const folderName = sanitizeSegment(folder) || 'uploads';
  const filePath = `${folderName}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Unable to upload file.');
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}
