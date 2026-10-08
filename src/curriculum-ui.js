import { escapeHTML as e, countLabel } from "./utils.js?v=3.0.0";
import { icon } from "./icons.js?v=3.0.0";
import {
  scopeNotes,
  scopeCards,
  stats,
  folderDescendants,
} from "./model.js?v=3.0.0";
import {
  progressFor,
  structureFor,
  levelLabel,
  chapterLabel,
} from "./curriculum.js?v=3.0.0";
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
              s = stats(state, sc);
            return `<button class="level-card ${ui.level === value ? "selected" : ""}" data-action="select-level" data-level="${e(value)}" aria-pressed="${ui.level === value}"><span class="level-index">${String(index + 1).padStart(2, "0")}</span><span class="level-title">${e(levelLabel(set, value))}</span><span class="small muted">${countLabel(p.total, "kaart", "kaarten")}${s.due ? ` · ${s.due} herhalen` : ""}</span>${progressStrip(state, sc, { labels: false })}<span class="level-status">${p.spaced ? `${p.spaced} gespreid opgehaald` : p.building ? `${p.building} in opbouw` : "Nog te ontdekken"} ${icon("arrow")}</span></button>`;
          })
          .join(
            "",
          )}</div><div class="level-filter-row"><button class="text-button" data-action="select-level" data-level="" ${!ui.level ? "disabled" : ""}>Alle niveaus</button><p class="small muted">${ui.level ? e(levelLabel(set, ui.level)) + " geselecteerd" : "Nieuwe kaarten beginnen bij het laagste niveau."}</p></div>`
      : ""
  }
  <div class="section-head compact"><h3>${chapters.length ? "Hoofdstukken" : "Je selectie"}</h3><span class="small muted">${notes.length} notities</span></div>
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
      return `<article class="chapter-row"><div class="chapter-symbol">${icon("book")}</div><button class="chapter-open" data-action="select-chapter" data-chapter="${e(value)}"><strong>${e(chapterLabel(set, value === "__none" ? "" : value))}</strong><span>${countLabel(s.total, "kaart", "kaarten")} · ${s.due ? `${s.due} te herhalen` : p.spaced ? `${p.spaced} gespreid opgehaald` : "Op jouw tempo"}</span></button>${button("Leren", "start-learn", "chapter-learn", actionScope(sc) + ` aria-label="${e(chapterLabel(set, value === "__none" ? "" : value))} leren"`, "play")}<button class="icon-button" data-action="select-chapter" data-chapter="${e(value)}" aria-label="${e(chapterLabel(set, value === "__none" ? "" : value))} bekijken">${icon("chevron")}</button></article>`;
    })
    .join("")}</div>
  <p class="small muted evidence-disclaimer">“Gespreid opgehaald” = op minstens twee verschillende dagen, met minstens 24 uur ertussen, zonder hulp als correct beoordeeld. Geen garantie op begrip of examenresultaat.</p></section>`;
}
export function folderTile(state, folder) {
  const ids = folderDescendants(state, folder.id),
    sets = state.sets.filter((s) => ids.has(s.folderId));
  const p = progressFor(state, { type: "folder", id: folder.id });
  return `<a class="subject-tile" href="#/folder/${encodeURIComponent(folder.id)}"><span class="subject-symbol">${icon("folder")}</span><div><strong>${e(folder.name)}</strong><p>${sets.length} ${sets.length === 1 ? "set" : "sets"} · ${countLabel(p.total, "kaart", "kaarten")}</p></div>${icon("chevron")}</a>`;
}
