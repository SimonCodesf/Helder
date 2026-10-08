import {
  escapeHTML as e,
  uid,
  clone,
  countLabel,
  localDay,
  nextMidnight,
  dateLabel,
  intervalLabel,
  shuffle,
  downloadText,
  safeURL,
} from "./utils.js?v=3.1.0";
import { icon } from "./icons.js?v=3.1.0";
import { markdown } from "./markdown.js?v=3.1.0";
import {
  parseImport,
  splitTags,
  validateNote,
  toMarkdown,
  toTSV,
  noteImportKey,
} from "./parser.js?v=3.1.0";
import {
  emptyCollection,
  validateCollection,
  ensureFolderPath,
  folderPath,
  folderDescendants,
  newSet,
  upsertNote,
  deleteNotes,
  scopeNotes,
  scopeCards,
  stats,
  queueFor,
  isAvailable,
  faces,
  burySiblings,
} from "./model.js?v=3.1.0";
import {
  loadCollection,
  saveCollection,
  requestPersistentStorage,
  getDeviceValue,
  setDeviceValue,
} from "./storage.js?v=3.1.0";
import { previewRatings, scheduleRating, State } from "./scheduler.js?v=3.1.0";
import {
  createSession,
  currentCardId,
  advanceSession,
} from "./study.js?v=3.1.0";
import { guideView } from "./guide.js?v=3.1.0";
import {
  prepareStep,
  startExploration,
  nextExploration,
  finishExploration,
  explorationTerm,
  beginRecall,
  recognitionOptions,
  shouldApply,
} from "./learning.js?v=3.1.0";
import {
  facet,
  structureFor,
  levelLabel,
  chapterLabel,
  progressFor,
  labelMap,
  mapText,
} from "./curriculum.js?v=3.1.0";
import {
  progressStrip,
  courseStructure,
  folderTile,
} from "./curriculum-ui.js?v=3.1.0";
import { studyScreen } from "./study-ui.js?v=3.1.0";
import { explorationScreen } from "./exploration-ui.js?v=3.1.0";
import { emailView } from "./email-ui.js?v=3.1.0";
import { setupSwipe } from "./swipe.js?v=3.1.0";
import { CloudConnection } from "./cloud.js?v=3.1.0";
import { cloudPanel, conflictBody } from "./cloud-ui.js?v=3.1.0";
import { LocalChangedError, localFromCloud } from "./sync-core.js?v=3.1.0";
import {
  setupInterface,
  syncInterface,
  closeNav,
  observeOfflineInstallation,
  offlineUpdateReady,
  offlineAvailable,
  statusButton,
} from "./interface.js?v=3.1.0";

let cloud;
let state,
  session = null,
  draft = null,
  writeChain = Promise.resolve(),
  installPrompt = null,
  toastTimer,
  searchTimer,
  refreshTimer;
const ui = {
  query: "",
  tag: "",
  page: 0,
  collapsed: new Set(),
  grading: false,
  level: "",
  chapter: "",
  detailTab: "overview",
};
const main = document.querySelector("#main"),
  sidebar = document.querySelector("#sidebar"),
  modal = document.querySelector("#modal");
const channel =
  "BroadcastChannel" in window
    ? new BroadcastChannel("helder-collection")
    : null;
const $ = (selector, root = document) => root.querySelector(selector);
const routeURL = (type, id = "") =>
  `#/${type}${id ? "/" + encodeURIComponent(id) : ""}`;
