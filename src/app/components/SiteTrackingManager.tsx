import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FINANCE_DATA_CHANGE_EVENT } from '../lib/adminFinance';
import {
  applySiteTracking,
  ensureSiteTrackingSettingsLoaded,
  readSiteTrackingSettings,
  trackMetaPageView,
  type SiteTrackingSettings,
} from '../lib/siteTracking';

export function SiteTrackingManager() {
  const location = useLocation();
  const [trackingSettings, setTrackingSettings] = useState<SiteTrackingSettings>(() =>
    readSiteTrackingSettings(),
  );
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const syncSettings = async () => {
      await ensureSiteTrackingSettingsLoaded().catch(() => undefined);
      setTrackingSettings(readSiteTrackingSettings());
    };

    void syncSettings();
    window.addEventListener(FINANCE_DATA_CHANGE_EVENT, syncSettings as EventListener);

    return () => {
      window.removeEventListener(FINANCE_DATA_CHANGE_EVENT, syncSettings as EventListener);
    };
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    return applySiteTracking(trackingSettings);
  }, [
    isAdminRoute,
    trackingSettings.customFooterMarkup,
    trackingSettings.customHeadMarkup,
    trackingSettings.metaPixelId,
  ]);

  useEffect(() => {
    if (isAdminRoute || !trackingSettings.metaPixelId) {
      return;
    }

    void trackMetaPageView();
  }, [isAdminRoute, location.pathname, location.search, trackingSettings.metaPixelId]);

  return null;
}
