/* All application assets are local. First successful online visit primes offline use. */
const CACHE = "helder-v3.1.17";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=3.1.17",
  "./product.css?v=3.1.17",
  "./manifest.webmanifest",
  "./config.json",
  "./src/app.js?v=3.1.17",
  "./src/cloud-ui.js?v=3.1.17",
  "./src/cloud.js?v=3.1.17",
  "./src/curriculum-ui.js?v=3.1.17",
  "./src/curriculum.js?v=3.1.17",
  "./src/exploration-ui.js?v=3.1.17",
  "./src/email-ui.js?v=3.1.17",
  "./src/guide.js?v=3.1.17",
  "./src/icons.js?v=3.1.17",
  "./src/interface.js?v=3.1.17",
  "./src/learning.js?v=3.1.17",
  "./src/markdown.js?v=3.1.17",
  "./src/model.js?v=3.1.17",
  "./src/parser.js?v=3.1.17",
  "./src/scheduler.js?v=3.1.17",
  "./src/start-check.js?v=3.1.17",
  "./src/storage.js?v=3.1.17",
  "./src/study-ui.js?v=3.1.17",
  "./src/study.js?v=3.1.17",
  "./src/swipe.js?v=3.1.17",
  "./src/sync-core.js?v=3.1.17",
  "./src/utils.js?v=3.1.17",
  "./vendor/fsrs.mjs?v=3.1.17",
  "./vendor/supabase.mjs?v=3.1.17",
  "./data/starter.json?v=3.1.17",
  "./data/voorbeeld.md?v=3.1.17",
  "./data/verkennen.md?v=3.1.17",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./README.md?v=3.1.17",
  "./docs/ONDERZOEK.md?v=3.1.17",
  "./docs/ARCHITECTUUR.md?v=3.1.17",
  "./docs/ONTWERP.md?v=3.1.17",
  "./docs/SYNC.md?v=3.1.17",
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
