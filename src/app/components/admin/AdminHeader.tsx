import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminNotificationDropdown } from './AdminNotificationDropdown';
import {
  ensureAdminPreferencesLoaded,
  readAdminPreferences,
} from '../../lib/adminPreferences';
import {
  getAdminNotificationEventNames,
  markAllNotificationsRead,
  markNotificationRead,
  readAdminNotificationsSnapshot,
  type AdminNotificationItem,
  type AdminNotificationSnapshot,
} from '../../lib/adminNotifications';
import { useBrandingSettings } from '../../lib/branding';
import { getOptimizedMedia } from '../../lib/media';
import { useAppTheme } from '../../context/AppThemeContext';

interface AdminHeaderProps {
  onMenuClick: () => void;
  isSidebarCollapsed: boolean;
  onDesktopToggle: () => void;
}

export function AdminHeader({
  onMenuClick,
  isSidebarCollapsed,
  onDesktopToggle,
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const branding = useBrandingSettings();
  const { isDarkMode } = useAppTheme();
  const [preferences, setPreferences] = useState(() => readAdminPreferences());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationSnapshot, setNotificationSnapshot] =
    useState<AdminNotificationSnapshot | null>(null);
  const notificationShellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncPreferences = async () => {
      await ensureAdminPreferencesLoaded().catch(() => undefined);
      setPreferences(readAdminPreferences());
    };

    void syncPreferences();
    window.addEventListener('cloudmarket-admin-preferences-change', syncPreferences as EventListener);

    return () => {
      window.removeEventListener('cloudmarket-admin-preferences-change', syncPreferences as EventListener);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (!preferences.notificationsEnabled) {
        setNotificationSnapshot({
          notifications: [],
          unreadCount: 0,
          totalCount: 0,
        });
        return;
      }

      setIsLoadingNotifications(true);

      try {
        const snapshot = await readAdminNotificationsSnapshot();

        if (isMounted) {
          setNotificationSnapshot(snapshot);
        }
      } finally {
        if (isMounted) {
          setIsLoadingNotifications(false);
        }
      }
    };

    void loadNotifications();

    const refreshNotifications = () => {
      void loadNotifications();
    };

    const eventNames = getAdminNotificationEventNames();
    eventNames.forEach((eventName) =>
      window.addEventListener(eventName, refreshNotifications),
    );

    return () => {
      isMounted = false;
      eventNames.forEach((eventName) =>
        window.removeEventListener(eventName, refreshNotifications),
      );
    };
  }, [preferences.notificationsEnabled]);

  useEffect(() => {
    if (!isNotificationOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        notificationShellRef.current &&
        !notificationShellRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationOpen]);

  const handleBellClick = async () => {
    const nextOpenState = !isNotificationOpen;
    setIsNotificationOpen(nextOpenState);

    if (!nextOpenState || !preferences.autoMarkNotificationsRead) {
      return;
    }

    const notificationIds = notificationSnapshot?.notifications
      .filter((item) => item.unread)
      .map((item) => item.id);

    if (!notificationIds?.length) {
      return;
    }

    await markAllNotificationsRead(notificationIds);
    const refreshedSnapshot = await readAdminNotificationsSnapshot();
    setNotificationSnapshot(refreshedSnapshot);
  };

  const handleMarkAllRead = async () => {
    const unreadIds =
      notificationSnapshot?.notifications
        .filter((item) => item.unread)
        .map((item) => item.id) ?? [];

    if (!unreadIds.length) {
      return;
    }

    await markAllNotificationsRead(unreadIds);
    const refreshedSnapshot = await readAdminNotificationsSnapshot();
    setNotificationSnapshot(refreshedSnapshot);
  };

  const handleOpenNotification = async (notification: AdminNotificationItem) => {
    await markNotificationRead(notification.id);
    setIsNotificationOpen(false);
    navigate(notification.href);

    const refreshedSnapshot = await readAdminNotificationsSnapshot();
    setNotificationSnapshot(refreshedSnapshot);
  };

  const unreadCount = notificationSnapshot?.unreadCount ?? 0;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-30 h-16 transition-[left] duration-300 ${
        isDarkMode
          ? 'border-b border-white/10 bg-[#0f141b] text-[#e6edf3]'
          : 'border-b border-gray-200 bg-white'
      } ${
        isSidebarCollapsed ? 'lg:left-[5.5rem]' : 'lg:left-64'
      }`}
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className={`rounded-lg p-2 lg:hidden ${isDarkMode ? 'hover:bg-white/8 text-slate-200' : 'hover:bg-gray-100'}`}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <button
            onClick={onDesktopToggle}
            className={`hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition lg:inline-flex ${
              isDarkMode
                ? 'border-white/12 bg-[#161b22] text-slate-200 hover:bg-[#1b2330]'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            <span>{isSidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <div ref={notificationShellRef} className="relative">
            <button
              type="button"
              onClick={() => void handleBellClick()}
              className={`relative rounded-xl border p-2 transition ${
                isDarkMode
                  ? 'border-white/12 bg-[#161b22] hover:bg-[#1b2330]'
                  : 'border-gray-200 bg-white hover:bg-gray-100'
              }`}
              aria-label="Open notifications"
            >
              <Bell className={`h-5 w-5 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} />
              {preferences.notificationsEnabled &&
              preferences.showUnreadBadge &&
              unreadCount > 0 ? (
                <span className="absolute right-1 top-1 min-w-[1rem] rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            <AdminNotificationDropdown
              isOpen={isNotificationOpen}
              isLoading={isLoadingNotifications}
              notificationsEnabled={preferences.notificationsEnabled}
              snapshot={notificationSnapshot}
              onClose={() => setIsNotificationOpen(false)}
              onMarkAllRead={() => void handleMarkAllRead()}
              onOpenNotification={(notification) => void handleOpenNotification(notification)}
            />
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            className={`flex items-center gap-3 rounded-xl border p-2 transition ${
              isDarkMode
                ? 'border-white/12 bg-[#161b22] hover:bg-[#1b2330]'
                : 'border-gray-200 bg-white hover:bg-gray-100'
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#0E7C7B]">
              {branding.logoUrl ? (
                <img
                  src={getOptimizedMedia(branding.logoUrl)}
                  alt={`${branding.companyName} logo`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-white">
                  {branding.companyShortName}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
