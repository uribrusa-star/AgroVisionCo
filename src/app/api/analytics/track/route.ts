import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, visitorId, referrer, device, target } = body as {
      eventType: 'pageview' | 'click';
      visitorId?: string;
      referrer?: string;
      device?: 'mobile' | 'desktop';
      target?: string;
    };

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docRef = adminDb.collection('webAnalytics').doc(todayStr);
    const docSnap = await docRef.get();

    const currentData = docSnap.exists ? docSnap.data() || {} : {};

    const totalViews = (currentData.totalViews || 0) + (eventType === 'pageview' ? 1 : 0);
    const totalClicks = (currentData.totalClicks || 0) + (eventType === 'click' ? 1 : 0);
    
    // Unique visitors set logic stored as map
    const uniqueVisitorsMap = currentData.uniqueVisitorsMap || {};
    if (visitorId && eventType === 'pageview') {
      uniqueVisitorsMap[visitorId] = true;
    }
    const uniqueVisitorsCount = Object.keys(uniqueVisitorsMap).length;

    // Referrer tracking
    const referrers = currentData.referrers || { direct: 0, google: 0, whatsapp: 0, social: 0, other: 0 };
    if (eventType === 'pageview') {
      let refKey = 'direct';
      if (referrer) {
        const refLower = referrer.toLowerCase();
        if (refLower.includes('google')) refKey = 'google';
        else if (refLower.includes('whatsapp') || refLower.includes('wa.me')) refKey = 'whatsapp';
        else if (refLower.includes('facebook') || refLower.includes('instagram') || refLower.includes('t.co') || refLower.includes('twitter')) refKey = 'social';
        else if (refLower.length > 0) refKey = 'other';
      }
      referrers[refKey] = (referrers[refKey] || 0) + 1;
    }

    // Device tracking
    const devices = currentData.devices || { mobile: 0, desktop: 0 };
    if (eventType === 'pageview' && device) {
      devices[device] = (devices[device] || 0) + 1;
    }

    // Interaction targets tracking
    const interactions = currentData.interactions || {};
    if (eventType === 'click' && target) {
      interactions[target] = (interactions[target] || 0) + 1;
    }

    await docRef.set({
      date: todayStr,
      totalViews,
      totalClicks,
      uniqueVisitorsCount,
      uniqueVisitorsMap,
      referrers,
      devices,
      interactions,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging analytics:", error);
    return NextResponse.json({ error: 'Analytics error' }, { status: 500 });
  }
}
