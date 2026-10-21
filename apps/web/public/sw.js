/**
 * Service worker — push notifications only.
 *
 * Deliberately NOT a caching/offline worker: the portal is data-heavy and
 * stale cached pages would be worse than a slow load, especially for queue
 * screens staff act on. This exists solely so an urgent announcement can
 * reach a resident whose browser is closed.
 */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Barangay 591', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Barangay 591';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/brgy591-logo.png',
      badge: '/brgy591-logo.png',
      // Same tag replaces an earlier notification for the same announcement
      // instead of stacking duplicates.
      tag: data.tag || 'brgy591',
      renotify: true,
      requireInteraction: true, // evacuation notices should not auto-dismiss
      data: { url: data.url || '/resident/announcements' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an already-open portal tab rather than opening a second one.
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

// Chrome can rotate a subscription; re-register so the server keeps a live one.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : undefined)
      .then((sub) =>
        fetch('/api/v1/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(sub),
        }),
      )
      .catch(() => {}),
  );
});
