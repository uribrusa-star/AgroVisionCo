export type PushNotificationPayload = {
  title: string;
  body: string;
  severity?: 'info' | 'warning' | 'critical';
  targetUserId?: string;
  targetUserIds?: string[];
  targetRoles?: string[];
};

/**
 * Sends a push notification by calling the internal API endpoint.
 * Does not block execution (fire and forget).
 */
export const sendPushNotification = (payload: PushNotificationPayload) => {
  fetch('/api/alerts/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.error('Failed to trigger push notification API', error);
  });
};
