import { api } from './client';

/**
 * Browser push for urgent announcements.
 *
 * Every entry point is defensive: push is unsupported on some browsers, can be
 * blocked by the user, and needs a secure context (https, or localhost). The
 * resident always still gets the banner, the in-app bell and the email.
 *
 * But the *reason* it is unavailable is reported rather than swallowed. Hiding
 * the control on an insecure origin looked identical to a broken feature: a
 * phone opening the dev server over http://192.168.x.x has no
 * `navigator.serviceWorker` at all, so there was nothing on screen to explain
 * why notifications never arrived even with Android's own toggle switched on.
 */

export type PushState =
  | 'unsupported'
  /** Secure-context requirement unmet — plain http:// on anything but localhost. */
  | 'insecure'
  | 'disabled'
  | 'default'
  | 'granted'
  | 'denied';

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

/**
 * Why push is unavailable, or null when it is available.
 *
 * Order matters: an insecure origin strips `serviceWorker` off `navigator`
 * entirely, so it would otherwise be misreported as an unsupported browser.
 */
function unavailableReason(): 'insecure' | 'unsupported' | null {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  return pushSupported() ? null : 'unsupported';
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

/** Current state without prompting — drives the toggle's label. */
export async function pushState(): Promise<PushState> {
  const blocked = unavailableReason();
  if (blocked) return blocked;
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
  const blocked = unavailableReason();
  if (blocked) return blocked;
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
