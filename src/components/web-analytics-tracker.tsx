'use client';

import { useEffect, useContext } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';

export function isInternalUser(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check explicit ignore flag in storage
  if (
    localStorage.getItem('agrovista_ignore_analytics') === 'true' ||
    sessionStorage.getItem('agrovista_ignore_analytics') === 'true'
  ) {
    return true;
  }

  // Check stored user data
  try {
    const rawUser = localStorage.getItem('agrovista_user') || sessionStorage.getItem('agrovista_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const email = user.email ? user.email.toLowerCase() : '';
      if (
        user.role === 'SuperAdmin' ||
        email === 'productor@agrovision.co' ||
        email === 'productor@agrovista.co' ||
        email === 'admin@agrovista.ubrs'
      ) {
        localStorage.setItem('agrovista_ignore_analytics', 'true');
        return true;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  return false;
}

export function trackUserInteraction(target: string) {
  if (typeof window === 'undefined') return;
  if (isInternalUser()) return; // Exclude internal Admin and Main Producer clicks

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
  const { currentUser } = useContext(AppDataContext);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check logged in user from context and flag if admin or main producer
    if (currentUser) {
      const email = currentUser.email ? currentUser.email.toLowerCase() : '';
      if (
        currentUser.role === 'SuperAdmin' ||
        email === 'productor@agrovision.co' ||
        email === 'productor@agrovista.co' ||
        email === 'admin@agrovista.ubrs'
      ) {
        localStorage.setItem('agrovista_ignore_analytics', 'true');
      }
    }

    if (isInternalUser()) return; // Exclude internal Admin and Main Producer pageviews

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
  }, [currentUser]);

  return null;
}
