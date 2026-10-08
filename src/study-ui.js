import { escapeHTML as e, intervalLabel, safeURL } from "./utils.js?v=3.0.0";
import { icon } from "./icons.js?v=3.0.0";
import { markdown } from "./markdown.js?v=3.0.0";
import { faces } from "./model.js?v=3.0.0";
import { previewRatings } from "./scheduler.js?v=3.0.0";
import { currentCardId } from "./study.js?v=3.0.0";
import { facet } from "./curriculum.js?v=3.0.0";
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
  let content = `<div class="study-page has-dock${flash ? " flash-page" : ""}"><header class="study-header">${button("Stoppen", "end-study", "ghost", "", "back")}<div class="study-context"><h1>${flash ? "Flashcards" : session.practice ? "Vrij oefenen" : "Leren"}</h1><p>${e(current?.title ?? scopeTitle(session.scope))}</p></div><span class="study-counter">${Math.min(done + 1, session.total)} <span>/ ${session.total}</span></span></header><progress class="study-progress" value="${done}" max="${Math.max(1, session.total)}" aria-label="Voortgang in deze ronde"></progress>`;
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
    const mark = session.flashMarks?.[id];
    return (
      content +
      `<section class="study-card flash-card" data-swipe><span class="swipe-stamp known">${icon("check")} Gekend</span><span class="swipe-stamp unknown">${icon("refresh")} Nog niet</span>${header}<div class="flip-surface" role="button" tabindex="0" data-action="flip" aria-label="Kaart omdraaien"><div class="${session.revealed ? "answer-text" : "question"}">${markdown(session.revealed ? face.answer : face.question)}</div><p class="flip-hint">${mark ? `Gemarkeerd als ${mark === "known" ? "gekend" : "nog niet gekend"}` : "Tik om te draaien. Swipes wijzigen je planning niet."}</p></div></section><div class="study-dock flash-dock"><div class="dock-heading"><p class="small muted">${Object.values(session.flashMarks ?? {}).filter((v) => v === "known").length} gekend · ${Object.values(session.flashMarks ?? {}).filter((v) => v === "unknown").length} nog niet</p><div class="flash-history-actions">${button("", "flash-prev", "icon-button", session.index === 0 ? 'disabled aria-label="Vorige kaart"' : 'aria-label="Vorige kaart"', "back")}${button("", "flash-next", "icon-button", 'aria-label="Kaart overslaan"', "chevron")}${button("", "flash-shuffle", "icon-button", 'aria-label="Kaarten husselen"', "shuffle")}</div></div><div class="flash-flip-row">${session.flashUndo ? button("", "undo-flash", "icon-button", 'aria-label="Laatste swipe ongedaan"', "undo") : ""}${button("Omdraaien", "flip", "primary large", "", "refresh")}</div><div class="swipe-actions">${button("Nog niet", "flash-mark", "unknown", 'data-mark="unknown"', "back")}${button("Gekend", "flash-mark", "known", 'data-mark="known"', "check")}</div></div></div>`
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
  content += `<section class="study-card">${header}`;
  if (session.phase === "orient")
    return (
      content +
      `<div class="step-caption">Nieuw · kies je startpunt</div><div class="question">${markdown(face.question)}</div><p class="study-prompt">Nog onbekend? Begin met de uitleg. Ken je dit al? Probeer het zonder hulp.</p><div class="learning-route"><span>${icon("book")} Begrijpen</span><span>${icon("target")} Zelf ophalen</span><span>${icon("bulb")} Toepassen</span></div></section><div class="study-dock reveal-dock">${button("Eerst kennismaken", "intro", "primary large", "", "book")}${button("Ik wil het zelf proberen", "intro-skip", "ghost large", "", "arrow")}</div></div>`
    );
  if (session.phase === "choice") {
    const c = note.learning.choice,
      picked = session.choiceSelection,
      revealed = picked != null;
    return (
      content +
      `<div class="step-caption">Oefenen met steun · nog geen geheugenmeting</div><div class="question">${markdown(c.prompt)}</div><div class="choice-options">${session.choiceOptions.map((o, index) => `<button class="choice-option${revealed && o.original === c.correct ? " correct" : ""}${revealed && o.original === picked && picked !== c.correct ? " incorrect" : ""}" data-action="choose-answer" data-choice="${o.original}" ${revealed ? "disabled" : ""}><span class="option-index">${String.fromCharCode(65 + index)}</span><span>${e(o.text)}</span>${revealed && o.original === c.correct ? icon("check") : ""}</button>`).join("")}</div>${revealed ? `<div class="choice-feedback ${picked === c.correct ? "positive" : ""}"><strong>${picked === c.correct ? "Juist herkend. Nu zelf ophalen." : "Nog niet. Bekijk wat het verschil is."}</strong><p>${e(c.feedback || "Het juiste antwoord is gemarkeerd. Leg aan jezelf uit waarom de andere opties niet passen.")}</p></div>` : `<p class="small muted">De antwoordopties helpen je nu. Daarna verdwijnen ze.</p>`}</section><div class="study-dock reveal-dock">${revealed ? button("Zonder opties proberen", "choice-done", "primary large", "", "arrow") : button("Liever zelf ophalen", "choice-skip", "ghost large", "", "arrow")}</div></div>`
    );
  }
  content += `<div class="step-caption">${session.intro ? "1 · Eerst begrijpen" : "Zelf ophalen · in je eigen woorden"}</div><div class="question">${markdown(face.question)}</div>`;
  if (session.intro)
    return (
      content +
      `<hr class="answer-divider"><div class="answer-label">De kern</div><div class="answer-text">${markdown(face.answer)}</div><p class="study-prompt">Lees de uitleg en zoek een verband met iets dat je kent. Daarna verdwijnt deze hulp.</p></section><div class="study-dock reveal-dock">${button(note.learning?.choice && card.template === "forward" ? "Verder: herkennen" : "Verbergen en zelf proberen", "intro-done", "primary large", "", "arrow")}<p class="small muted">Kennismaken is geen bewijs dat je dit later nog weet.</p></div></div>`
    );
  if (!session.revealed)
    return (
      content +
      `<p class="study-prompt">${state.settings.answerMode === "write" ? "Leg het uit zonder terug te kijken. De kern is genoeg." : "Beantwoord hardop of in je hoofd. Controleer daarna de inhoud."}</p>${state.settings.answerMode === "write" ? `<div class="study-answer-input"><label class="field-label" for="study-answer">Jouw antwoord</label><textarea id="study-answer" placeholder="Wat kun je zelf terughalen?" aria-describedby="answer-help">${e(session.answer)}</textarea><p id="answer-help" class="small muted">Andere woorden mogen. Geen automatische tekstbeoordeling.</p></div>` : ""}${session.hintUsed ? `<div class="hint-box">${e(note.hint)}</div>` : ""}<div class="study-controls">${note.hint && !session.hintUsed ? button("Een hint", "show-hint", "ghost", "", "bulb") : ""}${card.schedule.state === 0 && !session.introSeen ? button("Toch de uitleg bekijken", "intro", "ghost", "", "book") : ""}</div></section><div class="study-foot"><p>Je beoordeling wordt bewaard, niet je getypte antwoord.</p>${session.lastUndo ? button("Vorige beoordeling ongedaan", "undo-grade", "ghost", "", "undo") : ""}</div><div class="study-dock reveal-dock">${button("Controleer je antwoord", "reveal", "primary large", "", "arrow")}<p class="keyboard"><kbd>${state.settings.answerMode === "write" ? "Ctrl / ⌘ + Enter" : "Spatie"}</kbd> antwoord bekijken</p></div></div>`
    );
  const preview = previewRatings(card, state.settings.retention),
    help = session.hintUsed
      ? "Hint gebruikt? Kies Opnieuw."
      : session.introSeen
        ? "Net uitleg of opties gezien? Makkelijk is uitgeschakeld."
        : "Vergeten of onvolledig? Opnieuw. Correct met moeite? Moeilijk.";
  return (
    content +
    `${session.answer.trim() ? `<div class="your-answer"><span class="label">Jouw antwoord</span><p>${e(session.answer)}</p></div>` : ""}<hr class="answer-divider"><div class="answer-label">Modelantwoord</div><div class="answer-text">${markdown(face.answer)}</div>${safeURL(note.source) ? `<p class="source-link"><a href="${e(safeURL(note.source))}" target="_blank" rel="noopener noreferrer">Bron bekijken ${icon("arrow")}</a></p>` : ""}<details class="understanding"><summary>${icon("bulb")} Begripscheck ${icon("down")}</summary><p>${e(note.explain || "Geef een eigen voorbeeld. Welk verwant begrip lijkt erop, en wat is het verschil?")}</p></details></section><div class="study-dock grade-dock"><div class="dock-heading"><p class="grade-prompt">${session.practice ? "Hoe ging het? Geen herplanning." : "Hoe goed kon je dit zelf ophalen?"}</p>${session.lastUndo ? button("", "undo-grade", "icon-button", 'aria-label="Laatste beoordeling ongedaan"', "undo") : ""}</div><div class="grade-grid">${[
      [1, "Opnieuw", "again"],
      [2, "Moeilijk", "hard"],
      [3, "Goed", "good"],
      [4, "Makkelijk", "easy"],
    ]
      .map(
        ([r, label, cls]) =>
          `<button class="grade ${cls}" data-action="rate" data-rating="${r}" ${grading || (session.hintUsed && r !== 1) || (session.introSeen && r === 4) ? "disabled" : ""}><strong>${label}</strong><span>${session.practice ? "Vrij oefenen" : intervalLabel(preview[r].card.due)}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="grading-help">${help}</p><p class="keyboard"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> beoordelen</p></div></div>`
  );
}
