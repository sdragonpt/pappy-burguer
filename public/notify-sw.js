// Minimal service worker used only for notifications: Android Chrome can't show them without one.
// Registered with scope /admin (new orders for the kitchen) and /ordine (order ready for the customer).
// Tapping a notification focuses an open tab on the notification's URL, or opens it. It caches nothing.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || self.registration.scope, self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).pathname === url.pathname);
      return open ? open.focus() : self.clients.openWindow(url.href);
    }),
  );
});
