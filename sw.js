/* All application assets are local. First successful online visit primes offline use. */
const CACHE = "helder-v2.0.0";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=2.0.0",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/app.js?v=2.0.0",
  "./src/interface.js",
  "./src/start-check.js",
  "./src/icons.js",
  "./src/utils.js",
  "./src/markdown.js",
  "./src/parser.js",
  "./src/scheduler.js",
  "./src/model.js",
  "./src/storage.js",
  "./src/study.js",
  "./src/guide.js",
  "./vendor/fsrs.mjs",
  "./data/starter.json",
  "./data/voorbeeld.md",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./docs/ONDERZOEK.md",
  "./docs/ARCHITECTUUR.md",
  "./docs/ONTWERP.md",
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
