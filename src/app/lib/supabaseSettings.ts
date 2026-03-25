import { getSupabaseClient, getSupabaseTableName } from './supabase';

interface AppSettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

export async function readAppSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from(getSupabaseTableName('appSettings'))
    .select('value')
    .eq('key', key)
    .maybeSingle<AppSettingRow>();

  if (error || !data) {
    return fallback;
  }

  return (data.value as T | null) ?? fallback;
}

export async function writeAppSetting<T>(key: string, value: T) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return value;
  }

  await supabase.from(getSupabaseTableName('appSettings')).upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    } satisfies AppSettingRow,
    {
      onConflict: 'key',
    },
  );

  return value;
}