function route() {
  try {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return {
      type: parts[0] || "today",
      id: decodeURIComponent(parts[1] || ""),
    };
  } catch {
    return { type: "today", id: "" };
  }
}
function routeScope(r = route()) {
  return ["set", "folder", "tag", "starred", "difficult"].includes(r.type)
    ? { type: r.type, id: r.id }
    : { type: "all" };
}
function scopeTitle(scope) {
  if (scope.type === "set")
    return state.sets.find((s) => s.id === scope.id)?.title ?? "Set";
  if (scope.type === "folder")
    return state.folders.find((f) => f.id === scope.id)?.name ?? "Map";
  if (scope.type === "tag") return scope.id;
  if (scope.type === "starred") return "Kaarten met ster";
  if (scope.type === "difficult") return "Moeilijke kaarten";
  return "Je hele bibliotheek";
}
function button(label, action, kind = "", extra = "", ico = "") {
  return `<button type="button" class="btn ${kind}" data-action="${action}" ${extra}>${ico ? icon(ico) : ""}${label}</button>`;
}
function actionScope(scope) {
  return `data-scope="${e(scope.type)}" data-id="${e(scope.id ?? "")}"${scope.level ? ` data-level="${e(scope.level)}"` : ""}${scope.chapter ? ` data-chapter="${e(scope.chapter)}"` : ""}${scope.tag ? ` data-tag="${e(scope.tag)}"` : ""}${scope.query ? ` data-query="${e(scope.query)}"` : ""}`;
}
function getActionScope(el) {
  return {
    type: el.dataset.scope || "all",
    id: el.dataset.id || "",
    level: el.dataset.level || "",
    chapter: el.dataset.chapter || "",
    tag: el.dataset.tag || "",
    query: el.dataset.query || "",
  };
}
function applyTheme() {
  const theme = state.settings.theme;
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
function toast(
  message,
  { error = false, action = "", label = "", sticky = false } = {},
) {
  clearTimeout(toastTimer);
  const box = $("#toast");
  box.hidden = false;
  box.className = `toast${error ? " error" : ""}`;
  box.innerHTML = `<span>${e(message)}</span>${action ? button(label, action, "soft") : ""}<button class="icon-button" data-action="dismiss-toast" aria-label="Melding sluiten">${icon("close")}</button>`;
  if (!sticky)
    toastTimer = setTimeout(() => (box.hidden = true), error ? 9000 : 4500);
}
function errorMessage(error) {
  console.error(error);
  toast(
    error?.name === "QuotaExceededError"
      ? "De lokale opslag is vol. Exporteer een back-up voordat je gegevens verwijdert."
      : (error?.message ?? "Er ging iets mis."),
    {
      error: true,
      action: error?.name === "ConflictError" ? "reload" : "",
      label: "Herlaad",
      sticky: error?.name === "ConflictError",
    },
  );
}
async function mutate(updater, { render = true, remote = false } = {}) {
  const operation = writeChain
    .catch(() => {})
    .then(async () => {
      const next = clone(state);
      const result = updater(next);
      next.revision = state.revision + 1;
      await saveCollection(next, state.revision);
      state = next;
      if (!remote) cloud?.markDirty();
      applyTheme();
      channel?.postMessage({ revision: next.revision });
      if (render) renderApp();
      return result;
    });
  writeChain = operation;
  return operation;
}
function navLink(type, name, ico, id = "", count = "") {
  const r = route();
  return `<a class="nav-item${r.type === type && r.id === id ? " active" : ""}" href="${routeURL(type, id)}">${icon(ico)}<span>${e(name)}</span>${count !== "" ? `<span class="nav-count">${count}</span>` : ""}</a>`;
}
function renderTree(parentId = null, depth = 0) {
  if (depth > 25) return "";
  const folders = state.folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "nl", { numeric: true }));
  const sets = state.sets
    .filter((s) => s.folderId === parentId)
    .sort((a, b) => a.title.localeCompare(b.title, "nl", { numeric: true }));
  return `<ul class="tree-level">${folders.map((f) => `<li><div class="tree-row"><button class="tree-toggle" data-action="toggle-folder" data-id="${e(f.id)}" aria-label="${ui.collapsed.has(f.id) ? "Open" : "Sluit"} ${e(f.name)}" aria-expanded="${!ui.collapsed.has(f.id)}">${icon(ui.collapsed.has(f.id) ? "chevron" : "down")}</button>${navLink("folder", f.name, "folder", f.id)}</div>${ui.collapsed.has(f.id) ? "" : renderTree(f.id, depth + 1)}</li>`).join("")}${sets.map((s) => `<li class="tree-set">${navLink("set", s.title, "stack", s.id)}</li>`).join("")}</ul>`;
}
function renderSidebar() {
  const s = stats(state);
  sidebar.innerHTML = `
    <div class="brand-row">
      <div class="brand-heading"><a class="wordmark" href="#/today">helder<span>.</span></a>
        <button class="icon-button drawer-close" data-action="close-nav" aria-label="Navigatie sluiten">${icon("close")}</button></div>
      <p class="brand-subtitle">Leren dat blijft.</p>
    </div>
    <nav class="side-nav" aria-label="Studeren">
      ${navLink("today", "Vandaag", "today", "", s.due)}
      ${navLink("library", "Bibliotheek", "stack")}
      ${navLink("starred", "Met ster", "star")}
      ${navLink("difficult", "Moeilijke kaarten", "bulb")}
    </nav>
    <section class="sidebar-folders"><div class="side-section-head"><span>JE MAPPEN</span>
      <button class="icon-button" data-action="new-folder" aria-label="Nieuwe map">${icon("plus")}</button></div>
      <nav class="folder-tree" aria-label="Mappen en sets">${state.folders.length || state.sets.length ? renderTree() : '<p class="tree-empty">Hier komt je bibliotheek.</p>'}</nav>
    </section>
    <div class="side-bottom"><nav class="side-nav" aria-label="Hulp en instellingen">
      ${navLink("guide", "Zo werkt het", "help")}${navLink("settings", "Instellingen", "settings")}
      </nav>${statusButton("sidebar-status")}
      <p class="local-note">Geen abonnement in de app.<br>Lokaal bewaard. Optionele privésync.</p>
    </div>`;
}
function setTile(set) {
  const sc = { type: "set", id: set.id },
    s = stats(state, sc),
    p = progressFor(state, sc),
    structure = structureFor(state, sc);
  return `<article class="set-card course-tile"><div class="set-card-top"><div class="set-icon">${icon("book")}</div><div class="set-card-title"><h3><a href="${routeURL("set", set.id)}">${e(set.title)}</a></h3><p>${e((folderPath(state, set.folderId) || "Eigen set").replaceAll("::", " / "))}</p></div><a class="icon-button set-open" href="${routeURL("set", set.id)}" aria-label="${e(set.title)} openen">${icon("chevron")}</a></div><p class="set-card-description">${e(set.description || "Jouw vragen, in een eigen leerroute.")}</p>${progressStrip(state, sc, { labels: false })}<div class="set-card-foot"><span>${countLabel(s.total, "kaart", "kaarten")}${structure.levels.length ? " · " + structure.levels.length + " niveaus" : ""}</span><span class="course-status ${s.due ? "due" : ""}">${s.due ? s.due + " herhalen" : p.building + p.spaced ? p.spaced + " gespreid opgehaald" : "Nieuw"}</span></div></article>`;
}
function statsHTML(s) {
  return `<div class="stat-grid" aria-label="Je planning vandaag"><div class="stat"><span class="stat-head">Herhalen</span><strong class="stat-number">${s.due}</strong><p>nu aan de beurt</p></div><div class="stat"><span class="stat-head">Nieuw</span><strong class="stat-number">${s.newToday}</strong><p>${state.settings.dailyLimit ? "tot " + state.settings.newPerDay + " / dag" : "zonder daglimiet"}</p></div><div class="stat"><span class="stat-head">Gedaan</span><strong class="stat-number">${s.done}</strong><p>beoordelingen vandaag</p></div></div>`;
}
function todayView() {
  const s = stats(state),
    queued = queueFor(state),
    round = queued.slice(0, state.settings.sessionSize),
    roundNew = round.filter(
      (id) => state.cards.find((c) => c.id === id).schedule.state === State.New,
    ).length;
  const date = new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  if (!state.notes.length)
    return `<div class="page today-page welcome-page"><header class="page-head"><div><div class="eyebrow">Jouw eigen leerplek</div><h1>Welkom bij helder<span class="accent-dot">.</span></h1><p>Van een eerste begrip naar kennis die je zelf kunt gebruiken.</p></div></header><section class="welcome-card"><div class="welcome-symbol">${icon("book")}</div><span class="eyebrow">Begin met één onderwerp</span><h2>Wat wil je leren?</h2><p>Maak je eerste set, of importeer kaarten die je al hebt. Geen account nodig om te beginnen.</p><div class="welcome-actions">${button("Maak een set", "new-set", "primary large", "", "plus")}${button("Importeer kaarten", "new-import", "large", "", "upload")}</div><div class="welcome-features"><span>${icon("lock")} Privé op dit apparaat</span><span>${icon("refresh")} Werkt ook offline</span></div></section><div class="section-head"><h2>Een rustige leerroute</h2></div><ol class="welcome-steps"><li><span>01</span><div><h3>Begrijp de kern</h3><p>Begin met uitleg en een goed voorbeeld.</p></div></li><li><span>02</span><div><h3>Probeer zonder hulp</h3><p>De steun verdwijnt; jij haalt de kennis op.</p></div></li><li><span>03</span><div><h3>Kom erop terug</h3><p>Gespreid herhalen. Daarna ook toepassen.</p></div></li></ol><a class="section-link" href="#/guide">Zo werkt Helder ${icon("arrow")}</a></div>`;
  return `<div class="page today-page"><header class="page-head"><div><div class="eyebrow">${e(date.charAt(0).toUpperCase() + date.slice(1))}</div><h1>Vandaag</h1><p>Begrijpen. Zelf ophalen. Er later op terugkomen.</p></div><div class="head-actions">${button("Nieuwe set", "new-set", "", "", "plus")}</div></header><section class="today-hero v3-hero${queued.length ? "" : " is-complete"}" aria-labelledby="next-round-title"><div class="hero-copy"><div class="hero-overline"><h2 id="next-round-title">${queued.length ? "Je volgende ronde" : "Voor nu ben je bij"}</h2><span class="hero-icon">${icon(queued.length ? "target" : "check")}</span></div>${queued.length ? `<div class="hero-total"><strong>${round.length}</strong><div><span>kaarten om op te halen</span><p>${countLabel(round.length - roundNew, "herhaling", "herhalingen")} · ${roundNew} nieuw</p></div></div>` : '<p class="hero-complete-copy">Geef je kennis even de tijd.</p>'}<p class="hero-caption">${queued.length ? "Nieuwe stof met steun. Herhalingen zonder antwoordopties." : "Je volgende herhalingen staan gepland. Vrij oefenen kan altijd."}</p></div><div class="hero-action">${button(queued.length ? "Start je ronde" : "Bekijk je bibliotheek", queued.length ? "start-learn" : "go-library", "primary large", queued.length ? actionScope({ type: "all" }) : "", "arrow")}<span class="small">${queued.length ? "Tot " + state.settings.sessionSize + " kaarten · op jouw tempo" : "Of kies een toepassingsronde"}</span></div></section>${statsHTML(s)}<div class="section-head"><div><h2>Verder met je vakken</h2><p class="section-caption">${countLabel(s.total, "kaart", "kaarten")} · ${state.sets.length} sets</p></div><a class="section-link" href="#/library">Alles ${icon("arrow")}</a></div><div class="set-grid">${state.sets.slice(0, 4).map(setTile).join("")}</div><details class="learning-note"><summary>${icon("help")} Wat betekenen “gekend” en “geleerd”? ${icon("down")}</summary><p>Een swipe betekent dat jij een kaart herkent. Alleen gespreide, zelfstandige ophaalpogingen leveren herinneringsdata op voor de planner. Toepassen oefen je apart.</p></details></div>`;
}
function emptyHTML(title, text, label = "", action = "") {
  return `<div class="empty-state"><div class="empty-icon">${icon("stack")}</div><h2>${e(title)}</h2><p>${e(text)}</p>${action ? button(e(label), action, "primary") : ""}</div>`;
}
function folderOptions(selected = null, exclude = null) {
  const blocked = exclude ? folderDescendants(state, exclude) : new Set();
  return (
    `<option value="" ${!selected ? "selected" : ""}>Zonder map</option>` +
    state.folders
      .filter((f) => !blocked.has(f.id))
      .sort((a, b) =>
        folderPath(state, a.id).localeCompare(folderPath(state, b.id), "nl"),
      )
      .map(
        (f) =>
          `<option value="${e(f.id)}" ${f.id === selected ? "selected" : ""}>${e(folderPath(state, f.id).replaceAll("::", " / "))}</option>`,
      )
      .join("")
  );
}
function libraryView(r) {
  const inFolder = r.type === "folder",
    folder = inFolder ? state.folders.find((f) => f.id === r.id) : null;
  if (inFolder && !folder) return notFoundView();
  let sets = inFolder
    ? state.sets.filter((s) => folderDescendants(state, r.id).has(s.folderId))
    : state.sets;
  if (ui.query)
    sets = sets.filter((s) =>
      `${s.title} ${s.description} ${folderPath(state, s.folderId)}`
        .toLowerCase()
        .includes(ui.query.toLowerCase()),
    );
  const children = state.folders.filter(
    (f) => f.parentId === (folder?.id ?? null),
  );
  return `<div class="page"><header class="page-head"><div>${inFolder ? `<div class="breadcrumb"><a href="#/library">Bibliotheek</a><span>/</span><span>${e(folderPath(state, folder.id).replaceAll("::", " / "))}</span></div>` : '<div class="eyebrow">Alles op zijn plek.</div>'}<h1>${e(folder?.name ?? "Je bibliotheek")}</h1><p>${inFolder ? "Oefen deze map als geheel, of kies een set hieronder." : "Je vakken en sets. Binnen een vak kies je niveau en hoofdstuk."}</p></div><div class="head-actions">${inFolder ? button("Map beheren", "edit-folder", "", `data-id="${e(folder.id)}"`, "folder") : button("Nieuwe map", "new-folder", "", "", "folder")}${button("Nieuwe set", "new-set", "primary", inFolder ? `data-folder="${e(folder.id)}"` : "", "plus")}</div></header>${inFolder ? `<div class="actions">${button("Samen leren", "start-learn", "soft", actionScope({ type: "folder", id: r.id }), "arrow")}${button("Flashcards", "start-flash", "", actionScope({ type: "folder", id: r.id }), "stack")}</div>` : ""}<div class="toolbar"><label class="search-field">${icon("search")}<input id="live-query" type="search" data-live-search="sets" placeholder="Zoek een set of map…" aria-label="Sets zoeken" value="${e(ui.query)}"></label></div>${children.length ? `<div class="subject-grid">${children.map((f) => folderTile(state, f)).join("")}</div>` : ""}<div class="section-head"><h2>${inFolder ? "Sets in deze map" : "Alle sets"}</h2><span class="small muted">${sets.length} ${sets.length === 1 ? "set" : "sets"}</span></div>${sets.length ? `<div class="set-grid">${sets.map(setTile).join("")}</div>` : emptyHTML(ui.query ? "Geen sets gevonden." : "Nog geen sets.", "Maak een set of wijzig je zoekopdracht.", "Nieuwe set", "new-set")}</div>`;
}
function tagOptions(notes) {
  return (
    `<option value="">Alle tags</option>` +
    [
      ...new Set(
        notes
          .flatMap((n) => n.tags)
          .filter(
            (t) => !t.startsWith("niveau::") && !t.startsWith("hoofdstuk::"),
          ),
      ),
    ]
      .sort((a, b) => a.localeCompare(b, "nl", { numeric: true }))
      .map(
        (t) =>
          `<option value="${e(t)}" ${ui.tag === t ? "selected" : ""}>${e(t)}</option>`,
      )
      .join("")
  );
}
function noteRow(note) {
  const cards = state.cards.filter((c) => c.noteId === note.id),
    level = facet(note, "niveau"),
    chapter = facet(note, "hoofdstuk"),
    set = state.sets.find((s) => s.id === note.setId);
  const fresh = cards.every((c) => c.schedule.state === State.New),
    due = cards.some(
      (c) =>
        c.schedule.state !== State.New &&
        c.schedule.due <= Date.now() &&
        isAvailable(c),
    );
  const generic = note.tags.filter(
    (t) => !t.startsWith("niveau::") && !t.startsWith("hoofdstuk::"),
  );
  return `<article class="note-row"><div class="note-title"><strong>${e(note.front)}</strong><div class="tags">${level ? `<span class="pill blue">${e(levelLabel(set, level))}</span>` : ""}${chapter ? `<span class="pill">${e(chapterLabel(set, chapter))}</span>` : ""}${generic
    .slice(0, 3)
    .map((t) => `<a class="tag-link" href="${routeURL("tag", t)}">${e(t)}</a>`)
    .join(
      "",
    )}</div><div class="note-state"><span class="pill">${cards.every((c) => c.suspended) ? "Gepauzeerd" : due ? "Te herhalen" : fresh ? "Nieuw" : "In je planning"}</span>${cards.some((c) => c.practiceMark === "unknown") ? '<span class="small attention">Nog oefenen</span>' : ""}${note.learning?.choice || note.learning?.application ? '<span class="small muted">Extra oefeningen</span>' : ""}</div></div><div class="note-answer">${markdown(note.back || "Invulkaart")}</div><div class="note-actions"><button class="icon-button ${note.starred ? "is-starred" : ""}" data-action="star-note" data-id="${e(note.id)}" aria-label="${note.starred ? "Ster verwijderen" : "Ster toevoegen"}" aria-pressed="${!!note.starred}">${icon("star")}</button><button class="icon-button" data-action="edit-note" data-id="${e(note.id)}" aria-label="Kaart bewerken">${icon("edit")}</button></div></article>`;
}
function notesView(r) {
  const scope = routeScope(r),
    set = r.type === "set" ? state.sets.find((s) => s.id === r.id) : null;
  if (r.type === "set" && !set) return notFoundView();
  const allNotes = scopeNotes(state, scope),
    selectedScope = {
      ...scope,
      query: ui.query,
      tag: ui.tag,
      level: ui.level,
      chapter: ui.chapter,
    },
    filtered = scopeNotes(state, selectedScope),
    perPage = 25,
    s = stats(state, selectedScope),
    structure = structureFor(state, scope),
    hasStructure =
      set && (structure.levels.length || structure.chapters.length),
    overview = hasStructure && ui.detailTab === "overview";
  ui.page = Math.min(
    ui.page,
    Math.max(0, Math.ceil(filtered.length / perPage) - 1),
  );
  const shown = filtered.slice(ui.page * perPage, (ui.page + 1) * perPage);
  return `<div class="page set-page"><header class="page-head"><div><div class="breadcrumb"><a href="#/library">Bibliotheek</a>${set?.folderId ? `<span>/</span><a href="${routeURL("folder", set.folderId)}">${e(folderPath(state, set.folderId).replaceAll("::", " / "))}</a>` : ""}</div><h1>${e(scopeTitle(scope))}</h1><p>${e(set?.description ?? (r.type === "difficult" ? "Je swipes naar “nog niet” en kaarten die vaker moeilijk bleken." : r.type === "starred" ? "Bewaar wat je wilt terugvinden, uit al je vakken." : "Alle kaarten met deze tag."))}</p></div><div class="head-actions detail-actions">${set ? button('<span class="btn-label">Kaarten toevoegen</span>', "add-cards", "detail-action", `data-id="${e(set.id)}" aria-label="Kaarten toevoegen"`, "plus") + button('<span class="btn-label">Set beheren</span>', "edit-set", "detail-action", `data-id="${e(set.id)}" aria-label="Set beheren"`, "more") : ""}</div></header>${hasStructure ? `<nav class="course-tabs" aria-label="Setweergave"><button class="${overview ? "active" : ""}" data-action="course-tab" data-view="overview" aria-pressed="${overview}">Overzicht</button><button class="${!overview ? "active" : ""}" data-action="course-tab" data-view="cards" aria-pressed="${!overview}">Kaarten <span>${allNotes.length}</span></button></nav>` : ""}<div class="set-study-actions">${button("Leren", "start-learn", "primary large", actionScope(selectedScope), "arrow")}${button("Flashcards", "start-flash", "large", actionScope(selectedScope), "stack")}</div><div class="set-study-meta"><span class="small muted">${countLabel(s.total, "kaart", "kaarten")} · ${s.due} te herhalen${ui.level ? " · " + e(levelLabel(set, ui.level)) : ""}${ui.chapter ? " · " + e(chapterLabel(set, ui.chapter === "__none" ? "" : ui.chapter)) : ""}</span><div class="practice-modes">${button("Verkennen", "start-explore", "ghost", actionScope(selectedScope), "book")}${button("Toepassen", "start-transfer", "ghost", actionScope(selectedScope), "bulb")}</div></div>
  ${overview ? courseStructure(state, set, ui, button, actionScope) : `<div class="toolbar course-filters"><label class="search-field">${icon("search")}<input type="search" id="live-query" data-live-search="notes" placeholder="Zoek een kaart…" aria-label="Kaarten zoeken" value="${e(ui.query)}"></label>${structure.levels.length ? `<select id="level-filter" aria-label="Niveau"><option value="">Alle niveaus</option>${structure.levels.map((v) => `<option value="${e(v)}" ${ui.level === v ? "selected" : ""}>${e(levelLabel(set, v))}</option>`).join("")}</select>` : ""}${structure.chapters.length ? `<select id="chapter-filter" aria-label="Hoofdstuk"><option value="">Alle hoofdstukken</option>${structure.chapters.map((v) => `<option value="${e(v)}" ${ui.chapter === v ? "selected" : ""}>${e(chapterLabel(set, v))}</option>`).join("")}<option value="__none" ${ui.chapter === "__none" ? "selected" : ""}>Zonder hoofdstuk</option></select>` : ""}<select id="tag-filter" aria-label="Overige tags">${tagOptions(allNotes)}</select></div><div class="section-head"><h2>Kaarten</h2><span class="small muted">${filtered.length} notities</span></div>${shown.length ? `<div class="cards-list">${shown.map(noteRow).join("")}</div><div class="pagination"><span>${ui.page * perPage + 1}–${Math.min((ui.page + 1) * perPage, filtered.length)} van ${filtered.length}</span><div class="actions">${button("Vorige", "page-prev", "", ui.page ? "" : "disabled", "back")}${button("Volgende", "page-next", "", (ui.page + 1) * perPage < filtered.length ? "" : "disabled", "chevron")}</div></div>` : emptyHTML("Geen kaarten in deze selectie.", "Kies een ander niveau of hoofdstuk, of maak een kaart.")}`}
  <div class="scope-practice">${button("Extra ophalen oefenen", "start-practice", "ghost", actionScope(selectedScope), "refresh")}<span class="small muted">Buiten je planning</span></div></div>`;
}
function settingsView() {
  const s = state.settings,
    logs = state.reviews.filter((r) => !r.inactive),
    reviews = logs.filter((r) => !r.wasNew),
    correct = reviews.filter((r) => r.rating > 1),
    rate =
      reviews.length >= 5
        ? Math.round((correct.length / reviews.length) * 100) + "%"
        : "Nog te weinig data";
  return `<div class="page narrow settings"><header class="page-head"><div><div class="eyebrow">Jouw manier van leren.</div><h1>Instellingen</h1><p>Een paar keuzes. De rest houden we eenvoudig.</p></div></header><form id="settings-form"><section class="setting-section"><h2>Je leerplanning</h2><p>15 is een startinstelling, geen wetenschappelijk ideaal en geen premiumlimiet. Alleen nieuwe kaarten vallen hieronder. Herhalingen kun je altijd afwerken, ronde na ronde.</p><div class="check-field"><input type="checkbox" id="daily-limit" name="dailyLimit" ${s.dailyLimit ? "checked" : ""}><label for="daily-limit">Daglimiet voor nieuwe kaarten<div class="help">Uitschakelen = geen daglimiet. Kies wat bij je beschikbare tijd past.</div></label></div><div class="daily-presets">${[5, 10, 15, 25].map((v) => button(String(v), "daily-preset", "", `data-value="${v}"`)).join("")}<span class="small muted">nieuwe kaarten</span></div><div class="form-row"><div class="field"><label for="new-per-day">Nieuwe kaarten per dag</label><input type="number" id="new-per-day" name="newPerDay" min="0" max="100000" step="1" value="${s.newPerDay}" ${s.dailyLimit ? "" : "disabled"} required><span class="help">0 = alleen bestaande kaarten herhalen.</span></div><div class="field"><label for="session-size">Kaarten per ronde</label><input type="number" id="session-size" name="sessionSize" min="5" max="200" step="1" value="${s.sessionSize}" required><span class="help">Een rondelimiet, geen dagelijkse reviewlimiet.</span></div></div><div class="field"><label for="retention">Gewenste herinnering (FSRS)</label><select id="retention" name="retention">${[
    ...new Set([0.8, 0.85, 0.9, 0.95, s.retention]),
  ]
    .sort((a, b) => a - b)
    .map(
      (v) =>
        `<option value="${v}" ${s.retention === v ? "selected" : ""}>${Math.round(v * 100)}%${v === 0.9 ? " — aanbevolen startpunt" : ""}</option>`,
    )
    .join(
      "",
    )}</select><span class="help">Hoger betekent vaker oefenen. Geen voorspelling van examenresultaat of werkelijk begrip. Nieuwe beoordelingen gebruiken je keuze; bestaande vervaldata blijven staan.</span></div><div class="field"><label for="answer-mode">Antwoorden in de leermodus</label><select id="answer-mode" name="answerMode"><option value="write" ${s.answerMode === "write" ? "selected" : ""}>Typen — eigen woorden, geen automatische beoordeling</option><option value="think" ${s.answerMode === "think" ? "selected" : ""}>Hardop of in je hoofd beantwoorden</option></select></div><div class="check-field"><input type="checkbox" id="scaffold" name="scaffold" ${s.scaffold ? "checked" : ""}><label for="scaffold">Nieuwe stof geleidelijk opbouwen<div class="help">Eerst een groep verkennen: meerkeuze waar beschikbaar, definitie → term of uitleg. Daarna verdwijnen de opties en uitleg. Herhalingen blijven zonder deze opwarming.</div></label></div><div class="field"><label for="explore-size">Kaarten per verkenningsgroep</label><select id="explore-size" name="exploreSize">${[1, 3, 5].map((n) => `<option value="${n}" ${s.exploreSize === n ? "selected" : ""}>${n} ${n === 1 ? "kaart" : "kaarten"}</option>`).join("")}</select><span class="help">Een praktische startkeuze, geen bewezen ideaal. Groepen houden niveau en hoofdstuk bij elkaar.</span></div><div class="check-field"><input type="checkbox" id="application" name="application" ${s.application ? "checked" : ""}><label for="application">Toepassingen aanbieden na gespreid ophalen<div class="help">Alleen wanneer je kaart een eigen scenario en modelredenering heeft. Los toepassen oefenen kan altijd.</div></label></div><div class="check-field"><input type="checkbox" id="mix" name="mix" ${s.mix ? "checked" : ""}><label for="mix">Herhalingen door elkaar aanbieden<div class="help">Nieuwe kaarten gaan per set van het laagste naar het hoogste niveau. Herhalingen houden voorrang.</div></label></div></section><section class="setting-section"><h2>Uiterlijk</h2><div class="field"><label for="theme">Thema</label><select id="theme" name="theme"><option value="system" ${s.theme === "system" ? "selected" : ""}>Volg mijn apparaat</option><option value="light" ${s.theme === "light" ? "selected" : ""}>Licht</option><option value="dark" ${s.theme === "dark" ? "selected" : ""}>Donker</option></select></div>${button("Instellingen opslaan", "submit-settings", "primary")}</section></form><section class="setting-section"><h2>Je apparaten</h2><div id="cloud-panel">${cloudPanel(cloud, button)}</div></section><section class="setting-section"><h2>Je gegevens</h2><p>Alles wordt eerst lokaal bewaard. Sync is optioneel via je eigen backend. Een JSON-back-up bewaart ook je leerlogboek, maar nooit aanmeldtokens.</p><div class="actions">${button("Volledige back-up", "backup", "primary", "", "download")}${button("Back-up herstellen", "restore", "", "", "upload")}${button("Opslag beschermen", "persist", "", "", "lock")}</div><p class="backup-note">Laatste export: ${state.lastBackup ? e(new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(state.lastBackup))) : "nog geen back-up gemaakt"}.</p><p class="small muted">Een back-up bevat kaarten, tags, mappen, FSRS-planning en het leerlogboek. Open de app altijd op hetzelfde websiteadres; een ander adres of andere browser heeft een aparte collectie.</p></section><section class="setting-section"><h2>Wat je logboek zegt</h2><p>${logs.length} beoordelingen opgeslagen. ${reviews.length} daarvan waren herhalingen van eerder geziene kaarten.</p><p><strong>${rate}</strong>${reviews.length >= 5 ? " van die herhalingen beoordeelde je als correct (Moeilijk, Goed of Makkelijk)." : ""}</p><p class="small muted">Dit is je eigen beoordeling, geen objectieve meting. Nieuwe kaarten zijn uitgesloten; herhaalde pogingen op dezelfde dag tellen mee. Een afgeronde ronde zegt niet dat je de stof blijvend beheerst.</p></section><section class="setting-section"><h2>Op je beginscherm</h2><p>Op HTTPS kun je Helder als gratis webapp installeren. Open de site één keer volledig online; daarna werkt de gecachete app offline.</p><div class="actions">${installPrompt ? button("App installeren", "install", "soft", "", "download") : ""}<a class="btn" href="#/guide">${icon("help")} Installatie en uitleg</a></div><p class="backup-note">Helder 3.1 · ts-fsrs 5.4.2 · Geen telemetry</p></section></div>`;
}
function notFoundView() {
  return `<div class="page">${emptyHTML("Deze plek bestaat niet meer.", "Misschien is de set of map verwijderd.", "Naar de bibliotheek", "go-library")}</div>`;
}
function renderApp({ keepFocus = false } = {}) {
  if (!state) return;
  const old = keepFocus ? document.activeElement : null,
    position = old?.selectionStart,
    id = old?.id;
  renderSidebar();
  const r = route();
  let content;
  if (r.type === "study" && session) content = studyView();
  else if (r.type === "study")
    content = `<div class="page">${emptyHTML("Je antwoorden zijn bewaard.", "Na een herlaadbeurt maak je een nieuwe ronde op basis van je actuele planning.", "Naar Vandaag", "go-today")}</div>`;
  else if (r.type === "today") content = todayView();
  else if (["library", "folder"].includes(r.type)) content = libraryView(r);
  else if (["set", "tag", "starred", "difficult"].includes(r.type))
    content = notesView(r);
  else if (r.type === "settings") content = settingsView();
  else if (r.type === "guide") content = guideView();
  else content = notFoundView();
  main.innerHTML = content;
  syncInterface(r, stats(state));
  refreshCloudUI();
  document.title = `${r.type === "study" ? "Oefenen" : r.type === "today" ? "Vandaag" : r.type === "settings" ? "Instellingen" : r.type === "guide" ? "Zo werkt het" : r.type === "library" ? "Bibliotheek" : scopeTitle(routeScope(r))} · Helder`;
  if (keepFocus && id) {
    const replacement = document.getElementById(id);
    if (replacement) {
      replacement.focus({ preventScroll: true });
      if (position != null)
        try {
          replacement.setSelectionRange(position, position);
        } catch {}
    }
  }
}
function startStudy(scope, mode = "learn", practice = false) {
  session = createSession(state, scope, { mode, practice });
  ui.grading = false;
  if (!session.total && ["flash", "explore"].includes(mode)) {
    session = null;
    toast(
      "Geen actieve kaarten in deze selectie. Controleer je filter of gepauzeerde kaarten.",
    );
    return;
  }
  location.hash = "#/study";
  renderApp();
  window.scrollTo(0, 0);
}
function learningPending() {
  if (!session) return [];
  return scopeCards(state, session.scope)
    .filter(
      (c) =>
        isAvailable(c) &&
        [State.Learning, State.Relearning].includes(c.schedule.state),
    )
    .sort((a, b) => a.schedule.due - b.schedule.due);
}
function studyView() {
  prepareStep(session, state);
  if (session.exploration)
    return explorationScreen(state, session, { button, scopeTitle });
  return studyScreen(state, session, {
    button,
    scopeTitle,
    finishedView,
    grading: ui.grading,
  });
}
function finishedView() {
  if (session.mode === "explore")
    return `<div class="study-page"><header class="study-header">${button("Terug", "end-study", "ghost", "", "back")}<div class="study-context"><h1>Je verkenningsronde</h1><p>${e(scopeTitle(session.scope))}</p></div><span></span></header><section class="finish-card"><div class="finish-icon">${icon("book")}</div><h1>Een eerste kennismaking.</h1><p>Je hebt ${session.exploredIds?.length ?? 0} kaarten verkend. Dat is een ingang, geen bewijs van zelfstandig onthouden. Je herhalingsplanning is niet veranderd.</p><div class="actions">${button("Nu zelf ophalen", "start-learn", "primary", actionScope(session.scope), "arrow")}${button("Terug naar overzicht", "end-study")}</div></section></div>`;
  if (session.mode === "flash") {
    const marks = session.flashMarks ?? {},
      known = Object.values(marks).filter((v) => v === "known").length,
      unknown = Object.values(marks).filter((v) => v === "unknown").length,
      skipped = session.total - known - unknown;
    return `<div class="study-page"><header class="study-header">${button("Terug", "end-study", "ghost", "", "back")}<div class="study-context"><h1>Je sorteerronde</h1><p>${e(scopeTitle(session.scope))}</p></div><span></span></header><section class="finish-card"><div class="finish-icon">${icon("check")}</div><h1>Wat wil je nog oefenen?</h1><p>Je swipes zijn bewaard. Je herhalingsplanning is niet veranderd.</p><div class="finish-stats"><div><strong>${known}</strong><span>gekend</span></div><div><strong>${unknown}</strong><span>nog niet</span></div><div><strong>${Math.max(0, skipped)}</strong><span>overgeslagen</span></div></div><div class="actions">${unknown ? button("De moeilijke opnieuw", "repeat-unknown", "primary", "", "refresh") : ""}${button("Terug naar overzicht", "end-study", unknown ? "" : "primary")}${button("Alle kaarten opnieuw", "restart-flash", "ghost", "", "stack")}</div>${session.flashUndo ? button("Laatste swipe ongedaan", "undo-flash", "ghost", "", "undo") : ""}<p class="small muted">Gekend bij het swipen is niet hetzelfde als later zelfstandig onthouden.</p></section></div>`;
  }
  const flash = session.mode === "flash",
    completed = session.completed.length,
    good = session.completed.filter((r) => r.rating > 1).length,
    pending = !flash && !session.practice ? learningPending() : [],
    next = pending[0],
    canContinue =
      !flash && !session.practice && queueFor(state, session.scope).length > 0;
  const minutes = Math.max(
    1,
    Math.round((Date.now() - session.startedAt) / 60000),
  );
  return `<div class="study-page"><header class="study-header">${button("Terug", "end-study", "ghost", "", "back")}<div class="study-context"><h1>${e(scopeTitle(session.scope))}</h1></div><span></span></header><section class="finish-card"><div class="finish-icon">${icon("check")}</div><h1>${flash ? "Je hebt de set bekeken." : completed ? "Deze ronde zit erop." : "Voor nu is er niets aan de beurt."}</h1><p>${flash ? "Je planning is niet veranderd. Herhaal gerust vrij, of gebruik Leren voor gespreide herhaling." : session.practice ? "Je hebt extra geoefend, zonder de gewone FSRS-planning te veranderen." : "Dat is een goede tussenstap, geen bewijs dat alles voorgoed blijft zitten. De planner bewaart de volgende herhalingen."}</p>${!flash && completed ? `<div class="finish-stats"><div><strong>${completed}</strong><span>beoordeeld</span></div><div><strong>${good}</strong><span>als correct beoordeeld</span></div><div><strong>${minutes}</strong><span>${minutes === 1 ? "minuut" : "minuten"}</span></div></div>` : ""}${next ? `<div class="timer-line" id="pending-time" data-due="${next.schedule.due}">${countLabel(pending.length, "kaart", "kaarten")} in de leerfase. Volgende ${next.schedule.due <= Date.now() ? "is nu beschikbaar" : "over " + intervalLabel(next.schedule.due)}.</div>` : ""}<div class="actions">${canContinue ? button("Volgende ronde", "continue-learning", "primary", "", "arrow") : ""}${flash ? button("Nog eens bekijken", "restart-flash", "primary", "", "refresh") : ""}${button("Terug naar overzicht", "end-study", canContinue || flash ? "" : "primary")}${!flash ? button("Vrij oefenen", "switch-flash", "ghost", "", "stack") : ""}</div>${session.lastUndo ? `<div class="actions" style="margin-top:16px">${button("Laatste beoordeling ongedaan", "undo-grade", "ghost", "", "undo")}</div>` : ""}</section><p class="small muted" style="margin-top:24px;text-align:center">Reeds beoordeelde kaarten zijn direct opgeslagen. Een nieuwe ronde gebruikt je actuele planning.</p></div>`;
}
async function grade(rating) {
  if (
    ui.grading ||
    !session?.revealed ||
    session.mode !== "learn" ||
    session.exploration ||
    session.phase !== "recall"
  )
    return;
  if ((session.hintUsed && rating !== 1) || (session.introSeen && rating === 4))
    return;
  ui.grading = true;
  document.querySelectorAll(".grade").forEach((b) => (b.disabled = true));
  const id = currentCardId(session),
    oldSession = clone(session),
    now = Date.now();
  oldSession.lastUndo = null; // Keep only one reversible action, not an ever-growing history chain.
  try {
    if (!session.practice) {
      const reviewId = uid();
      let snapshot;
      await mutate(
        (next) => {
          const card = next.cards.find((c) => c.id === id);
          if (!card) throw new Error("Deze kaart is verwijderd.");
          snapshot = next.cards
            .filter((c) => c.noteId === card.noteId)
            .map(clone);
          const result = scheduleRating(
              card,
              rating,
              next.settings.retention,
              now,
            ),
            wasNew = card.schedule.state === State.New;
          const previous = clone(card.schedule);
          card.schedule = result.schedule;
          burySiblings(next, card, now);
          next.reviews.push({
            id: reviewId,
            cardId: id,
            time: now,
            day: localDay(now),
            rating,
            wasNew,
            hintUsed: session.hintUsed,
            assisted: !!(session.hintUsed || session.introSeen),
            form: "recall",
            retention: next.settings.retention,
            ms: Math.min(900000, now - session.cardStartedAt),
            log: result.log,
            previous,
          });
        },
        { render: false },
      );
      advanceSession(session, id, rating);
      session.lastUndo = { reviewId, snapshot, session: oldSession };
    } else {
      advanceSession(session, id, rating);
      session.lastUndo = null;
    }
    const studiedCard = state.cards.find((c) => c.id === id),
      studiedNote = state.notes.find((n) => n.id === studiedCard?.noteId);
    const applicationNext =
      !session.practice &&
      studiedCard?.template === "forward" &&
      shouldApply(state, studiedCard, studiedNote, rating);
    session.intro = false;
    session.introSeen = false;
    session.preparedId = null;
    if (applicationNext)
      session.application = {
        cardId: id,
        answer: "",
        revealed: false,
        fromRecall: true,
      };
    ui.grading = false;
    // Bring back short-term cards only when truly due, never early and never above round size.
    const due = queueFor(state, session.scope, Date.now());
    if (
      !session.practice &&
      session.completed.length + session.queue.length < session.total
    ) {
      const extra = due.filter((cardId) => !session.queue.includes(cardId));
      session.queue.push(
        ...extra.slice(
          0,
          session.total - session.completed.length - session.queue.length,
        ),
      );
    }
    renderApp();
    window.scrollTo(0, 0);
  } catch (error) {
    ui.grading = false;
    renderApp();
    throw error;
  }
}
async function undoGrade() {
  const undo = session?.lastUndo;
  if (!undo || ui.grading) return;
  ui.grading = true;
  try {
    await mutate(
      (next) => {
        const log = next.reviews.find((r) => r.id === undo.reviewId);
        if (!log) throw new Error("Deze beoordeling is niet meer beschikbaar.");
        const latest = next.reviews
          .filter((r) => r.cardId === log.cardId)
          .at(-1);
        if (latest.id !== log.id)
          throw new Error("Deze kaart is later al opnieuw beoordeeld.");
        for (const saved of undo.snapshot) {
          const idx = next.cards.findIndex((c) => c.id === saved.id);
          if (idx >= 0) next.cards[idx] = saved;
        }
        next.reviews = next.reviews.filter((r) => r.id !== undo.reviewId);
      },
      { render: false },
    );
    session = undo.session;
    session.lastUndo = null;
    ui.grading = false;
    renderApp();
  } catch (error) {
    ui.grading = false;
    throw error;
  }
}
function navigateBack() {
  const scope = session?.scope;
  session = null;
  ui.grading = false;
  location.hash =
    scope &&
    ["set", "folder", "tag", "starred", "difficult"].includes(scope.type)
      ? routeURL(scope.type, scope.id)
      : "#/today";
  renderApp();
}
function openModal(title, subtitle, body, footer = "") {
  modal.innerHTML = `<header class="modal-head"><div><h2 id="modal-title">${e(title)}</h2>${subtitle ? `<p>${e(subtitle)}</p>` : ""}</div><button class="icon-button" data-action="close-modal" aria-label="Venster sluiten">${icon("close")}</button></header><div class="modal-body">${body}<p class="inline-error" id="modal-error" role="alert" hidden></p></div>${footer ? `<footer class="modal-foot">${footer}</footer>` : ""}`;
  if (!modal.open) modal.showModal();
}
function modalError(error) {
  const box = $("#modal-error");
  if (box) {
    box.hidden = false;
    box.textContent = error.message ?? String(error);
    box.scrollIntoView({ block: "nearest" });
  } else errorMessage(error);
}
function confirmModal(
  title,
  text,
  callback,
  { label = "Verwijderen", danger = true } = {},
) {
  draft = { type: "confirm", callback };
  openModal(
    title,
    "",
    `<p>${e(text)}</p>`,
    `<div class="actions">${button("Annuleren", "close-modal")}${button(label, "confirm", danger ? "danger" : "primary")}</div>`,
  );
}
function openEmail(mode = "login", email = "") {
  if (!["login", "register", "forgot", "update"].includes(mode)) return;
  if (mode === "update" && !cloud?.recovering) {
    toast("Gebruik eerst een geldige herstellink.", { error: true });
    return;
  }
  const view = emailView(mode, email);
  draft = { type: "email", mode };
  openModal(
    view.title,
    view.subtitle,
    view.body,
    `<div class="actions">${button("Annuleren", "close-modal")}<button class="btn primary" type="submit" form="email-auth-form" data-auth-submit>${view.action}</button></div>`,
  );
  setTimeout(
    () => $(mode === "update" ? "#auth-password" : "#auth-email")?.focus(),
    0,
  );
}
async function submitEmail(event) {
  event.preventDefault();
  const form = event.target,
    submit = $("[data-auth-submit]");
  if (!form.reportValidity() || submit?.disabled) return;
  const mode = form.dataset.mode,
    email = $("#auth-email")?.value.trim() ?? "",
    password = $("#auth-password")?.value ?? "";
  if (
    ["register", "update"].includes(mode) &&
    (password.length < 8 || password !== $("#auth-password-confirm").value)
  ) {
    modalError(
      new Error("Gebruik minstens 8 tekens en herhaal hetzelfde wachtwoord."),
    );
    return;
  }
  if (submit) submit.disabled = true;
  try {
    const result = await cloud.emailAuth(mode, email, password);
    form
      .querySelectorAll('input[type="password"]')
      .forEach((el) => (el.value = ""));
    if (mode === "forgot" || (mode === "register" && !result.session)) {
      draft = { type: "email-notice" };
      openModal(
        mode === "forgot" ? "Controleer je e-mail" : "Bevestig je e-mailadres",
        "Je lokale bibliotheek is niet veranderd.",
        `<p>${mode === "forgot" ? "Als dit adres een account heeft, ontvang je een herstellink. Controleer ook je spammap." : "Als de registratie is geaccepteerd, ontvang je een bevestigingsmail. Open de link en meld je daarna aan. Heb je al een account? Gebruik aanmelden of wachtwoordherstel."}</p><p class="small muted">Geen mail? De projecteigenaar controleert SMTP, quota en de Site URL in Supabase. Zet verificatie niet uit.</p>`,
        button("Naar aanmelden", "email-mode", "primary", 'data-mode="login"'),
      );
    } else {
      modal.close();
      draft = null;
      refreshCloudUI();
      await cloud.sync();
      toast(
        mode === "update"
          ? "Je nieuwe wachtwoord is bewaard."
          : "Aangemeld. Verbind je bibliotheek om sync in te schakelen.",
      );
    }
  } catch (error) {
    form
      .querySelectorAll('input[type="password"]')
      .forEach((el) => (el.value = ""));
    modalError(error);
  } finally {
    if (submit?.isConnected) submit.disabled = false;
  }
}
function noteFields(note = {}) {
  const kind = note.kind || "basic",
    c = note.learning?.choice,
    a = note.learning?.application;
  return `<div class="field"><label for="note-kind">Kaarttype</label><select id="note-kind"><option value="basic" ${kind === "basic" ? "selected" : ""}>Vraag & antwoord</option><option value="reverse" ${kind === "reverse" ? "selected" : ""}>Omgekeerd — beide richtingen</option><option value="cloze" ${kind === "cloze" ? "selected" : ""}>Invul — {{c1::antwoord}}</option></select></div><div class="field"><label for="note-front">Vraag / term / invultekst</label><textarea id="note-front" placeholder="Eén vraag, één helder idee" required>${e(note.front ?? "")}</textarea></div><div class="field"><label for="note-back">Modelantwoord <span class="muted">(bij invul: extra uitleg)</span></label><textarea id="note-back" placeholder="De kern, eventueel met een voorbeeld">${e(note.back ?? "")}</textarea><span class="help">Markdown: **vet**, *cursief*, - lijstjes. Geen HTML-uitvoering.</span></div><div class="form-row"><div class="field"><label for="note-level">Niveau <span class="muted">(optioneel)</span></label><input id="note-level" placeholder="1, 2 of 3" value="${e(facet(note.tags ? note : { tags: [] }, "niveau"))}"></div><div class="field"><label for="note-chapter">Hoofdstuk <span class="muted">(optioneel)</span></label><input id="note-chapter" placeholder="Bijv. H1" value="${e(facet(note.tags ? note : { tags: [] }, "hoofdstuk"))}"></div></div><div class="field"><label for="note-tags">Overige tags</label><input id="note-tags" placeholder="kennisleer, begrippen" value="${e((note.tags ?? []).filter((t) => !t.startsWith("niveau::") && !t.startsWith("hoofdstuk::")).join(", "))}"></div><details class="editor-extras" ${note.hint || note.explain || note.source ? "open" : ""}><summary>${icon("settings")}<span>Hint, begripscheck & bron</span>${icon("down")}</summary><div class="field"><label for="note-hint">Hint</label><input id="note-hint" value="${e(note.hint ?? "")}"></div><div class="field"><label for="note-explain">Begripscheck</label><input id="note-explain" value="${e(note.explain ?? "")}" placeholder="Leg het verschil uit met een verwant begrip."></div><div class="field"><label for="note-source">Bron-URL</label><input type="url" id="note-source" value="${e(note.source ?? "")}" placeholder="https://…"></div></details>
  <div class="field"><label for="warm-term">Term voor omgekeerd verkennen <span class="muted">(optioneel)</span></label><input type="text" id="warm-term" maxlength="200" value="${e(note.learning?.term ?? "")}" placeholder="${e(explorationTerm(note.front ? note : { front: "", back: "" }) ?? "Bijv. Premisse")}"><span class="help">Bij korte begripsnamen automatisch: definitie → term. Bij een gewone vraag alleen als je hier een term invult.</span></div><details class="editor-extras" ${c ? "open" : ""}><summary>${icon("target")}<span>Herkenningsvraag</span>${icon("down")}</summary><p class="small muted">Steun bij nieuwe stof. Schrijf zelf plausibele, duidelijk onjuiste afleiders.</p><div class="field"><label for="choice-prompt">Vraag</label><input id="choice-prompt" value="${e(c?.prompt ?? "")}"></div><div class="field"><label for="choice-correct">Juiste optie</label><input id="choice-correct" value="${e(c?.options[c.correct] ?? "")}"></div><div class="field"><label for="choice-wrong">Afleiders</label><textarea id="choice-wrong" placeholder="Minstens twee afleiders, elk op één regel">${e(c?.options.filter((_, i) => i !== c.correct).join("\n") ?? "")}</textarea></div><div class="field"><label for="choice-feedback">Waarom is dit juist?</label><input id="choice-feedback" value="${e(c?.feedback ?? "")}"></div></details>
  <details class="editor-extras" ${a ? "open" : ""}><summary>${icon("bulb")}<span>Toepassingsvraag</span>${icon("down")}</summary><p class="small muted">Een scenario, voorbeeld of vergelijking. Geen automatische beoordeling van vrije tekst.</p><div class="field"><label for="apply-prompt">Vraag / scenario</label><input id="apply-prompt" value="${e(a?.prompt ?? "")}"></div><div class="field"><label for="apply-answer">Voorbeeldredenering</label><textarea id="apply-answer">${e(a?.answer ?? "")}</textarea></div><div class="field"><label for="apply-rubric">Kernpunten voor zelfcontrole</label><textarea id="apply-rubric" placeholder="Eén kernpunt per regel">${e(a?.rubric?.join("\n") ?? "")}</textarea></div></details>`;
}
function readNoteFields() {
  const level = $("#note-level").value.trim(),
    chapter = $("#note-chapter").value.trim(),
    tags = splitTags($("#note-tags").value),
    learning = {};
  const warmTerm = $("#warm-term").value.trim();
  if (warmTerm) learning.term = warmTerm;
  if (level) tags.push("niveau::" + level);
  if (chapter) tags.push("hoofdstuk::" + chapter);
  const cp = $("#choice-prompt").value.trim(),
    correct = $("#choice-correct").value.trim(),
    wrong = $("#choice-wrong")
      .value.split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
    feedback = $("#choice-feedback").value.trim();
  if (cp || correct || wrong.length || feedback)
    learning.choice = {
      prompt: cp,
      options: [correct, ...wrong],
      correct: 0,
      feedback,
    };
  const ap = $("#apply-prompt").value.trim(),
    answer = $("#apply-answer").value.trim(),
    rubric = $("#apply-rubric")
      .value.split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  if (ap || answer || rubric.length)
    learning.application = { prompt: ap, answer, rubric };
  return {
    kind: $("#note-kind").value,
    front: $("#note-front").value,
    back: $("#note-back").value,
    tags,
    hint: $("#note-hint").value,
    explain: $("#note-explain").value,
    source: $("#note-source").value,
    ...(Object.keys(learning).length ? { learning } : {}),
  };
}
function openBuilder({ setId = null, folderId = null } = {}) {
  const existing = state.sets.find((s) => s.id === setId);
  draft = {
    type: "builder",
    setId: existing?.id ?? null,
    tab: "manual",
    notes: [],
    folderId:
      folderId ??
      existing?.folderId ??
      (route().type === "folder" ? route().id : null),
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    importText: "",
    format: "auto",
    parsed: null,
  };
  renderBuilder();
}
function builderSync() {
  if (draft?.type !== "builder") return;
  draft.title = $("#set-title")?.value ?? draft.title;
  draft.description = $("#set-description")?.value ?? draft.description;
  draft.folderId = $("#set-folder")?.value || null;
  if ($("#import-text")) {
    draft.importText = $("#import-text").value;
    draft.format = $("#import-format").value;
  }
  if ($("#note-front")) draft.pending = readNoteFields();
}
function renderBuilder() {
  const manual = draft.tab === "manual";
  const body = `${!draft.setId ? `<div class="field"><label for="set-title">Naam van je set</label><input type="text" id="set-title" maxlength="200" placeholder="Bijvoorbeeld: Algemene filosofie" value="${e(draft.title)}"></div><details class="editor-extras set-options" ${draft.folderId || draft.description ? "open" : ""}><summary>${icon("folder")}<span>Map & beschrijving</span>${icon("down")}</summary><div class="form-row"><div class="field"><label for="set-folder">Map</label><select id="set-folder">${folderOptions(draft.folderId)}</select></div><div class="field"><label for="set-description">Korte beschrijving</label><input type="text" id="set-description" value="${e(draft.description)}" maxlength="500"></div></div></details>` : ""}<div class="tabs" role="tablist" aria-label="Kaarten invoeren"><button class="tab ${manual ? "active" : ""}" role="tab" aria-selected="${manual}" data-action="builder-tab" data-tab="manual">Handmatig</button><button class="tab ${manual ? "" : "active"}" role="tab" aria-selected="${!manual}" data-action="builder-tab" data-tab="import">Markdown / import</button></div>${manual ? `${noteFields(draft.pending)}<div class="actions">${button("Voeg kaart toe", "draft-add", "soft", "", "plus")}${button("Voorbeeld", "note-preview", "ghost", "", "book")}</div><div id="note-preview"></div><ul class="draft-list">${draft.notes.map((n, i) => `<li><span>${i + 1}. ${e(n.front)}</span><button class="icon-button" data-action="draft-remove" data-index="${i}" aria-label="Conceptkaart verwijderen">${icon("close")}</button></li>`).join("")}</ul>` : `<div class="form-row"><div class="field"><label for="import-format">Formaat</label><select id="import-format"><option value="auto" ${draft.format === "auto" ? "selected" : ""}>Automatisch herkennen</option><option value="markdown" ${draft.format === "markdown" ? "selected" : ""}>Markdown</option><option value="tsv" ${draft.format === "tsv" ? "selected" : ""}>TSV / Quizlet (tab)</option><option value="csv" ${draft.format === "csv" ? "selected" : ""}>CSV (komma)</option></select></div><div class="field"><label for="import-file">Of open een bestand</label><input class="input" type="file" id="import-file" accept=".md,.txt,.tsv,.csv,text/plain,text/markdown,text/csv"></div></div><div class="field"><label for="import-text">Plak je kaarten</label><textarea id="import-text" class="code-input" placeholder="# Mijn set&#10;&#10;## Wat is kennis?&#10;Een goed onderbouwde overtuiging.&#10;&#10;---&#10;&#10;## Volgende vraag&#10;Het antwoord.">${e(draft.importText)}</textarea><span class="help">Markdown: ## Vraag gevolgd door het antwoord. TSV: term [tab] definitie. <a href="#" data-action="import-example">Vul een voorbeeld in</a>.</span></div><div id="import-preview"></div>`}`;
  openModal(
    draft.setId ? "Kaarten toevoegen" : "Een nieuwe set",
    draft.setId ? `Toevoegen aan ${draft.title}` : "Eén helder idee per kaart.",
    body,
    `<span class="save-status" id="builder-status">${countLabel(draft.notes.length, "kaart", "kaarten")} in concept</span><div class="actions">${button("Annuleren", "close-modal")}${button("Opslaan", "builder-save", "primary")}</div>`,
  );
  if (!manual && draft.importText) updateImportPreview();
}
function updateImportPreview() {
  if (draft?.type !== "builder" || !$("#import-text")) return;
  builderSync();
  const box = $("#import-preview"),
    input = $("#import-text"),
    status = $("#builder-status");
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  status.classList.remove("has-error");
  if (!draft.importText.trim()) {
    box.innerHTML = "";
    draft.parsed = null;
    status.textContent = "Plak kaarten om te importeren";
    return;
  }
  try {
    draft.parsed = parseImport(draft.importText, draft.format);
    if (!draft.title && draft.parsed.title) {
      draft.title = draft.parsed.title;
      if ($("#set-title")) $("#set-title").value = draft.title;
    }
    const p = draft.parsed;
    box.innerHTML = `<div class="preview-box"><strong>${countLabel(p.notes.length, "kaart", "kaarten")} gevonden</strong>${p.duplicates ? `<p class="small muted">${p.duplicates} exacte duplicaten in de import overgeslagen.</p>` : ""}${p.folderPath ? `<p class="small muted">Markdown-map: ${e(p.folderPath)}. Wordt gebruikt als hierboven geen map gekozen is.</p>` : ""}${p.notes
      .slice(0, 3)
      .map(
        (n) =>
          `<div class="preview-row"><strong>${e(n.front)}</strong><p>${e(n.back.slice(0, 200) || "Invulkaart")}</p></div>`,
      )
      .join(
        "",
      )}${p.notes.length > 3 ? `<p class="small muted">En ${p.notes.length - 3} andere kaarten.</p>` : ""}</div>`;
    $("#builder-status").textContent =
      `${countLabel(p.notes.length, "kaart", "kaarten")} klaar voor import`;
  } catch (error) {
    draft.parsed = null;
    box.innerHTML = `<p class="inline-error" id="import-error" role="status">${e(error.message)}</p>`;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", "import-error");
    status.classList.add("has-error");
    status.textContent = "Import niet geldig";
  }
}
async function saveBuilder() {
  builderSync();
  const d = draft;
  let notes =
    d.tab === "import"
      ? parseImport(d.importText, d.format).notes
      : [...d.notes];
  if (
    d.tab === "manual" &&
    d.pending &&
    (d.pending.front.trim() || d.pending.back.trim())
  ) {
    validateNote(d.pending);
    notes.push(d.pending);
  }
  if (!d.setId && !d.title.trim())
    throw new Error("Geef je set eerst een naam.");
  if (!notes.length) throw new Error("Voeg minstens één kaart toe.");
  let targetId,
    count = 0,
    skipped = 0;
  await mutate(
    (next) => {
      const parsed =
        d.tab === "import" ? parseImport(d.importText, d.format) : null;
      const set = d.setId
        ? next.sets.find((s) => s.id === d.setId)
        : newSet(next, {
            title: d.title,
            curriculum: parsed?.curriculum,
            description: d.description || parsed?.description || "",
            folderId:
              d.folderId ??
              (parsed?.folderPath
                ? ensureFolderPath(next, parsed.folderPath)
                : null),
          });
      if (!set) throw new Error("De set bestaat niet meer.");
      targetId = set.id;
      const seen = new Set(
        next.notes.filter((n) => n.setId === set.id).map(noteImportKey),
      );
      for (const note of notes) {
        const key = noteImportKey(note);
        if (seen.has(key)) {
          skipped++;
          continue;
        }
        seen.add(key);
        upsertNote(next, set.id, note);
        count++;
      }
    },
    { render: false },
  );
  modal.close();
  draft = null;
  location.hash = routeURL("set", targetId);
  renderApp();
  toast(
    `${countLabel(count, "kaart", "kaarten")} toegevoegd${skipped ? `; ${skipped} exacte duplicaten overgeslagen` : ""}.`,
  );
}
function openNoteEditor(id) {
  const note = state.notes.find((n) => n.id === id);
  if (!note) return;
  draft = { type: "note", id };
  openModal(
    "Kaart bewerken",
    "Typo aanpassen? Je planning blijft staan. Nieuwe betekenis? Start de planning opnieuw.",
    `<form id="note-edit-form">${noteFields(note)}<div class="check-field"><input type="checkbox" id="note-reset"><label for="note-reset">Leerplanning opnieuw starten<div class="help">Wist de beoordelingen en planning van alle kaarten van deze notitie.</div></label></div><div class="actions">${button("Voorbeeld", "note-preview", "ghost", "", "book")}${button(state.cards.filter((c) => c.noteId === id).every((c) => c.suspended) ? "Hervatten" : "Pauzeren", "pause-note", "ghost", `data-id="${e(id)}"`, "pause")}</div><div id="note-preview"></div></form>`,
    `<div class="actions">${button("Verwijderen", "delete-note", "danger", `data-id="${e(id)}"`, "trash")}${button("Annuleren", "close-modal")}${button("Bewaren", "save-note", "primary")}</div>`,
  );
}
function openSetEditor(id) {
  const set = state.sets.find((s) => s.id === id);
  if (!set) return;
  draft = { type: "set", id };
  openModal(
    "Set beheren",
    "Verplaatsen of exporteren verandert de leerplanning niet.",
    `<div class="field"><label for="set-title">Naam</label><input type="text" id="set-title" maxlength="200" value="${e(set.title)}"></div><div class="field"><label for="set-description">Beschrijving</label><textarea id="set-description">${e(set.description)}</textarea></div><div class="field"><label for="set-folder">Map</label><select id="set-folder">${folderOptions(set.folderId)}</select></div><details class="editor-extras"><summary>${icon("folder")}<span>Niveau- en hoofdstuknamen</span>${icon("down")}</summary><p class="small muted">Dit verandert alleen de namen in het overzicht, niet de tags of planning.</p><div class="field"><label for="set-levels">Niveaus</label><textarea id="set-levels" placeholder="1 = Basis&#10;2 = Verdieping&#10;3 = Toepassen">${e(mapText(set.curriculum?.levels))}</textarea></div><div class="field"><label for="set-chapters">Hoofdstukken</label><textarea id="set-chapters" placeholder="H1 = Inleiding">${e(mapText(set.curriculum?.chapters))}</textarea></div></details><div class="actions">${button("Markdown exporteren", "export-set", "", `data-id="${e(id)}" data-format="markdown"`, "download")}${button("TSV exporteren", "export-set", "", `data-id="${e(id)}" data-format="tsv"`, "download")}</div><p class="small muted" style="margin-top:12px">Deze exports bewaren kaartinhoud, geen voortgang. Gebruik voor voortgang de volledige back-up.</p>`,
    `<div class="actions">${button("Set verwijderen", "delete-set", "danger", `data-id="${e(id)}"`, "trash")}${button("Annuleren", "close-modal")}${button("Bewaren", "save-set", "primary")}</div>`,
  );
}
function openFolderEditor(id = null) {
  const folder = state.folders.find((f) => f.id === id);
  draft = { type: "folder", id: folder?.id ?? null };
  openModal(
    folder ? "Map beheren" : "Een nieuwe map",
    "Brede categorieën in mappen, hoofdstukken en niveaus in tags.",
    `<div class="field"><label for="folder-name">Naam</label><input type="text" id="folder-name" value="${e(folder?.name ?? "")}" maxlength="200" placeholder="Bijvoorbeeld: Filosofie"></div><div class="field"><label for="folder-parent">Bovenliggende map</label><select id="folder-parent">${folderOptions(folder?.parentId ?? (route().type === "folder" && !id ? route().id : null), id)}</select></div>`,
    `<div class="actions">${folder ? button("Map verwijderen", "delete-folder", "danger", `data-id="${e(folder.id)}"`, "trash") : ""}${button("Annuleren", "close-modal")}${button("Bewaren", "save-folder", "primary")}</div>`,
  );
}
async function exportBackup() {
  const backup = clone(state);
  backup.lastBackup = Date.now();
  downloadText(
    `helder-backup-${localDay()}.json`,
    JSON.stringify(backup, null, 2),
    "application/json",
  );
  await mutate((next) => {
    next.lastBackup = backup.lastBackup;
  });
  toast(
    "Back-up aangeboden als download. Bewaar het JSON-bestand op een veilige plek.",
  );
}
function pickRestore() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 50_000_000)
        throw new Error("Back-up te groot (maximaal 50 MB).");
      const data = validateCollection(JSON.parse(await file.text()));
      confirmModal(
        "Back-up herstellen?",
        `Dit vervangt je hele huidige collectie door ${data.sets.length} sets, ${data.cards.length} kaarten en ${data.reviews.length} beoordelingen. Exporteer eerst je huidige back-up als je die wilt bewaren.${cloud?.engine?.meta?.enabled ? " Sync is actief: deze vervanging wordt ook naar je account gesynchroniseerd." : ""}`,
        async () => {
          await mutate((next) => {
            const revision = next.revision;
            Object.keys(next).forEach((k) => delete next[k]);
            Object.assign(next, data, { revision });
          });
          session = null;
          modal.close();
          draft = null;
          location.hash = "#/today";
          renderApp();
          toast("Back-up hersteld.");
        },
        { label: "Collectie vervangen" },
      );
    } catch (error) {
      errorMessage(error);
    }
  });
  input.click();
}
async function handleClick(event) {
  const el = event.target.closest("[data-action]");
  if (!el || el.disabled) return;
  event.preventDefault();
  const action = el.dataset.action,
    id = el.dataset.id;
  const local = [
    "builder-save",
    "draft-add",
    "save-note",
    "save-set",
    "save-folder",
    "confirm",
  ];
  try {
    switch (action) {
      case "skip-main":
        main.focus({ preventScroll: true });
        main.scrollIntoView({ block: "start" });
        break;
      case "close-nav":
        closeNav();
        break;
      case "connection-info":
        openModal(
          "Ook onderweg",
          "Je leerplek, op dit apparaat.",
          `<div class="connection-intro">${icon(offlineUpdateReady() ? "refresh" : offlineAvailable() ? "check" : "lock")}<div><h3>${offlineUpdateReady() ? "Je nieuwe offline-versie staat klaar" : offlineAvailable() ? "Deze app is offline gereed" : "Lokale opslag op dit apparaat"}</h3><p>${offlineUpdateReady() ? "Sluit alle Helder-tabs en geïnstalleerde appvensters. Open daarna opnieuw op hetzelfde adres; zo wordt de update actief. Je opgeslagen voortgang blijft behouden." : "Je kaarten en voortgang worden eerst lokaal bewaard. Via Instellingen → Je apparaten kun je optionele privésync activeren."}</p></div></div>
          <ol class="connection-steps"><li><strong>Publiceer op HTTPS.</strong><p>Een vaste website maakt de app ook buitenshuis bereikbaar. Je lokale computeradres werkt niet op je telefoon.</p></li><li><strong>Open één keer volledig online.</strong><p>Wacht op de melding ‘Offline gereed’. Daarna werkt de geïnstalleerde app ook zonder verbinding.</p></li><li><strong>Zet op je beginscherm.</strong><p>iPhone: Safari → Deel → Zet op beginscherm. Android: Chrome → menu → App installeren of Toevoegen aan beginscherm.</p></li></ol>
          <div class="note-banner">${icon("download")}<p>Maak regelmatig een JSON-back-up via Instellingen. Voor automatisch delen verbind je dezelfde account via Instellingen → Je apparaten.</p></div>`,
          button("Begrepen", "close-modal", "primary"),
        );
        break;
      case "dismiss-toast":
        $("#toast").hidden = true;
        break;
      case "reload":
        location.reload();
        break;
      case "go-library":
        location.hash = "#/library";
        break;
      case "go-today":
        location.hash = "#/today";
        break;
      case "new-import":
        openBuilder();
        draft.tab = "import";
        renderBuilder();
        break;
      case "course-tab":
        ui.detailTab = el.dataset.view;
        ui.chapter = "";
        renderApp();
        break;
      case "select-level":
        ui.level = el.dataset.level || "";
        ui.chapter = "";
        ui.page = 0;
        renderApp();
        break;
      case "select-chapter":
        ui.chapter = el.dataset.chapter || "";
        ui.detailTab = "cards";
        ui.page = 0;
        renderApp();
        break;
      case "start-transfer":
        startTransfer(getActionScope(el));
        break;
      case "flash-mark":
        await markFlash(el.dataset.mark);
        break;
      case "undo-flash":
        await undoFlash();
        break;
      case "repeat-unknown": {
        const ids = session.queue.filter(
            (id) => session.flashMarks?.[id] === "unknown",
          ),
          scope = session.scope;
        session = createSession(state, scope, { mode: "flash" });
        session.queue = shuffle(ids);
        session.total = ids.length;
        session.flashMarks = {};
        renderApp();
        window.scrollTo(0, 0);
        break;
      }
      case "intro-skip":
        if (session.exploration) finishExploration(session);
        else beginRecall(session);
        renderApp();
        break;
      case "choose-answer": {
        if (session.exploration) {
          const active = session,
            warm = session.exploration,
            c = warm.task.choice;
          if (
            warm.task.kind !== "choice" ||
            warm.revealed ||
            !c.options[Number(el.dataset.choice)]
          )
            break;
          warm.selected = Number(el.dataset.choice);
          warm.revealed = true;
          await recordActivity(
            currentCardId(active),
            "recognition",
            warm.selected === c.correct,
            { round: "exploration", exercise: "choice", attempted: true },
          );
          if (session === active) renderApp();
          break;
        }
        if (session.phase !== "choice" || session.choiceSelection != null)
          break;
        const card = state.cards.find((c) => c.id === currentCardId(session)),
          note = state.notes.find((n) => n.id === card.noteId);
        session.choiceSelection = Number(el.dataset.choice);
        session.introSeen = true;
        await recordActivity(
          card.id,
          "recognition",
          session.choiceSelection === note.learning.choice.correct,
        );
        renderApp();
        break;
      }
      case "choice-done":
      case "choice-skip":
        beginRecall(session);
        renderApp();
        window.scrollTo(0, 0);
        break;
      case "explore-reveal":
        if (session.exploration) {
          session.exploration.revealed = true;
          renderApp();
        }
        break;
      case "explore-explain": {
        const active = session,
          warm = active?.exploration;
        if (!warm || warm.revealed || warm.task.kind !== "choice") break;
        warm.revealed = true;
        await recordActivity(currentCardId(active), "recognition", false, {
          round: "exploration",
          exercise: "choice",
          attempted: false,
        });
        if (session === active) renderApp();
        break;
      }
      case "explore-rate": {
        const active = session,
          warm = active?.exploration;
        if (!warm || !warm.revealed || warm.busy) break;
        warm.busy = true;
        try {
          await recordActivity(
            currentCardId(active),
            "practice",
            el.dataset.success === "true",
            {
              round: "exploration",
              exercise: warm.task.kind,
              selfRated: warm.task.kind === "reverse",
            },
          );
          if (session === active) {
            nextExploration(active, state);
            renderApp();
            window.scrollTo(0, 0);
          }
        } finally {
          warm.busy = false;
        }
        break;
      }
      case "explore-next":
        if (session.exploration?.revealed) {
          nextExploration(session, state);
          renderApp();
          window.scrollTo(0, 0);
        }
        break;
      case "explore-finish":
        if (session.exploration?.screen === "bridge") {
          finishExploration(session);
          renderApp();
          window.scrollTo(0, 0);
        }
        break;
      case "application-reveal":
        session.application.revealed = true;
        renderApp();
        window.scrollTo(0, 0);
        break;
      case "application-rate": {
        const task = session.application;
        await recordActivity(
          task.cardId,
          "application",
          el.dataset.success === "true",
        );
        if (!task.fromRecall)
          advanceSession(
            session,
            task.cardId,
            el.dataset.success === "true" ? 3 : 1,
          );
        delete session.application;
        session.preparedId = null;
        if (session.transferOnly && currentCardId(session))
          session.application = {
            cardId: currentCardId(session),
            answer: "",
            revealed: false,
            fromRecall: false,
          };
        renderApp();
        window.scrollTo(0, 0);
        break;
      }
      case "daily-preset":
        $("#new-per-day").value = el.dataset.value;
        $("#daily-limit").checked = true;
        $("#new-per-day").disabled = false;
        break;
      case "cloud-status":
        location.hash = "#/settings";
        setTimeout(
          () => $("#cloud-panel")?.scrollIntoView({ block: "center" }),
          50,
        );
        break;
      case "cloud-login":
        if (el.dataset.provider === "email") openEmail("login");
        else await cloud.signIn(el.dataset.provider);
        break;
      case "email-mode":
        openEmail(el.dataset.mode, $("#auth-email")?.value ?? "");
        break;
      case "cloud-help":
        openModal(
          "Sync op je eigen backend",
          "De app blijft ook zonder sync bruikbaar.",
          `<p>Een statische website kan geen privéleerdata opslaan. De meegeleverde koppeling gebruikt Supabase Auth en een afgeschermde Postgres-tabel.</p><ol class="connection-steps"><li><strong>Maak een eigen Supabase-project.</strong><p>Voer <code>backend/supabase.sql</code> uit. Dit zet accountafscherming en versiecontrole klaar.</p></li><li><strong>Stel e-mail of OAuth in.</strong><p>E-mailaanmelding werkt met wachtwoord, bevestiging en herstel. Gebruik je eigen appadres als Site URL; voor publieke bevestigingsmails is eigen SMTP nodig. Google/GitHub blijven optioneel.</p></li><li><strong>Vul config.json in.</strong><p>Alleen de project-URL en publieke publishable key. Nooit een secret- of service-role-key.</p></li><li><strong>Test met twee accounts en twee apparaten.</strong><p>Meld je aan, verbind bewust je collectie en controleer dat accounts elkaars kaarten niet zien.</p></li></ol><p><a class="btn" href="./docs/SYNC.md" target="_blank" rel="noopener">${icon("book")} Volledige setup & beperkingen</a></p>`,
          button("Begrepen", "close-modal", "primary"),
        );
        break;
      case "cloud-connect":
        confirmModal(
          "Deze bibliotheek verbinden?",
          "Je lokale kaarten en planning worden naar jouw account gestuurd en met diens cloudcollectie samengevoegd. Andere accounts krijgen geen toegang. Een bestaande cloudcollectie met andere kaart-ID’s kan extra sets opleveren. Maak eerst een JSON-back-up.",
          async () => {
            modal.close();
            draft = null;
            await cloud.connect();
            refreshCloudUI();
          },
          { label: "Sync inschakelen", danger: false },
        );
        break;
      case "cloud-sync":
        await cloud.sync();
        refreshCloudUI();
        break;
      case "cloud-conflicts":
        if (!cloud.engine?.pending) break;
        openModal(
          "Vergelijk je wijzigingen",
          "Geen stille overschrijving.",
          conflictBody(cloud.engine.pending, button),
          button("Annuleren", "close-modal") +
            button("Keuzes bewaren", "cloud-resolve", "primary"),
        );
        break;
      case "cloud-resolve": {
        const form = $("#sync-conflicts-form");
        if (!form.reportValidity()) break;
        const f = new FormData(form),
          choices = {};
        cloud.engine.pending.conflicts.forEach(
          (c, i) => (choices[c.key] = f.get("conflict-" + i)),
        );
        modal.close();
        draft = null;
        await cloud.resolve(choices);
        refreshCloudUI();
        break;
      }
      case "cloud-recovery": {
        const snap = cloud.engine.pending[el.dataset.side];
        downloadText(
          "Helder_sync_" + el.dataset.side + ".json",
          JSON.stringify(localFromCloud(snap, state), null, 2),
          "application/json",
        );
        break;
      }
      case "cloud-logout":
        confirmModal(
          "Afmelden en lokale kopie wissen?",
          "De cloudcollectie blijft bestaan. Kaarten en voortgang in deze browser worden gewist, ook wijzigingen die nog niet gesynchroniseerd zijn. Download eerst een JSON-back-up wanneer je die wilt bewaren.",
          async () => {
            modal.close();
            draft = null;
            clearTimeout(cloud.timer);
            cloud.engine?.cancel();
            await mutate(
              (next) => {
                const revision = next.revision;
                Object.keys(next).forEach((k) => delete next[k]);
                Object.assign(next, emptyCollection(), {
                  revision,
                  seeded: true,
                });
              },
              { remote: true },
            );
            await cloud.signOut();
            location.hash = "#/today";
            renderApp();
          },
          { label: "Afmelden & lokaal wissen", danger: true },
        );
        break;
      case "new-set":
        openBuilder({ folderId: el.dataset.folder });
        break;
      case "add-cards":
        openBuilder({ setId: id });
        break;
      case "new-folder":
        openFolderEditor();
        break;
      case "edit-folder":
        openFolderEditor(id);
        break;
      case "toggle-folder":
        ui.collapsed.has(id) ? ui.collapsed.delete(id) : ui.collapsed.add(id);
        renderSidebar();
        break;
      case "page-prev":
        ui.page = Math.max(0, ui.page - 1);
        renderApp();
        break;
      case "page-next":
        ui.page++;
        renderApp();
        break;
      case "start-learn":
        startStudy(getActionScope(el));
        break;
      case "start-explore":
        startStudy(getActionScope(el), "explore");
        break;
      case "start-flash":
        startStudy(getActionScope(el), "flash");
        break;
      case "start-practice":
        startStudy(getActionScope(el), "learn", true);
        break;
      case "end-study":
        navigateBack();
        break;
      case "continue-learning":
        startStudy(session.scope);
        break;
      case "switch-flash":
        startStudy(session.scope, "flash");
        break;
      case "restart-flash":
        startStudy(session.scope, "flash");
        break;
      case "flip":
        session.revealed = !session.revealed;
        renderApp();
        break;
      case "flash-prev":
        session.index = Math.max(0, session.index - 1);
        session.revealed = false;
        renderApp();
        break;
      case "flash-next":
        session.index++;
        session.revealed = false;
        renderApp();
        break;
      case "flash-shuffle":
        session.queue = shuffle(session.queue);
        session.index = 0;
        session.revealed = false;
        renderApp();
        break;
      case "intro":
        if (session.exploration) {
          startExploration(session, state);
          renderApp();
          window.scrollTo(0, 0);
          break;
        }
        session.phase = "introduce";
        session.intro = true;
        session.introSeen = true;
        renderApp();
        break;
      case "intro-done": {
        const card = state.cards.find((c) => c.id === currentCardId(session)),
          note = state.notes.find((n) => n.id === card.noteId);
        session.intro = false;
        session.introSeen = true;
        if (note.learning?.choice && card.template === "forward") {
          session.phase = "choice";
          session.choiceOptions = recognitionOptions(note);
          session.choiceSelection = null;
        } else beginRecall(session);
        renderApp();
        window.scrollTo(0, 0);
        break;
      }
      case "reveal":
        session.revealed = true;
        renderApp();
        break;
      case "show-hint":
        session.hintUsed = true;
        renderApp();
        break;
      case "rate":
        await grade(Number(el.dataset.rating));
        break;
      case "undo-grade":
        await undoGrade();
        break;
      case "star-note":
        await mutate((next) => {
          const n = next.notes.find((n) => n.id === id);
          if (n) n.starred = !n.starred;
        });
        break;
      case "edit-note":
        openNoteEditor(id);
        break;
      case "edit-set":
        openSetEditor(id);
        break;
      case "close-modal":
        modal.close();
        draft = null;
        break;
      case "builder-tab":
        builderSync();
        draft.tab = el.dataset.tab;
        renderBuilder();
        break;
      case "draft-add": {
        const note = readNoteFields();
        validateNote(note);
        builderSync();
        draft.notes.push(note);
        draft.pending = null;
        renderBuilder();
        $("#note-front").focus();
        break;
      }
      case "draft-remove":
        builderSync();
        draft.notes.splice(Number(el.dataset.index), 1);
        renderBuilder();
        break;
      case "builder-save":
        el.disabled = true;
        try {
          await saveBuilder();
        } finally {
          el.disabled = false;
        }
        break;
      case "import-example":
        $("#import-text").value =
          "# Mijn filosofieset\n\n## Wat onderzoekt epistemologie?\ntags: kennisleer, niveau::1\n\nEpistemologie onderzoekt **kennis**: wat je weet, hoe je het weet en waarom je overtuiging goed onderbouwd is.\n\n---\n\n## Ervaringskennis heet {{c1::a posteriori}}.\ntype: cloze\ntags: kennisleer\n\nBijvoorbeeld: weten dat het regent doordat je naar buiten kijkt.";
        $("#import-format").value = "markdown";
        updateImportPreview();
        break;
      case "note-preview": {
        const note = readNoteFields();
        validateNote(note);
        const card = {
          template: note.kind === "cloze" ? "cloze:1" : "forward",
        };
        const face = faces(note, card);
        $("#note-preview").innerHTML =
          `<div class="preview-box"><span class="label">VRAAG</span><div class="answer-text">${markdown(face.question)}</div><hr class="answer-divider"><span class="label">ANTWOORD</span><div class="answer-text">${markdown(face.answer)}</div></div>`;
        break;
      }
      case "save-note": {
        const input = readNoteFields(),
          noteId = draft.id,
          note = state.notes.find((n) => n.id === noteId),
          reset = $("#note-reset").checked;
        validateNote(input);
        el.disabled = true;
        await mutate((next) =>
          upsertNote(next, note.setId, input, noteId, { reset }),
        );
        modal.close();
        draft = null;
        toast("Kaart bewaard.");
        break;
      }
      case "pause-note":
        await mutate((next) => {
          const cards = next.cards.filter((c) => c.noteId === id),
            paused = cards.every((c) => c.suspended);
          for (const c of cards) c.suspended = !paused;
        });
        el.innerHTML =
          icon("pause") +
          (state.cards.filter((c) => c.noteId === id).every((c) => c.suspended)
            ? "Hervatten"
            : "Pauzeren");
        break;
      case "delete-note":
        confirmModal(
          "Kaart verwijderen?",
          "Dit verwijdert de notitie, haar oefenkaarten en bijbehorende voortgang.",
          async () => {
            await mutate((next) => deleteNotes(next, [id]));
            modal.close();
            draft = null;
            toast("Kaart verwijderd.");
          },
        );
        break;
      case "save-set": {
        const title = $("#set-title").value.trim(),
          description = $("#set-description").value.trim(),
          folderId = $("#set-folder").value || null;
        if (!title) throw new Error("Geef je set een naam.");
        const setId = draft.id;
        const curriculum = {
          levels: labelMap($("#set-levels").value),
          chapters: labelMap($("#set-chapters").value),
        };
        await mutate((next) => {
          const s = next.sets.find((s) => s.id === setId);
          Object.assign(s, {
            title,
            description,
            folderId,
            curriculum,
            updatedAt: Date.now(),
          });
        });
        modal.close();
        draft = null;
        toast("Set bewaard.");
        break;
      }
      case "export-set": {
        const set = state.sets.find((s) => s.id === id),
          notes = state.notes.filter((n) => n.setId === id),
          md = el.dataset.format === "markdown",
          name = set.title.replace(/[^\p{L}\p{N} _-]/gu, "");
        downloadText(
          `${name}.${md ? "md" : "tsv"}`,
          md
            ? toMarkdown(set, notes, folderPath(state, set.folderId))
            : toTSV(notes),
        );
        toast("Export aangeboden als download.");
        break;
      }
      case "delete-set":
        confirmModal(
          "Set verwijderen?",
          "Alle kaarten en hun voortgang in deze set worden verwijderd. Andere sets blijven staan.",
          async () => {
            await mutate((next) => {
              deleteNotes(
                next,
                next.notes.filter((n) => n.setId === id).map((n) => n.id),
              );
              next.sets = next.sets.filter((s) => s.id !== id);
            });
            modal.close();
            draft = null;
            location.hash = "#/library";
            toast("Set verwijderd.");
          },
        );
        break;
      case "save-folder": {
        const name = $("#folder-name").value.trim(),
          parentId = $("#folder-parent").value || null,
          folderId = draft.id;
        if (!name) throw new Error("Geef de map een naam.");
        if (folderId && folderDescendants(state, folderId).has(parentId))
          throw new Error("Een map kan niet onder zichzelf worden geplaatst.");
        if (
          state.folders.some(
            (f) =>
              f.id !== folderId && f.name === name && f.parentId === parentId,
          )
        )
          throw new Error("Er bestaat al een map met deze naam op deze plek.");
        await mutate((next) => {
          if (folderId) {
            Object.assign(
              next.folders.find((f) => f.id === folderId),
              { name, parentId },
            );
          } else next.folders.push({ id: uid(), name, parentId });
        });
        modal.close();
        draft = null;
        toast("Map bewaard.");
        break;
      }
      case "delete-folder":
        confirmModal(
          "Map verwijderen?",
          "De map verdwijnt. Haar sets en submappen blijven bewaard en schuiven één niveau omhoog.",
          async () => {
            await mutate((next) => {
              const f = next.folders.find((f) => f.id === id);
              for (const s of next.sets)
                if (s.folderId === id) s.folderId = f.parentId;
              for (const child of next.folders)
                if (child.parentId === id) child.parentId = f.parentId;
              next.folders = next.folders.filter((f) => f.id !== id);
            });
            modal.close();
            draft = null;
            location.hash = "#/library";
            toast("Map verwijderd; sets en submappen bewaard.");
          },
        );
        break;
      case "confirm":
        el.disabled = true;
        await draft.callback();
        break;
      case "submit-settings":
        $("#settings-form").requestSubmit();
        break;
      case "backup":
        await exportBackup();
        break;
      case "restore":
        pickRestore();
        break;
      case "persist": {
        const result = await requestPersistentStorage();
        toast(
          result
            ? "De browser beschermt de opslag tegen automatisch opruimen. Maak nog steeds back-ups."
            : "De browser kon blijvende opslag niet toezeggen. Bewaar regelmatig een back-up.",
        );
        break;
      }
      case "install":
        if (installPrompt) {
          await installPrompt.prompt();
          await installPrompt.userChoice;
          installPrompt = null;
          renderApp();
        }
        break;
    }
  } catch (error) {
    if (modal.open && (local.includes(action) || action === "note-preview"))
      modalError(error);
    else errorMessage(error);
    el.disabled = false;
  }
}

