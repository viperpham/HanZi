/* HanZi LMS — service worker nhận Web Push.
 * Không liên quan tới routing SPA — chỉ xử lý push + click thông báo. */
const TITLE = 'HanZi LMS';
const ICON = '/favicon-192.png';

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(TITLE, {
    body: data.body || 'Bạn có thông báo mới.',
    icon: ICON,
    badge: ICON,
    tag: 'hanzi-noti',
    renotify: true,
    data: { link: data.link || null },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;
  const url = link ? new URL(link, self.location.origin).href : self.location.origin + '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = windows.find((w) => w.url.startsWith(self.location.origin));
    if (app) {
      await app.focus();
      app.postMessage({ type: 'navigate', link: url });
    } else {
      await self.clients.openWindow(url);
    }
  })());
});
