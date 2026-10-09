/* All application assets are local. First successful online visit primes offline use. */
const CACHE = "helder-v3.1.27";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=3.1.27",
  "./product.css?v=3.1.27",
  "./manifest.webmanifest",
  "./config.json",
  "./src/app.js?v=3.1.27",
  "./src/cloud-ui.js?v=3.1.27",
  "./src/cloud.js?v=3.1.27",
  "./src/curriculum-ui.js?v=3.1.27",
  "./src/curriculum.js?v=3.1.27",
  "./src/exploration-ui.js?v=3.1.27",
  "./src/email-ui.js?v=3.1.27",
  "./src/guide.js?v=3.1.27",
  "./src/icons.js?v=3.1.27",
  "./src/interface.js?v=3.1.27",
  "./src/learning.js?v=3.1.27",
  "./src/markdown.js?v=3.1.27",
  "./src/model.js?v=3.1.27",
  "./src/parser.js?v=3.1.27",
  "./src/scheduler.js?v=3.1.27",
  "./src/start-check.js?v=3.1.27",
  "./src/storage.js?v=3.1.27",
  "./src/study-ui.js?v=3.1.27",
  "./src/study.js?v=3.1.27",
  "./src/swipe.js?v=3.1.27",
  "./src/sync-core.js?v=3.1.27",
  "./src/utils.js?v=3.1.27",
  "./vendor/fsrs.mjs?v=3.1.27",
  "./vendor/supabase.mjs?v=3.1.27",
  "./data/starter.json?v=3.1.27",
  "./data/voorbeeld.md?v=3.1.27",
  "./data/verkennen.md?v=3.1.27",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./README.md?v=3.1.27",
  "./docs/ONDERZOEK.md?v=3.1.27",
  "./docs/ARCHITECTUUR.md?v=3.1.27",
  "./docs/ONTWERP.md?v=3.1.27",
  "./docs/SYNC.md?v=3.1.27",
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
