import { escapeHTML as e, intervalLabel, safeURL } from "./utils.js?v=3.1.11";
import { icon } from "./icons.js?v=3.1.11";
import { markdown } from "./markdown.js?v=3.1.11";
import { faces } from "./model.js?v=3.1.11";
import { previewRatings } from "./scheduler.js?v=3.1.11";
import { currentCardId } from "./study.js?v=3.1.11";
import { facet } from "./curriculum.js?v=3.1.11";
export function studyScreen(
  state,
  session,
  { button, scopeTitle, finishedView, grading },
) {
  const id = session.application?.cardId ?? currentCardId(session),
    card = state.cards.find((c) => c.id === id),
    note = state.notes.find((n) => n.id === card?.noteId);
  if (!card || !note) return finishedView();
  const face = faces(note, card),
    flash = session.mode === "flash",
    done = flash ? session.index : session.completed.length,
    current = state.sets.find((s) => s.id === note.setId);
  let content = `<div class="study-page has-dock${flash ? " flash-page" : ""}"><header class="study-header"><button type="button" class="icon-button" data-action="end-study" aria-label="Stoppen">${icon("close")}</button><div class="study-context"><h1>${flash ? "Flashcards" : session.practice ? "Oefenen" : "Leren"}</h1><p>${e(current?.title ?? scopeTitle(session.scope))}</p></div><span class="study-counter">${Math.min(done + 1, session.total)} <span>/ ${session.total}</span></span></header><progress class="study-progress" value="${done}" max="${Math.max(1, session.total)}" aria-label="Voortgang in deze ronde"></progress>`;
  const label = flash
    ? session.revealed
      ? "Antwoord"
      : "Vraag"
    : session.application
      ? "Toepassen"
      : session.phase === "choice"
        ? "Herkennen"
        : card.schedule.state === 0
          ? "Nieuw begrip"
          : "Herhaling";
  const header = `<div class="study-card-head"><div class="tags"><span class="pill blue">${label}</span>${facet(note, "niveau") ? `<span class="small muted">Niveau ${e(facet(note, "niveau"))}</span>` : ""}</div><button class="icon-button${note.starred ? " is-starred" : ""}" data-action="star-note" data-id="${e(note.id)}" aria-label="${note.starred ? "Ster verwijderen" : "Ster toevoegen"}" aria-pressed="${note.starred}">${icon("star")}</button></div>`;
  if (flash) {
    const marks = Object.values(session.flashMarks ?? {}),
      knownCount = marks.filter((v) => v === "known").length,
      unknownCount = marks.filter((v) => v === "unknown").length,
      mark = session.flashMarks?.[id];
    return (
      content +
      `<div class="flash-tally"><span class="tally-known">${icon("check")} ${knownCount} gekend</span><span class="tally-todo">${Math.max(0, session.total - done)} te gaan</span></div><section class="study-card flash-card" data-swipe><span class="swipe-stamp known">${icon("check")} Gekend</span><span class="swipe-stamp unknown">${icon("refresh")} Nog niet</span>${header}<div class="flip-surface" role="button" tabindex="0" data-action="flip" aria-label="Kaart omdraaien"><div class="${session.revealed ? "answer-text" : "question"}">${markdown(session.revealed ? face.answer : face.question)}</div><p class="flip-hint">${mark ? `Gemarkeerd als ${mark === "known" ? "gekend" : "nog niet gekend"}` : "Tik om te draaien · swipe om te sorteren"}</p></div></section><div class="study-dock flash-dock"><div class="dock-heading"><p class="small muted">${knownCount} gekend · ${unknownCount} nog niet</p><div class="flash-history-actions">${button("", "flash-prev", "icon-button", session.index === 0 ? 'disabled aria-label="Vorige kaart"' : 'aria-label="Vorige kaart"', "back")}${button("", "flash-next", "icon-button", 'aria-label="Kaart overslaan"', "chevron")}${button("", "flash-shuffle", "icon-button", 'aria-label="Kaarten husselen"', "shuffle")}</div></div><div class="flash-flip-row">${session.flashUndo ? button("", "undo-flash", "icon-button", 'aria-label="Laatste swipe ongedaan"', "undo") : ""}${button("Omdraaien", "flip", "primary large", "", "refresh")}</div><div class="swipe-actions">${button("Nog niet", "flash-mark", "unknown", 'data-mark="unknown"', "back")}${button("Gekend", "flash-mark", "known", 'data-mark="known"', "check")}</div></div></div>`
    );
  }
  if (session.application) {
    const task = session.application,
      a = note.learning?.application;
    const prompt =
      a?.prompt ||
      note.explain ||
      `Geef een nieuw voorbeeld van “${face.question}” en leg uit waarom dit erbij past.`;
    return (
      content +
      `<section class="study-card application-card">${header}<div class="step-caption">Een stap verder · verandert je planning niet</div><div class="question">${markdown(prompt)}</div>${!task.revealed ? `<p class="study-prompt">Pas het begrip toe. Gebruik niet alleen de definitie.</p><div class="study-answer-input"><label class="field-label" for="application-answer">Jouw redenering</label><textarea id="application-answer" placeholder="Hoe pak jij dit aan?">${e(task.answer ?? "")}</textarea></div>` : `${task.answer?.trim() ? `<div class="your-answer"><span class="label">Jouw redenering</span><p>${e(task.answer)}</p></div>` : ""}<hr class="answer-divider"><div class="answer-label">${a ? "Voorbeeldredenering" : "Controleer je redenering"}</div><div class="answer-text">${markdown(a?.answer || face.answer)}</div>${a?.rubric?.length ? `<div class="rubric"><h3>Kernpunten</h3><ul>${a.rubric.map((v) => `<li>${e(v)}</li>`).join("")}</ul></div>` : `<p class="small muted">Past je voorbeeld echt bij het begrip? Kun je uitleggen waarom? Dit wordt niet automatisch goedgekeurd.</p>`}`}</section><div class="study-dock reveal-dock">${task.revealed ? `<p class="grade-prompt">Klopt je toepassing inhoudelijk? Jij vergelijkt.</p><div class="swipe-actions">${button("Nog oefenen", "application-rate", "", 'data-success="false"', "refresh")}${button("Gelukt", "application-rate", "primary", 'data-success="true"', "check")}</div>` : button("Vergelijk je redenering", "application-reveal", "primary large", "", "arrow")}<p class="small muted">Toepassen is een aparte vaardigheid, geen extra FSRS-rating.</p></div></div>`
    );
  }
  if (!flash && !session.application) {
    const remaining = session.queue
        .map((qid) => state.cards.find((c) => c.id === qid))
        .filter(Boolean),
      fresh = remaining.filter((c) => c.schedule.state === 0).length,
      warmed = (session.warmedIds ?? []).length,
      rated = [0, 0, 0, 0, 0];
    for (const done of session.completed)
      if (done.rating >= 1 && done.rating <= 4) rated[done.rating]++;
    const chips = [
      [1, "opnieuw", "tally-again"],
      [2, "moeilijk", "tally-hard"],
      [3, "goed", "tally-good"],
      [4, "makkelijk", "tally-easy"],
    ]
      .filter(([r]) => rated[r] > 0)
      .map(
        ([r, label, cls]) =>
          `<span class="${cls}">${rated[r]} ${label}</span>`,
      )
      .join(" · ");
    content += `<p class="study-stats">${warmed ? `${warmed} verkend · ` : ""}${fresh} nieuw · ${remaining.length - fresh} te herhalen${chips ? ` · ${chips}` : ""}</p>`;
  }
  content += `<section class="study-card">${header}`;
  if (session.phase === "orient")
    return (
      content +
      `<div class="question">${markdown(face.question)}</div></section><div class="study-dock reveal-dock">${button("Bekijk uitleg", "intro", "primary large", "", "book")}${button("Zelf proberen", "intro-skip", "ghost large", "", "arrow")}</div></div>`
    );
  if (session.phase === "choice") {
    const c = note.learning.choice,
      picked = session.choiceSelection,
      revealed = picked != null;
    return (
      content +
      `<div class="question">${markdown(c.prompt)}</div><div class="choice-options">${session.choiceOptions.map((o, index) => `<button class="choice-option${revealed && o.original === c.correct ? " correct" : ""}${revealed && o.original === picked && picked !== c.correct ? " incorrect" : ""}" data-action="choose-answer" data-choice="${o.original}" ${revealed ? "disabled" : ""}><span class="option-index">${String.fromCharCode(65 + index)}</span><span>${e(o.text)}</span>${revealed && o.original === c.correct ? icon("check") : ""}</button>`).join("")}</div>${revealed ? `<div class="choice-feedback ${picked === c.correct ? "positive" : ""}"><strong>${picked === c.correct ? "Juist." : "Nog niet."}</strong></div>` : ``}</section><div class="study-dock reveal-dock">${revealed ? button("Verder", "choice-done", "primary large", "", "arrow") : button("Zelf ophalen", "choice-skip", "ghost large", "", "arrow")}</div></div>`
    );
  }
  if (session.intro)
    return (
      content +
      `<div class="question">${markdown(face.question)}</div><hr class="answer-divider"><div class="answer-label">De kern</div><div class="answer-text">${markdown(face.answer)}</div></section><div class="study-dock reveal-dock">${button(note.learning?.choice && card.template === "forward" ? "Verder" : "Zelf proberen", "intro-done", "primary large", "", "arrow")}</div></div>`
    );
  if (!session.revealed)
    return (
      content +
      `<div class="flip-surface learn-flip" role="button" tabindex="0" data-action="reveal" aria-label="Tik om het antwoord te tonen"><div class="question">${markdown(face.question)}</div><p class="flip-hint">Tik om het antwoord te tonen</p></div>${state.settings.answerMode === "write" ? `<div class="study-answer-input"><label class="field-label" for="study-answer">Jouw antwoord</label><textarea id="study-answer" placeholder="Wat kun je zelf terughalen?">${e(session.answer)}</textarea></div>` : ""}${session.hintUsed ? `<div class="hint-box">${e(note.hint)}</div>` : ""}${note.hint && !session.hintUsed ? `<div class="study-controls">${button("Hint", "show-hint", "ghost", "", "bulb")}</div>` : ""}</section></div>`
    );
  const preview = previewRatings(card, state.settings.retention);
  return (
    content +
    `<div class="question">${markdown(face.question)}</div>${session.answer.trim() ? `<div class="your-answer"><span class="label">Jouw antwoord</span><p>${e(session.answer)}</p></div>` : ""}<hr class="answer-divider"><div class="answer-label">Antwoord</div><div class="answer-text">${markdown(face.answer)}</div>${safeURL(note.source) ? `<p class="source-link"><a href="${e(safeURL(note.source))}" target="_blank" rel="noopener noreferrer">Bron</a></p>` : ""}</section><div class="study-dock grade-dock"><div class="dock-heading"><p class="grade-prompt">Hoe ging het?</p>${session.lastUndo ? button("", "undo-grade", "icon-button", 'aria-label="Laatste beoordeling ongedaan"', "undo") : ""}</div><div class="grade-grid">${[
      [1, "Opnieuw", "again"],
      [2, "Moeilijk", "hard"],
      [3, "Goed", "good"],
      [4, "Makkelijk", "easy"],
    ]
      .map(
        ([r, label, cls]) =>
          `<button class="grade ${cls}" data-action="rate" data-rating="${r}" ${grading || (session.hintUsed && r !== 1) || (session.introSeen && r === 4) ? "disabled" : ""}><strong>${label}</strong><span class="grade-interval">${session.practice ? "Oefenen" : intervalLabel(preview[r].card.due)}</span></button>`,
      )
      .join(
        "",
      )}</div></div></div>`
  );
}
