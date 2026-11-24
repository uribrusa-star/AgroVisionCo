import type { AttendanceLog } from './types';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(sanitizeForFirestore);
  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        result[k] = sanitizeForFirestore(v);
      }
    }
    return result;
  }
  return data;
}

const STORAGE_KEY_OFFLINE_QUEUE = 'agrovista_offline_attendance_queue';
const STORAGE_KEY_ATTENDANCE_CACHE = 'agrovista_attendance_cache';

export interface OfflineAttendanceItem {
  id: string;
  log?: AttendanceLog;
  action: 'save' | 'delete';
  timestamp: number;
  retryCount: number;
}

export function getOfflineAttendanceQueue(): OfflineAttendanceItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading offline attendance queue:', err);
    return [];
  }
}

export function enqueueOfflineAttendance(log: AttendanceLog, action: 'save' | 'delete' = 'save'): void {
  if (typeof window === 'undefined' || !log || !log.id) return;
  try {
    const queue = getOfflineAttendanceQueue().filter(i => i.id !== log.id);
    queue.push({
      id: log.id,
      log,
      action,
      timestamp: Date.now(),
      retryCount: 0
    });
    window.localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.warn('Error saving to offline attendance queue:', err);
  }
}

export function dequeueOfflineAttendance(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineAttendanceQueue().filter(i => i.id !== id);
    window.localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.warn('Error dequeuing offline attendance item:', err);
  }
}

export function getCachedAttendanceLogs(): AttendanceLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ATTENDANCE_CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function setCachedAttendanceLogs(logs: AttendanceLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_ATTENDANCE_CACHE, JSON.stringify(logs));
  } catch (err) {
    console.warn('Error updating attendance logs cache:', err);
  }
}

let isFlushing = false;

/**
 * Procesa la cola de asistencias guardadas localmente y las sube al servidor.
 * Es tolerante a fallas de red y utiliza timeouts cortos para nunca trabar la interfaz.
 */
export async function flushOfflineAttendanceQueue(): Promise<{ synced: number; remaining: number }> {
  if (typeof window === 'undefined' || isFlushing) return { synced: 0, remaining: getOfflineAttendanceQueue().length };
  
  // Si el navegador explícitamente reporta offline, no gastar batería intentando peticiones
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, remaining: getOfflineAttendanceQueue().length };
  }

  isFlushing = true;
  let synced = 0;
  const queue = getOfflineAttendanceQueue();

  for (const item of queue) {
    try {
      if (item.action === 'save' && item.log) {
        let sent = false;

        // 1. Intento directo con Firestore SDK
        try {
          const docRef = doc(db, 'attendanceLogs', item.id);
          // Timeout de 2.5s para no bloquear en conexiones 2G o inestables
          await Promise.race([
            setDoc(docRef, sanitizeForFirestore(item.log), { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
          ]);
          sent = true;
        } catch {
          // 2. Fallback mediante endpoint Admin con timeout de 3.5s
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch('/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sanitizeForFirestore(item.log)),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) sent = true;
          } catch {
            sent = false;
          }
        }

        if (sent) {
          dequeueOfflineAttendance(item.id);
          synced++;
        }
      } else if (item.action === 'delete') {
        let deleted = false;
        try {
          const docRef = doc(db, 'attendanceLogs', item.id);
          await Promise.race([
            deleteDoc(docRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
          ]);
          deleted = true;
        } catch {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch(`/api/attendance?id=${item.id}`, {
              method: 'DELETE',
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) deleted = true;
          } catch {
            deleted = false;
          }
        }

        if (deleted) {
          dequeueOfflineAttendance(item.id);
          synced++;
        }
      }
    } catch (itemErr) {
      console.warn('Error syncing offline item:', item.id, itemErr);
    }
  }

  isFlushing = false;
  return { synced, remaining: getOfflineAttendanceQueue().length };
}