function refreshCloudUI() {
  const indicator = document.querySelector(".cloud-status-button");
  if (indicator) {
    indicator.hidden = !cloud?.config;
    const text =
      {
        synced: "Gesynchroniseerd",
        syncing: "Sync bezig",
        pending: "Sync wacht",
        offline: "Offline wijzigingen",
        conflict: "Syncconflict",
        error: "Syncfout",
        "signed-out": "Aanmelden voor sync",
        unbound: "Sync inschakelen",
        "account-mismatch": "Account controleren",
      }[cloud?.phase] || "Je apparaten";
    indicator.setAttribute("aria-label", text + ". Je apparaten bekijken");
    indicator.title = text;
    indicator.dataset.phase = cloud?.phase || "local";
    indicator.innerHTML = icon(
      cloud?.phase === "synced" ? "devices" : "refresh",
    );
  }
  const panel = $("#cloud-panel");
  if (panel) panel.innerHTML = cloudPanel(cloud, button);
  document.querySelectorAll("[data-sync-state]").forEach((el) => {
    el.dataset.syncState = cloud?.phase ?? "local";
  });
}
async function recordActivity(cardId, form, success, extra = {}) {
  await mutate(
    (next) => {
      next.activities ??= [];
      next.activities.push({
        ...extra,
        id: uid(),
        cardId,
        form,
        success,
        time: Date.now(),
        day: localDay(),
        independent: false,
      });
    },
    { render: false },
  );
}
function startTransfer(scope) {
  session = createSession(state, scope, { mode: "learn", practice: true });
  session.transferOnly = true;
  if (currentCardId(session))
    session.application = {
      cardId: currentCardId(session),
      answer: "",
      revealed: false,
      fromRecall: false,
    };
  location.hash = "#/study";
  renderApp();
  window.scrollTo(0, 0);
}
async function markFlash(mark) {
  if (
    !session ||
    session.mode !== "flash" ||
    ui.grading ||
    !["known", "unknown"].includes(mark)
  )
    return;
  const id = currentCardId(session);
  if (!id) return;
  const previous = clone(session);
  previous.flashUndo = null;
  ui.grading = true;
  try {
    let old;
    await mutate(
      (next) => {
        const c = next.cards.find((c) => c.id === id);
        if (!c) throw new Error("Kaart verwijderd.");
        old = { mark: c.practiceMark ?? null, time: c.practiceAt ?? 0 };
        c.practiceMark = mark;
        c.practiceAt = Date.now();
      },
      { render: false },
    );
    session.flashMarks ??= {};
    session.flashMarks[id] = mark;
    session.flashUndo = { id, old, session: previous };
    session.index++;
    session.revealed = false;
    ui.grading = false;
    renderApp();
    window.scrollTo(0, 0);
  } catch (error) {
    ui.grading = false;
    renderApp();
    throw error;
  }
}
async function undoFlash() {
  const u = session?.flashUndo;
  if (!u || ui.grading) return;
  await mutate(
    (next) => {
      const c = next.cards.find((c) => c.id === u.id);
      if (c) {
        if (u.old.mark) c.practiceMark = u.old.mark;
        else delete c.practiceMark;
        c.practiceAt = u.old.time;
      }
    },
    { render: false },
  );
  session = u.session;
  session.flashUndo = null;
  renderApp();
  window.scrollTo(0, 0);
}
setupSwipe((mark) => markFlash(mark).catch(errorMessage));

