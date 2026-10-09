import { escapeHTML as e, countLabel } from "./utils.js?v=3.1.35";
import { icon } from "./icons.js?v=3.1.35";
import {
  scopeNotes,
  scopeCards,
  stats,
  folderDescendants,
} from "./model.js?v=3.1.35";
import {
  progressFor,
  structureFor,
  levelLabel,
  chapterLabel,
} from "./curriculum.js?v=3.1.35";
export function progressStrip(state, scope, { labels = true } = {}) {
  const p = progressFor(state, scope);
  return `<div class="evidence"><div class="evidence-track" role="img" aria-label="${p.new} nieuw, ${p.building} in opbouw, ${p.spaced} op meerdere dagen correct beoordeeld">${p.total ? `<span class="evidence-spaced" style="width:${(p.spaced / p.total) * 100}%"></span><span class="evidence-building" style="width:${(p.building / p.total) * 100}%"></span>` : ""}</div>${labels ? `<div class="evidence-key"><span><i class="key-building"></i>${p.building} in opbouw</span><span><i class="key-spaced"></i>${p.spaced} gespreid opgehaald</span></div>` : ""}</div>`;
}
export function courseStructure(state, set, ui, button, actionScope) {
  const scope = { type: "set", id: set.id },
    structure = structureFor(state, scope);
  if (!structure.levels.length && !structure.chapters.length) return "";
  const baseScope = { ...scope, level: ui.level };
  const notes = scopeNotes(state, baseScope),
    chapters = structureFor(state, baseScope).chapters;
  return `<section class="curriculum-section" aria-labelledby="structure-title"><div class="section-head"><div><h2 id="structure-title">De opbouw van je vak</h2><p class="section-caption">Kies een niveau. Je herhalingen blijven gewoon ingepland.</p></div></div>
  ${
    structure.levels.length
      ? `<div class="level-grid">${structure.levels
          .map((value, index) => {
            const sc = { ...scope, level: value },
              p = progressFor(state, sc),
              s = stats(state, sc),
              open = s.due + s.newToday + s.learning,
              sub = [`${countLabel(p.total, "kaart", "kaarten")}`];
            if (s.due) sub.push(`${s.due} herhalen`);
            if (s.newToday) sub.push(`${s.newToday} nieuw`);
            if (s.learning) sub.push(`${s.learning} in leren`);
            const idx = `<span class="level-index">${String(index + 1).padStart(2, "0")}</span>`;
            return `<article class="level-card ${ui.level === value ? "selected" : ""}">${idx}<button class="level-main" data-action="select-level" data-level="${e(value)}" aria-pressed="${ui.level === value}" aria-label="${e(levelLabel(set, value))} filteren"><span class="level-title">${e(levelLabel(set, value))}</span><span class="small muted">${sub.join(" · ")}</span></button>${open ? `<button class="icon-button level-play" data-action="start-learn" ${actionScope({ ...scope, level: value })} aria-label="${e(levelLabel(set, value))} leren">${icon("play")}</button>` : ""}</article>`;
          })
          .join(
            "",
          )}</div><div class="level-filter-row"><button class="text-button" data-action="select-level" data-level="" ${!ui.level ? "disabled" : ""}>Alle niveaus</button><p class="small muted">${ui.level ? e(levelLabel(set, ui.level)) + " geselecteerd" : "Nieuwe kaarten beginnen bij het laagste niveau."}</p></div>`
      : ""
  }
  <div class="section-head compact"><h3>${chapters.length ? "Hoofdstukken" : "Je selectie"}</h3><button class="text-button" data-action="edit-names" data-id="${e(set.id)}">Namen aanpassen</button><span class="small muted">${notes.length} notities</span></div>
  <div class="chapter-list">${[
    ...chapters,
    ...(notes.some((n) => !n.tags.some((t) => t.startsWith("hoofdstuk::")))
      ? ["__none"]
      : []),
  ]
    .map((value) => {
      const sc = { ...baseScope, chapter: value },
        s = stats(state, sc),
        p = progressFor(state, sc);
      return `<article class="chapter-row"><div class="chapter-symbol">${icon("book")}</div><button class="chapter-open" data-action="select-chapter" data-chapter="${e(value)}"><strong>${e(chapterLabel(set, value === "__none" ? "" : value))}</strong><span>${countLabel(s.total, "kaart", "kaarten")} · ${s.due ? `${s.due} te herhalen` : p.spaced ? `${p.spaced} gespreid opgehaald` : "Op jouw tempo"}</span>${groupStrip(state, sc)}</button>${button("Leren", "start-learn", "chapter-learn", actionScope(sc) + ` aria-label="${e(chapterLabel(set, value === "__none" ? "" : value))} leren"`, "play")}<button class="icon-button" data-action="select-chapter" data-chapter="${e(value)}" aria-label="${e(chapterLabel(set, value === "__none" ? "" : value))} bekijken">${icon("chevron")}</button></article>`;
    })
    .join("")}</div>
  <p class="small muted evidence-disclaimer">“Gespreid opgehaald” = op minstens twee verschillende dagen, met minstens 24 uur ertussen, zonder hulp als correct beoordeeld. Geen garantie op begrip of examenresultaat.</p></section>`;
}

export function groupStrip(state, scope) {
  // One segment per term, colored by status: gray without a rating, then
  // the last FSRS rating. A fully green bar means everything is Makkelijk.
  const cards = scopeCards(state, scope);
  if (!cards.length) return "";
  const last = new Map();
  for (const r of state.reviews) {
    const prev = last.get(r.cardId);
    if (!prev || r.time >= prev.time) last.set(r.cardId, r);
  }
  const counts = [0, 0, 0, 0, 0];
  for (const c of cards) {
    const l = last.get(c.id);
    counts[l && l.rating >= 1 && l.rating <= 4 ? l.rating : 0]++;
  }
  const words = [
    `${counts[0]} zonder oordeel`,
    `${counts[1]} opnieuw`,
    `${counts[2]} moeilijk`,
    `${counts[3]} goed`,
    `${counts[4]} makkelijk`,
  ];
  return `<span class="groups"><span class="groups-track" role="img" aria-label="${words.join(", ")}">${counts.map((n, i) => (n ? `<span class="g${i}" style="width:${(n / cards.length) * 100}%" title="${words[i]}"></span>` : "")).join("")}</span></span>`;
}
export function folderTile(state, folder) {
  const ids = folderDescendants(state, folder.id),
    sets = state.sets.filter((s) => ids.has(s.folderId));
  const p = progressFor(state, { type: "folder", id: folder.id });
  return `<a class="subject-tile" href="#/folder/${encodeURIComponent(folder.id)}"><span class="subject-symbol">${icon("folder")}</span><div><strong>${e(folder.name)}</strong><p>${sets.length} ${sets.length === 1 ? "set" : "sets"} · ${countLabel(p.total, "kaart", "kaarten")}</p></div>${icon("chevron")}</a>`;
}
