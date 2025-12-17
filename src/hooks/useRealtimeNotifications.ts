import { useEffect, useState } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  createdAt: string;
}

/**
 * Supabase realtime has been removed in MySQL mode.
 * This hook currently returns an empty list (you can later replace it with WebSocket/SSE).
 */
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications([]);
  }, []);

  return { notifications };
}
