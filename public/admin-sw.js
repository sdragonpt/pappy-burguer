// Minimal service worker for the admin page. It exists only so new-order notifications work on
// Android Chrome (which can't show them without one) and so tapping a notification opens the orders.
// It caches nothing.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).pathname.startsWith("/admin"));
      return open ? open.focus() : self.clients.openWindow("/admin");
    }),
  );
});
