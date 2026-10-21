import { api } from './client';

/**
 * Browser push for urgent announcements.
 *
 * Every entry point is defensive: push is unsupported on some browsers, can be
 * blocked by the user, and needs a secure context (https, or localhost). None
 * of those are errors worth surfacing — the resident still gets the banner,
 * the in-app bell and the email.
 */

export type PushState = 'unsupported' | 'disabled' | 'default' | 'granted' | 'denied';

/**
 * base64url (what VAPID uses) -> the bytes PushManager expects.
 *
 * Backed by an explicit ArrayBuffer: `Uint8Array.from` yields
 * Uint8Array<ArrayBufferLike>, which no longer satisfies BufferSource under
 * current lib types.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

/** Current state without prompting — drives the toggle's label. */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const { enabled } = (await api.get<{ publicKey: string; enabled: boolean }>('/push/key')).data;
  if (!enabled) return 'disabled';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'default';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'granted' : 'default';
}

/** Prompt, subscribe, and register the endpoint. Returns the resulting state. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const { publicKey, enabled } = (
    await api.get<{ publicKey: string; enabled: boolean }>('/push/key')
  ).data;
  if (!enabled || !publicKey) return 'disabled';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      // Required by Chrome: every push must result in a visible notification.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await api.post('/push/subscribe', sub.toJSON());
  return 'granted';
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.delete('/push/subscribe', { data: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return 'default';
}
