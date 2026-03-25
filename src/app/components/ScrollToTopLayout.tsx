import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { trackAnalyticsEvent } from '../lib/analyticsTelemetry';
import { trackSubscriberActivity } from '../lib/subscriberTelemetry';

export function ScrollToTopLayout() {
  const location = useLocation();

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    trackAnalyticsEvent({
      type: 'page_view',
      pagePath: `${location.pathname}${location.search}`,
    });

    trackSubscriberActivity({
      type: 'page_view',
      pagePath: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search]);

  return <Outlet />;
}
