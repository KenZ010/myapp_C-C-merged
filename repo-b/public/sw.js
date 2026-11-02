const CACHE = "julieta-v1";
const OFFLINE_URL = "/offline";

const CUSTOMER_PATHS = [
  "/home", "/about", "/cart", "/checkout", "/contact", "/faqs",
  "/order-placed", "/orders", "/products", "/return-order",
  "/settings", "/transactions", "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch non-GET, cross-origin, API calls, or socket.io
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) return;

  // Only handle customer pages and static assets; cashier/inventory go straight to network
  const isCustomerPage = CUSTOMER_PATHS.some(
    (p) => url.pathname === p || url.pathname.startsWith(p + "/")
  );
  const isStatic =
    url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons");

  if (!isCustomerPage && !isStatic) return;

  // Pages: network first, offline page as fallback
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static build assets: cache first
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});