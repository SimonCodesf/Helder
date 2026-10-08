import { escapeHTML as e } from "./utils.js?v=3.1.2";
import { markdown } from "./markdown.js?v=3.1.2";
import { icon } from "./icons.js?v=3.1.2";
import { faces } from "./model.js?v=3.1.2";

export function explorationScreen(state, session, { button, scopeTitle }) {
  const warm = session.exploration,
    card = state.cards.find((c) => c.id === warm.ids[warm.index]),
    note = state.notes.find((n) => n.id === card.noteId),
    set = state.sets.find((s) => s.id === note.setId),
    task = warm.task,
    bridge = warm.screen === "bridge";
  const shell = `<div class="study-page has-dock exploration-page"><header class="study-header">${button("Stoppen", "end-study", "ghost", "", "back")}<div class="study-context"><h1>Verkennen</h1><p>${e(set?.title ?? scopeTitle(session.scope))}</p></div><span class="study-counter">${warm.screen === "start" ? 0 : bridge ? warm.ids.length : warm.index + 1} <span>/ ${warm.ids.length}</span></span></header><progress class="study-progress" value="${warm.screen === "start" ? 0 : bridge ? warm.ids.length : warm.index}" max="${warm.ids.length}" aria-label="Verkenning van deze groep"></progress>`;
  const route = `<ol class="lesson-steps" aria-label="Leerroute"><li class="active"><span>1</span>Verkennen</li><li><span>2</span>Zelf ophalen</li><li><span>3</span>Later herhalen</li></ol>`;
  if (warm.screen === "start")
    return (
      shell +
      `<section class="study-card exploration-intro"><div class="warm-symbol">${icon("book")}</div><div class="step-caption">Een kleine groep · op jouw tempo</div><h2>Eerst even verkennen.</h2><p>Ontdek ${warm.ids.length === 1 ? "deze kaart" : "deze " + warm.ids.length + " kaarten"} voordat je alles zelf moet uitleggen. Met beschikbare meerkeuzevragen, definities en voorbeelden.</p>${route}<p class="small muted">Geen cijfer of geheugenmeting. Bij een fout zie je meteen de uitleg. Bekende stof mag je overslaan.</p></section><div class="study-dock reveal-dock">${button("Begin verkennen", "intro", "primary large", "", "arrow")}${button(session.mode === "explore" ? "Deze groep overslaan" : "Liever meteen zelf ophalen", "intro-skip", "ghost large")}</div></div>`
    );
  if (bridge)
    return (
      shell +
      `<section class="study-card exploration-bridge"><div class="warm-symbol">${icon("check")}</div><div class="step-caption">De eerste verkenning zit erop</div><h2>${session.mode === "explore" ? "Geef de kern betekenis." : "Nu verdwijnt de steun."}</h2><p>${session.mode === "explore" ? "Kun je een voorbeeld bedenken, of een verband leggen met iets dat je al weet?" : "Je hebt de kaarten in verschillende vormen bekeken. De uitleg en opties verdwijnen; daarna probeer je de kern zelf op te halen."}</p>${route}<p class="small muted">Deze opwarming telt niet als zelfstandig onthouden. Alleen echte ophaalpogingen krijgen een FSRS-beoordeling.</p></section><div class="study-dock reveal-dock">${button(session.mode === "explore" ? "Verkenning vervolgen" : "Start zelf ophalen", "explore-finish", "primary large", "", "arrow")}</div></div>`
    );
  const head = `<div class="study-card-head"><span class="pill blue">${task.kind === "choice" ? "Meerkeuze · met steun" : task.kind === "reverse" ? "Definitie → term" : "Uitleg ontdekken"}</span><button class="icon-button${note.starred ? " is-starred" : ""}" data-action="star-note" data-id="${e(note.id)}" aria-label="${note.starred ? "Ster verwijderen" : "Ster toevoegen"}" aria-pressed="${!!note.starred}">${icon("star")}</button></div>`;
  let body, controls;
  if (task.kind === "choice") {
    const c = task.choice,
      picked = warm.selected;
    body = `<div class="step-caption">Probeer het eerst · fouten mogen hier</div><div class="question">${markdown(c.prompt)}</div><div class="choice-options">${warm.options.map((o, i) => `<button class="choice-option${warm.revealed && o.original === c.correct ? " correct" : ""}${warm.revealed && o.original === picked && picked !== c.correct ? " incorrect" : ""}" data-action="choose-answer" data-choice="${o.original}" ${warm.revealed ? "disabled" : ""}><span class="option-index">${String.fromCharCode(65 + i)}</span><span>${e(o.text)}</span>${warm.revealed && o.original === c.correct ? icon("check") : ""}${warm.revealed && o.original === picked && picked !== c.correct ? icon("close") : ""}</button>`).join("")}</div>${warm.revealed ? `<div class="choice-feedback"><strong>${picked === c.correct ? "Juist herkend." : "Nog niet — vergelijk het verschil."}</strong><p>${e(c.feedback || "De juiste optie is gemarkeerd. Kijk wat de andere opties onderscheidt.")}</p></div><details class="understanding"><summary>${icon("book")} De uitleg erbij ${icon("down")}</summary><div class="answer-text">${markdown(faces(note, card).answer)}</div></details>` : '<p class="small muted">De opties helpen je ontdekken, niet bewijzen dat je het later zelf kunt uitleggen.</p>'}`;
    controls = warm.revealed
      ? button("Verder verkennen", "explore-next", "primary large", "", "arrow")
      : button(
          "Bekijk de uitleg",
          "explore-explain",
          "ghost large",
          "",
          "book",
        );
  } else if (task.kind === "reverse") {
    body = `<div class="step-caption">Een andere ingang · nog geen geheugenmeting</div><h2 class="warm-question">Welke term hoort hierbij?</h2><div class="definition-cue answer-text">${markdown(task.definition)}</div>${!warm.revealed ? `<div class="study-answer-input"><label class="field-label" for="explore-answer">Jouw vermoeden</label><input type="text" id="explore-answer" autocomplete="off" placeholder="Een term is genoeg" value="${e(warm.answer)}"><p class="small muted">Een poging is genoeg. Je hoeft dit nog niet te kennen.</p></div>` : `${warm.answer.trim() ? `<div class="your-answer"><span class="label">Jouw vermoeden</span><p>${e(warm.answer)}</p></div>` : ""}<hr class="answer-divider"><span class="answer-label">De bijbehorende term</span><div class="question">${e(task.term)}</div><p class="small muted">Jij vergelijkt. Andere formuleringen zijn niet automatisch fout.</p>`}`;
    controls = !warm.revealed
      ? button("Bekijk de term", "explore-reveal", "primary large", "", "arrow")
      : `<p class="grade-prompt">Had je het verband te pakken?</p><div class="swipe-actions">${button("Nog niet", "explore-rate", "", 'data-success="false"', "refresh")}${button("Ja, herkend", "explore-rate", "primary", 'data-success="true"', "check")}</div>`;
  } else {
    const face = faces(note, card);
    body = `<div class="step-caption">Begin met de kern</div><div class="answer-label">Uitleg of voorbeeld</div><div class="answer-text">${markdown(face.answer)}</div>${warm.revealed ? `<hr class="answer-divider"><div class="answer-label">De vraag erbij</div><div class="question">${markdown(face.question)}</div>` : '<p class="study-prompt">Lees rustig. Kun je deze uitleg verbinden met iets dat je al kent?</p>'}`;
    controls = warm.revealed
      ? button(
          "Verder verkennen",
          "explore-rate",
          "primary large",
          'data-success="false"',
          "arrow",
        )
      : button(
          "Bekijk de vraag erbij",
          "explore-reveal",
          "primary large",
          "",
          "arrow",
        );
  }
  return (
    shell +
    `<section class="study-card exploration-card">${head}${body}</section><div class="study-dock reveal-dock">${controls}<p class="small muted">Vrij verkennen · geen FSRS-beoordeling</p></div></div>`
  );
}
