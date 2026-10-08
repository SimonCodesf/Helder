// Responsive chrome and device status only. No scheduling, grading or data writes.
import { icon } from "./icons.js?v=3.1.13";
const MOBILE = 820;
let offlinePhase = "local",
  dockObserver = null,
  lastDrawerFocus = null;
const $ = (selector) => document.querySelector(selector);
export const offlineAvailable = () => offlinePhase === "ready";
export const offlineUpdateReady = () => offlinePhase === "waiting";
export const statusButton = (cls = "") =>
  `<button class="status-button ${cls}" data-action="connection-info" data-connection-status><span class="status-glyph">${icon("lock")}</span><span class="status-copy">Dit apparaat</span></button>`;
function updateStatus() {
  const offline = !navigator.onLine,
    ready = offlineAvailable();
  const text = ready
    ? offline
      ? "Je bent offline"
      : "Offline gereed"
    : offlinePhase === "waiting"
      ? "Update klaar"
      : offlinePhase === "installing"
        ? "Offline laden"
        : offline
          ? "Geen verbinding"
          : "Dit apparaat";
  const glyph = ready
    ? "check"
    : offlinePhase === "waiting"
      ? "refresh"
      : offlinePhase === "installing"
        ? "download"
        : "lock";
  document.querySelectorAll("[data-connection-status]").forEach((el) => {
    el.classList.toggle("offline-ready", ready);
    el.classList.toggle("update-ready", offlinePhase === "waiting");
    el.querySelector(".status-copy").textContent = text;
    el.querySelector(".status-glyph").innerHTML = icon(glyph);
    el.setAttribute(
      "aria-label",
      `${text}. Uitleg over opslag en offline gebruik`,
    );
  });
}
function setOfflinePhase(phase) {
  offlinePhase = phase;
  updateStatus();
}
export function observeOfflineInstallation(registration) {
  const seen = new WeakSet();
  const refresh = async () => {
    if (registration.waiting) {
      setOfflinePhase("waiting");
      return;
    }
    if (registration.installing) {
      setOfflinePhase("installing");
      return;
    }
    if (registration.active?.state !== "activated") {
      setOfflinePhase("local");
      return;
    }
    // Verify this release's actual offline entries, not merely an old active worker.
    try {
      const cache = await caches.open("helder-v3.1.13"),
        base = new URL("../", import.meta.url);
      const entries = await Promise.all(
        [
          "index.html",
          "styles.css?v=3.1.13",
          "product.css?v=3.1.13",
          "src/app.js?v=3.1.13",
          "src/model.js?v=3.1.13",
        ].map((path) => cache.match(new URL(path, base))),
      );
      // Registration may have changed while the cache was being read.
      if (registration.waiting) setOfflinePhase("waiting");
      else if (registration.installing) setOfflinePhase("installing");
      else setOfflinePhase(entries.every(Boolean) ? "ready" : "local");
    } catch {
      setOfflinePhase("local");
    }
  };
  const watch = (worker) => {
    if (!worker || seen.has(worker)) return;
    seen.add(worker);
    worker.addEventListener("statechange", refresh);
  };
  registration.addEventListener("updatefound", () => {
    watch(registration.installing);
    refresh();
  });
  watch(registration.installing);
  watch(registration.waiting);
  watch(registration.active);
  navigator.serviceWorker.ready.then(refresh);
  refresh();
}
function setBackgroundInert(value) {
  for (const sel of ["#main", ".mobile-bar", "#bottom-nav"]) {
    const el = $(sel);
    if (el) el.inert = value;
  }
}
export function closeNav({ restoreFocus = true } = {}) {
  const wasOpen = document.body.classList.contains("nav-open");
  document.body.classList.remove("nav-open");
  $("#nav-scrim").hidden = true;
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  const sidebar = $("#sidebar");
  sidebar.inert = innerWidth <= MOBILE;
  sidebar.removeAttribute("aria-modal");
  sidebar.removeAttribute("role");
  setBackgroundInert(false);
  if (wasOpen && restoreFocus && lastDrawerFocus?.isConnected)
    lastDrawerFocus.focus({ preventScroll: true });
}
function openNav() {
  lastDrawerFocus = document.activeElement;
  document.body.classList.add("nav-open");
  $("#nav-scrim").hidden = false;
  $("#menu-toggle").setAttribute("aria-expanded", "true");
  const sidebar = $("#sidebar");
  sidebar.inert = false;
  sidebar.setAttribute("role", "dialog");
  sidebar.setAttribute("aria-modal", "true");
  setBackgroundInert(true);
  sidebar.querySelector(".drawer-close")?.focus({ preventScroll: true });
}
function measureDock() {
  dockObserver?.disconnect();
  const dock = $(".study-dock");
  const setHeight = () =>
    document.documentElement.style.setProperty(
      "--study-dock-height",
      `${dock ? Math.ceil(dock.getBoundingClientRect().height) : 0}px`,
    );
  setHeight();
  if (dock && "ResizeObserver" in window) {
    dockObserver = new ResizeObserver(setHeight);
    dockObserver.observe(dock);
  }
}
function keyboardState() {
  const viewport = window.visualViewport;
  const editable = ["INPUT", "TEXTAREA"].includes(
    document.activeElement?.tagName,
  );
  document.body.classList.toggle(
    "keyboard-open",
    Boolean(
      innerWidth <= MOBILE &&
        editable &&
        viewport &&
        innerHeight - viewport.height > 140,
    ),
  );
}
export function syncInterface(route, stats) {
  document.body.classList.toggle("is-studying", route.type === "study");
  document.body.dataset.route = route.type;
  const selected = ["today", "starred"].includes(route.type)
    ? route.type
    : ["library", "folder", "set", "tag"].includes(route.type)
      ? "library"
      : "more";
  document.querySelectorAll(".bottom-tab").forEach((tab) => {
    const active = tab.dataset.tab === selected;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  const count = $(".tab-count");
  count.hidden = !stats.due;
  count.textContent = String(stats.due);
  const open = document.body.classList.contains("nav-open");
  $("#sidebar").inert = innerWidth <= MOBILE && !open;
  setBackgroundInert(open && innerWidth <= MOBILE);
  updateStatus();
  measureDock();
  keyboardState();
}
export function setupInterface() {
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  $('.mobile-bar [data-action="new-set"]').innerHTML = icon("plus");
  $("#menu-toggle").addEventListener("click", () =>
    document.body.classList.contains("nav-open") ? closeNav() : openNav(),
  );
  $("#nav-scrim").addEventListener("click", () => closeNav());
  $("#sidebar").addEventListener("click", (event) => {
    if (event.target.closest('[data-action="close-nav"]')) closeNav();
    else if (event.target.closest("a[href]")) closeNav({ restoreFocus: false });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !document.body.classList.contains("nav-open"))
      return;
    const focusable = [
      ...$("#sidebar").querySelectorAll("a[href],button:not(:disabled)"),
    ].filter((el) => el.getClientRects().length);
    const first = focusable[0],
      last = focusable.at(-1);
    if (
      (event.shiftKey && document.activeElement === first) ||
      (!event.shiftKey && document.activeElement === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (innerWidth > MOBILE) {
      closeNav();
      $("#sidebar").inert = false;
    } else if (!document.body.classList.contains("nav-open"))
      $("#sidebar").inert = true;
    keyboardState();
  });
  window.visualViewport?.addEventListener("resize", keyboardState);
  document.addEventListener("focusin", keyboardState);
  document.addEventListener("focusout", () =>
    requestAnimationFrame(keyboardState),
  );
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
}
