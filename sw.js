/* All application assets are local. First successful online visit primes offline use. */
const CACHE = "helder-v3.1.20";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=3.1.20",
  "./product.css?v=3.1.20",
  "./manifest.webmanifest",
  "./config.json",
  "./src/app.js?v=3.1.20",
  "./src/cloud-ui.js?v=3.1.20",
  "./src/cloud.js?v=3.1.20",
  "./src/curriculum-ui.js?v=3.1.20",
  "./src/curriculum.js?v=3.1.20",
  "./src/exploration-ui.js?v=3.1.20",
  "./src/email-ui.js?v=3.1.20",
  "./src/guide.js?v=3.1.20",
  "./src/icons.js?v=3.1.20",
  "./src/interface.js?v=3.1.20",
  "./src/learning.js?v=3.1.20",
  "./src/markdown.js?v=3.1.20",
  "./src/model.js?v=3.1.20",
  "./src/parser.js?v=3.1.20",
  "./src/scheduler.js?v=3.1.20",
  "./src/start-check.js?v=3.1.20",
  "./src/storage.js?v=3.1.20",
  "./src/study-ui.js?v=3.1.20",
  "./src/study.js?v=3.1.20",
  "./src/swipe.js?v=3.1.20",
  "./src/sync-core.js?v=3.1.20",
  "./src/utils.js?v=3.1.20",
  "./vendor/fsrs.mjs?v=3.1.20",
  "./vendor/supabase.mjs?v=3.1.20",
  "./data/starter.json?v=3.1.20",
  "./data/voorbeeld.md?v=3.1.20",
  "./data/verkennen.md?v=3.1.20",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./README.md?v=3.1.20",
  "./docs/ONDERZOEK.md?v=3.1.20",
  "./docs/ARCHITECTUUR.md?v=3.1.20",
  "./docs/ONTWERP.md?v=3.1.20",
  "./docs/SYNC.md?v=3.1.20",
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
              .filter((key) => key.startsWith("helder-") && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
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
