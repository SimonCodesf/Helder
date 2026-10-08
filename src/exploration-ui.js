import { escapeHTML as e } from "./utils.js?v=3.1.7";
import { markdown } from "./markdown.js?v=3.1.7";
import { icon } from "./icons.js?v=3.1.7";
import { faces } from "./model.js?v=3.1.7";

export function explorationScreen(state, session, { button, scopeTitle }) {
  const warm = session.exploration,
    card = state.cards.find((c) => c.id === warm.ids[warm.index]),
    note = state.notes.find((n) => n.id === card.noteId),
    set = state.sets.find((s) => s.id === note.setId),
    task = warm.task,
    bridge = warm.screen === "bridge";
  const shell = `<div class="study-page has-dock exploration-page"><header class="study-header"><button type="button" class="icon-button" data-action="end-study" aria-label="Stoppen">${icon("close")}</button><div class="study-context"><h1>Verkennen</h1><p>${e(set?.title ?? scopeTitle(session.scope))}</p></div><span class="study-counter">${warm.screen === "start" ? 0 : bridge ? warm.ids.length : warm.index + 1} <span>/ ${warm.ids.length}</span></span></header><progress class="study-progress" value="${warm.screen === "start" ? 0 : bridge ? warm.ids.length : warm.index}" max="${warm.ids.length}" aria-label="Verkenning van deze groep"></progress>`;
  if (warm.screen === "start")
    return (
      shell +
      `<section class="study-card exploration-intro"><h2>Eerst even verkennen.</h2><p>Bekijk ${warm.ids.length === 1 ? "deze kaart" : "deze " + warm.ids.length + " kaarten"} rustig voordat je jezelf test.</p></section><div class="study-dock reveal-dock">${button("Beginnen", "intro", "primary large", "", "arrow")}${button("Overslaan", "intro-skip", "ghost large")}</div></div>`
    );
  if (bridge)
    return (
      shell +
      `<section class="study-card exploration-bridge"><h2>Verkenning zit erop.</h2><p>Nu probeer je de kern zelf op te halen, zonder hulp.</p></section><div class="study-dock reveal-dock">${button(session.mode === "explore" ? "Verder" : "Zelf ophalen", "explore-finish", "primary large", "", "arrow")}</div></div>`
    );
  const head = `<div class="study-card-head"><span class="pill blue">${task.kind === "choice" ? "Meerkeuze" : task.kind === "reverse" ? "Welke term?" : "Uitleg"}</span><button class="icon-button${note.starred ? " is-starred" : ""}" data-action="star-note" data-id="${e(note.id)}" aria-label="${note.starred ? "Ster verwijderen" : "Ster toevoegen"}" aria-pressed="${!!note.starred}">${icon("star")}</button></div>`;
  let body, controls;
  if (task.kind === "choice") {
    const c = task.choice,
      picked = warm.selected;
    body = `<div class="question">${markdown(c.prompt)}</div><div class="choice-options">${warm.options.map((o, i) => `<button class="choice-option${warm.revealed && o.original === c.correct ? " correct" : ""}${warm.revealed && o.original === picked && picked !== c.correct ? " incorrect" : ""}" data-action="choose-answer" data-choice="${o.original}" ${warm.revealed ? "disabled" : ""}><span class="option-index">${String.fromCharCode(65 + i)}</span><span>${e(o.text)}</span>${warm.revealed && o.original === c.correct ? icon("check") : ""}${warm.revealed && o.original === picked && picked !== c.correct ? icon("close") : ""}</button>`).join("")}</div>${warm.revealed ? `<div class="choice-feedback"><strong>${picked === c.correct ? "Juist." : "Nog niet."}</strong></div>` : ""}`;
    controls = warm.revealed
      ? button("Verder", "explore-next", "primary large", "", "arrow")
      : button("Toon uitleg", "explore-explain", "ghost large", "", "book");
  } else if (task.kind === "reverse") {
    body = !warm.revealed
      ? `<div class="flip-surface" role="button" tabindex="0" data-action="explore-reveal" aria-label="Tik om de term te tonen"><div class="definition-cue answer-text">${markdown(task.definition)}</div><p class="flip-hint">Tik om de term te tonen</p></div>`
      : `<div class="definition-cue answer-text">${markdown(task.definition)}</div><hr class="answer-divider"><div class="question">${e(task.term)}</div><p class="flip-hint">Swipe: rechts is herkend · links nog niet</p>`;
    controls = !warm.revealed
      ? button("Toon term", "explore-reveal", "primary large", "", "arrow")
      : `<div class="swipe-actions">${button("Nog niet", "explore-rate", "", 'data-success="false"', "refresh")}${button("Herkend", "explore-rate", "primary", 'data-success="true"', "check")}</div>`;
  } else {
    const face = faces(note, card);
    body = !warm.revealed
      ? `<div class="flip-surface" role="button" tabindex="0" data-action="explore-reveal" aria-label="Tik om de vraag te tonen"><div class="answer-text">${markdown(face.answer)}</div><p class="flip-hint">Tik om de vraag te tonen</p></div>`
      : `<div class="answer-text">${markdown(face.answer)}</div><hr class="answer-divider"><div class="question">${markdown(face.question)}</div>`;
    controls = warm.revealed
      ? button(
          "Verder",
          "explore-rate",
          "primary large",
          'data-success="false"',
          "arrow",
        )
      : button(
          "Toon vraag",
          "explore-reveal",
          "primary large",
          "",
          "arrow",
        );
  }
  const swipeable = task.kind === "reverse" && warm.revealed;
  return (
    shell +
    `<section class="study-card exploration-card"${swipeable ? " data-swipe" : ""}>${swipeable ? `<span class="swipe-stamp known">${icon("check")} Herkend</span><span class="swipe-stamp unknown">${icon("refresh")} Nog niet</span>` : ""}${head}${body}</section><div class="study-dock reveal-dock">${controls}</div></div>`
  );
}
