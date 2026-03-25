import { emitBrowserEvent } from './supabase';
import { readAppSetting, writeAppSetting } from './supabaseSettings';

export interface AdminPreferences {
  notificationsEnabled: boolean;
  showUnreadBadge: boolean;
  autoMarkNotificationsRead: boolean;
}

export const ADMIN_PREFERENCES_CHANGE_EVENT = 'cloudmarket-admin-preferences-change';
const ADMIN_PREFERENCES_SETTING_KEY = 'admin_preferences';

let adminPreferencesCache = defaultAdminPreferences();
let adminPreferencesLoaded = false;
let adminPreferencesRequest: Promise<AdminPreferences> | null = null;

function emitAdminPreferencesChange() {
  emitBrowserEvent(ADMIN_PREFERENCES_CHANGE_EVENT);
}

function defaultAdminPreferences(): AdminPreferences {
  return {
    notificationsEnabled: true,
    showUnreadBadge: true,
    autoMarkNotificationsRead: false,
  };
}

function normalizePreferences(value?: Partial<AdminPreferences> | null) {
  const defaults = defaultAdminPreferences();

  return {
    notificationsEnabled:
      typeof value?.notificationsEnabled === 'boolean'
        ? value.notificationsEnabled
        : defaults.notificationsEnabled,
    showUnreadBadge:
      typeof value?.showUnreadBadge === 'boolean'
        ? value.showUnreadBadge
        : defaults.showUnreadBadge,
    autoMarkNotificationsRead:
      typeof value?.autoMarkNotificationsRead === 'boolean'
        ? value.autoMarkNotificationsRead
        : defaults.autoMarkNotificationsRead,
  } satisfies AdminPreferences;
}

export function readAdminPreferences() {
  if (!adminPreferencesLoaded) {
    void ensureAdminPreferencesLoaded();
  }

  return adminPreferencesCache;
}

export async function ensureAdminPreferencesLoaded(force = false) {
  if (adminPreferencesLoaded && !force) {
    return adminPreferencesCache;
  }

  if (adminPreferencesRequest && !force) {
    return adminPreferencesRequest;
  }

  adminPreferencesRequest = (async () => {
    adminPreferencesCache = normalizePreferences(
      await readAppSetting<Partial<AdminPreferences>>(ADMIN_PREFERENCES_SETTING_KEY, defaultAdminPreferences()),
    );
    adminPreferencesLoaded = true;
    emitAdminPreferencesChange();
    return adminPreferencesCache;
  })();

  try {
    return await adminPreferencesRequest;
  } finally {
    adminPreferencesRequest = null;
  }
}

export async function updateAdminPreferences(update: Partial<AdminPreferences>) {
  const nextPreferences = normalizePreferences({
    ...(await ensureAdminPreferencesLoaded()),
    ...update,
  });

  adminPreferencesCache = nextPreferences;
  adminPreferencesLoaded = true;
  await writeAppSetting(ADMIN_PREFERENCES_SETTING_KEY, nextPreferences);
  emitAdminPreferencesChange();
  return nextPreferences;
}
