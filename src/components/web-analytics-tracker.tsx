'use client';

import { useEffect } from 'react';

export function trackUserInteraction(target: string) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({
      eventType: 'click',
      target
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', payload);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {
    // Silent fail
  }
}

export function WebAnalyticsTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get or create anonymous visitor ID in sessionStorage
    let visitorId = sessionStorage.getItem('agrovista_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      sessionStorage.setItem('agrovista_visitor_id', visitorId);
    }

    const device = window.innerWidth < 768 ? 'mobile' : 'desktop';
    const referrer = document.referrer || '';

    const payload = JSON.stringify({
      eventType: 'pageview',
      visitorId,
      referrer,
      device
    });

    // Send asynchronously with sendBeacon (0 impact on load speed)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', payload);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }, []);

  return null;
}
