// Zero-dependency development server. Not a production backend or cloud sync service.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173),
  host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/plain",
  ".txt": "text/plain",
  ".tsv": "text/tab-separated-values",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost"),
      pathname = decodeURIComponent(url.pathname);
    let path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Type": `${types[extname(path)] || "application/octet-stream"}${[".svg", ".png"].includes(extname(path)) ? "" : "; charset=utf-8"}`,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bestand niet gevonden.");
  }
});
server.on("error", (error) => {
  console.error(
    `Starten mislukt: ${error.message}\nEen andere poort? PORT=4174 node server.mjs`,
  );
  process.exit(1);
});
server.listen(port, host, () =>
  console.log(
    `\nHelder staat klaar op http://${host === "127.0.0.1" ? "localhost" : host}:${port}\nLaat deze terminal open. Stoppen: Ctrl+C.\n`,
  ),
);
