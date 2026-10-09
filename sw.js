/* All application assets are local. First successful online visit primes offline use. */
const CACHE = "helder-v3.1.40";
const IMAGE_CACHE = "helder-images",
  MAX_IMAGES = 500;
async function trimImages() {
  const cache = await caches.open(IMAGE_CACHE),
    keys = await cache.keys();
  if (keys.length > MAX_IMAGES)
    await Promise.all(
      keys.slice(0, keys.length - MAX_IMAGES).map((key) => cache.delete(key)),
    );
}
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=3.1.40",
  "./product.css?v=3.1.40",
  "./manifest.webmanifest",
  "./config.json",
  "./src/app.js?v=3.1.40",
  "./src/cloud-ui.js?v=3.1.40",
  "./src/cloud.js?v=3.1.40",
  "./src/curriculum-ui.js?v=3.1.40",
  "./src/curriculum.js?v=3.1.40",
  "./src/exploration-ui.js?v=3.1.40",
  "./src/email-ui.js?v=3.1.40",
  "./src/guide.js?v=3.1.40",
  "./src/icons.js?v=3.1.40",
  "./src/interface.js?v=3.1.40",
  "./src/learning.js?v=3.1.40",
  "./src/markdown.js?v=3.1.40",
  "./src/model.js?v=3.1.40",
  "./src/parser.js?v=3.1.40",
  "./src/scheduler.js?v=3.1.40",
  "./src/start-check.js?v=3.1.40",
  "./src/storage.js?v=3.1.40",
  "./src/study-ui.js?v=3.1.40",
  "./src/study.js?v=3.1.40",
  "./src/swipe.js?v=3.1.40",
  "./src/sync-core.js?v=3.1.40",
  "./src/utils.js?v=3.1.40",
  "./vendor/fsrs.mjs?v=3.1.40",
  "./vendor/supabase.mjs?v=3.1.40",
  "./data/starter.json?v=3.1.40",
  "./data/voorbeeld.md?v=3.1.40",
  "./data/verkennen.md?v=3.1.40",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./README.md?v=3.1.40",
  "./docs/ONDERZOEK.md?v=3.1.40",
  "./docs/ARCHITECTUUR.md?v=3.1.40",
  "./docs/ONTWERP.md?v=3.1.40",
  "./docs/SYNC.md?v=3.1.40",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith("helder-") &&
                  key !== CACHE &&
                  key !== IMAGE_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  // Card pictures load from anywhere; keep seen ones for offline rounds.
  if (
    event.request.destination === "image" &&
    url.origin !== self.location.origin
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(event.request).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response && (response.ok || response.type === "opaque"))
                event.waitUntil(
                  cache
                    .put(event.request, response.clone())
                    .then(trimImages)
                    .catch(() => {}),
                );
              return response;
            }),
        ),
      ),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/config.json")) {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok)
            (await caches.open(CACHE)).put(event.request, response.clone());
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html")),
    );
    return;
  }
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