document.addEventListener("click", handleClick);
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "study-answer" && session) session.answer = el.value;
  if (el.id === "explore-answer" && session?.exploration)
    session.exploration.answer = el.value;
  if (el.id === "application-answer" && session?.application)
    session.application.answer = el.value;
  if (el.dataset.liveSearch) {
    ui.query = el.value;
    ui.page = 0;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderApp({ keepFocus: true }), 150);
  }
  if (el.id === "import-text") {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(updateImportPreview, 180);
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  try {
    if (el.id === "daily-limit") $("#new-per-day").disabled = !el.checked;
    if (el.id === "level-filter" || el.id === "chapter-filter") {
      ui[el.id === "level-filter" ? "level" : "chapter"] = el.value;
      ui.page = 0;
      renderApp();
    }
    if (el.id === "tag-filter") {
      ui.tag = el.value;
      ui.page = 0;
      renderApp();
    }
    if (el.id === "import-format") updateImportPreview();
    if (el.id === "import-file" && draft?.type === "builder") {
      const file = el.files?.[0];
      if (!file) return;
      if (file.size > 5_000_000)
        throw new Error("Bestand te groot (maximaal 5 MB).");
      $("#import-text").value = await file.text();
      if (file.name.endsWith(".md")) $("#import-format").value = "markdown";
      else if (file.name.endsWith(".tsv")) $("#import-format").value = "tsv";
      else if (file.name.endsWith(".csv")) $("#import-format").value = "csv";
      else $("#import-format").value = "auto";
      updateImportPreview();
    }
  } catch (error) {
    modalError(error);
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.id === "email-auth-form") {
    await submitEmail(event);
    return;
  }
  if (event.target.id !== "settings-form") return;
  event.preventDefault();
  try {
    const f = new FormData(event.target);
    const settings = {
      newPerDay: Number(f.get("newPerDay") ?? state.settings.newPerDay),
      dailyLimit: f.get("dailyLimit") === "on",
      scaffold: f.get("scaffold") === "on",
      exploreSize: Number(f.get("exploreSize") ?? 3),
      application: f.get("application") === "on",
      sessionSize: Number(f.get("sessionSize")),
      retention: Number(f.get("retention")),
      answerMode: f.get("answerMode"),
      theme: f.get("theme"),
      mix: f.get("mix") === "on",
    };
    validateCollection({ ...state, settings });
    await mutate((next) => (next.settings = settings));
    toast("Instellingen bewaard.");
  } catch (error) {
    errorMessage(error);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
    closeNav();
    return;
  }
  if (modal.open || route().type !== "study" || !session || ui.grading) return;
  const typing =
    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
    event.target.isContentEditable;
  if (session.mode === "flash" && !typing) {
    if (event.key === " ") {
      event.preventDefault();
      session.revealed = !session.revealed;
      renderApp();
    } else if (event.key === "ArrowRight") {
      $(
        event.altKey
          ? '[data-action="flash-next"]'
          : '[data-action="flash-mark"][data-mark="known"]',
      )?.click();
    } else if (event.key === "ArrowLeft") {
      $(
        event.altKey
          ? '[data-action="flash-prev"]'
          : '[data-action="flash-mark"][data-mark="unknown"]',
      )?.click();
    } else if (
      event.key === "Enter" &&
      event.target.classList.contains("flip-surface")
    ) {
      event.preventDefault();
      $('[data-action="flip"]')?.click();
    }
    return;
  }
  if (
    session.exploration ||
    session.intro ||
    session.phase === "orient" ||
    session.phase === "choice" ||
    session.application
  )
    return;
  if (
    !session.revealed &&
    ((event.key === "Enter" && (event.ctrlKey || event.metaKey)) ||
      (!typing && event.key === " "))
  ) {
    event.preventDefault();
    $('[data-action="reveal"]')?.click();
  } else if (
    session.revealed &&
    !typing &&
    ["1", "2", "3", "4"].includes(event.key)
  ) {
    event.preventDefault();
    $(`[data-rating="${event.key}"]`)?.click();
  }
});
setupInterface();
window.addEventListener("hashchange", () => {
  ui.query = "";
  ui.tag = "";
  ui.level = "";
  ui.chapter = "";
  ui.detailTab = "overview";
  ui.page = 0;
  closeNav();
  if (state) renderApp();
  cloud?.sync().catch(() => {});
  window.scrollTo(0, 0);
});
modal.addEventListener("close", () => {
  draft = null;
});
window.addEventListener("beforeunload", (event) => {
  if (
    modal.open &&
    draft &&
    ["builder", "note", "set", "folder"].includes(draft.type)
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});
channel?.addEventListener("message", (event) => {
  if (state && event.data.revision > state.revision)
    toast(
      "Je collectie is gewijzigd in een andere tab. Herlaad voordat je verdergaat.",
      { action: "reload", label: "Herlaad", sticky: true },
    );
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (route().type === "settings") renderApp();
});
async function boot() {
  if (location.protocol === "file:") {
    main.innerHTML = `<div class="page narrow"><h1>Start Helder via de lokale server.</h1><div class="readable"><p>De app gebruikt modules, lokale opslag en offline caching. Dubbelklikken op index.html werkt daarom niet.</p><p>Open een terminal in deze map en voer uit:</p><pre>node server.mjs</pre><p>Of, als je Python gebruikt:</p><pre>python start.py</pre><p>Open daarna <strong>http://localhost:4173</strong>.</p></div></div>`;
    return;
  }
  try {
    const saved = await loadCollection();
    state = saved ? validateCollection(saved) : emptyCollection();
    if (!saved) {
      try {
        const response = await fetch("./data/starter.json?v=3.1.0");
        if (!response.ok) throw new Error("Starterbestand ontbreekt.");
        const starters = await response.json();
        for (const data of starters) {
          const set = newSet(state, {
            title: data.title,
            description: data.description,
            folderId: ensureFolderPath(state, data.folderPath),
          });
          for (const note of data.notes) upsertNote(state, set.id, note);
        }
        state.seeded = true;
      } catch (error) {
        console.warn("Startmateriaal niet geladen:", error);
        toast("Startmateriaal niet geladen. Je kunt wel eigen sets maken.", {
          error: true,
        });
      }
      state.revision = 1;
      await saveCollection(state, 0);
    }
    cloud = new CloudConnection({
      getLocal: () => state,
      canSync: () =>
        !modal.open &&
        route().type !== "study" &&
        document.visibilityState === "visible",
      applyLocal: async (next, expected) => {
        await mutate(
          (current) => {
            if (current.revision !== expected) throw new LocalChangedError();
            const revision = current.revision;
            Object.keys(current).forEach((k) => delete current[k]);
            Object.assign(current, next, { revision });
          },
          { render: false, remote: true },
        );
        renderApp();
      },
      onStatus: refreshCloudUI,
    });
    cloud.start();
    applyTheme();
    if (!location.hash) location.hash = "#/today";
    renderApp();
    refreshTimer = setInterval(() => {
      if (
        route().type === "today" &&
        !modal.open &&
        document.visibilityState === "visible"
      )
        renderApp();
      if (
        route().type === "study" &&
        session &&
        !currentCardId(session) &&
        !modal.open
      ) {
        const before = $("#pending-time")?.dataset.due;
        if (
          before &&
          Number(before) <= Date.now() &&
          !$('.finish-card [data-action="continue-learning"]')
        )
          renderApp();
      }
    }, 15000);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js", {
          updateViaCache: "none",
        });
        observeOfflineInstallation(registration);
        // Registering the same worker URL can defer an update check. Check now,
        // but keep a working cached app usable when the network is unavailable.
        registration.update().catch(() => {});
      } catch (error) {
        console.warn("Offlinecache niet beschikbaar:", error);
      }
    }
  } catch (error) {
    main.innerHTML = `<div class="page narrow"><h1>Je bibliotheek kon niet worden geopend.</h1><div class="note-banner error"><p>${e(error.message)}</p></div><div class="readable"><p>Er is niets overschreven. Probeer een recente browser buiten de privémodus, sluit andere Helder-tabs, en herlaad.</p>${button("Opnieuw proberen", "reload", "primary")}</div></div>`;
    console.error(error);
  }
}
boot();
