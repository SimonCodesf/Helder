# Testresultaten — Helder 2.0

## Samenvatting

- **45 pure Node-tests: geslaagd.**
- **28 geïntegreerde browsercontroles: geslaagd.**
- **7 aanvullende UI-controles: geslaagd.**
- **13 nieuwe mobiele/UI-controles: geslaagd.**
- **3 upgradecontroles tegen de werkelijke v1-broncode: geslaagd.**
- Geen ongehanteerde JavaScript-runtimefouten in de geteste appflows.
- Alle moduleverwijzingen en offline-cachebestanden bestaan.
- Startmateriaal: precies 432 oefenkaarten (50 + 382).
- Visuele controle van desktop (1440 × 1000), telefoon (390 × 844 en 320 × 844) en tablet (768 × 844), inclusief sheets, drawer, lege schermen, importfouten, beide oefenmodi en donker thema. De desktop-only sluitknop en titel-/beheerknopuitlijning zijn daarbij gecorrigeerd en opnieuw bekeken.
- Twaalf concrete kleurparen voldoen aan de gebruikte WCAG-AA-contrastdrempels (tekst 4,5:1; invoerveldgrenzen 3:1). Dit is geen certificering van de gehele app.

## De pure tests

Parser: TSV, CSV met komma's/quotes/meerdere regels, BOM/CRLF, Markdownmetadata, codeblokken, duplicaten, invulcodes, veilige URL's, HTML-escaping en exports.

Model: mappen/submappen, scopes, tags, sterren, moeilijke kaarten, notities versus onafhankelijke oefenkaarten, sibling-burying, globale daglimiet, pauzeren, wijzigingen met behoud van planning, expliciete reset, verwijderen en validatie van herstelbestanden.

Scheduler: serialize/hydrate van datums, overeenkomst van intervalvoorvertoning met werkelijk toegepaste ratings, leren/afstuderen/herleren, toekomstige korte herhalingen en geldige herinneringskans.

## Browsercontroles

- Starter 50 + 382 cards: geslaagd.
- Skip link keeps route and focuses content: geslaagd.
- Live search sets: geslaagd.
- Star persistence: geslaagd.
- Flashcards do not reschedule: geslaagd.
- Learn rating persisted: geslaagd.
- Undo restores schedule and review log: geslaagd.
- Progress survives reload: geslaagd.
- Manual editor saves last pending card: geslaagd.
- Hint requires Again; future learning not forced early: geslaagd.
- Markdown import + cloze + reverse templates: geslaagd.
- Note edit: geslaagd.
- Rename set: geslaagd.
- Folder create and rename: geslaagd.
- Folder delete: geslaagd.
- Cross-set tag filter: geslaagd.
- Pause and resume templates: geslaagd.
- TSV file import and duplicate skip: geslaagd.
- Settings persist: geslaagd.
- Backup export contains schedule and cards: geslaagd.
- Backup restore validated and applied: geslaagd.
- Dark theme: geslaagd.
- Service worker offline reload and editor: geslaagd.
- Mobile navigation: geslaagd.
- Mobile learning layout: geslaagd.
- Concurrent tab refuses stale overwrite: geslaagd.
- file:// startup help: geslaagd.
- No JavaScript runtime errors: geslaagd.

## Aanvullende UI-controles

- niveau::1 filter: geslaagd.
- kennismaking + easy restriction + expanded explanation: geslaagd.
- starred route: geslaagd.
- extra practice without review scheduling: geslaagd.
- missing route state: geslaagd.
- invalid import with readable error: geslaagd.
- mobile flashcards and set management: geslaagd.

## Wat is niet getest?

- Geen fysieke iPhone-/Androidinstallatie; mobiele Chromium-viewporttests zijn niet hetzelfde.
- Geen aparte Safari-, Firefox-, screenreader- of volledige accessibility-audit.
- Geen wetenschappelijk gebruikersonderzoek naar deze specifieke app of haar leerresultaten.
- Geen stress-/performancegarantie voor 100.000 kaarten of miljoenen beoordelingen.
- Geen cloudsynchronisatie of .apkg-import: die functies bestaan niet in deze versie.

De lokaal meegedraaide browser gebruikte Chromium, headless. Node-testresultaten en uitgevoerde browserchecks staan ook in `docs/test-results.json`. Tests kunnen worden herhaald met de opdrachten in README; de app zelf heeft geen testdependencies nodig.


## Nieuwe mobiele/UI-controles

13 aanvullende controles met Chromium en Playwright: offline-status na werkelijke cache/worker-installatie; horizontale overflow en raakvlakken op 320/390/430/768 px; drawerfocus en Escape; huidige route kiezen; actieve bottom tab; compacte setbeheeracties naast de breadcrumb; focusmodus en vaste leerbediening; uitgeklapte uitleg volledig boven die bediening scrollen; 2×2-ratings op 320 px; system-dark en reduced motion; flashcontrols; uitklapbare kaartopties en zichtbare opslaanknop; offline herladen met versieparameters; en geen runtimefouten. Sommige controles bevatten meerdere assertions.

## Upgradecontrole

De echte v1-broncode werd op een lokaal testadres geladen, met geactiveerde v1-Service Worker, bestaande kaarten/instellingen en een werkelijk beoordeelde kaart met FSRS-leerplanning en reviewlog. De server is daarna op hetzelfde origin omgeschakeld naar v2:

1. Kaarten, notities, FSRS-schedules, reviewlog, instellingen en revision blijven exact behouden.
2. De v2-shell krijgt meteen v2-CSS en de v2-entrymodule, ook zolang v1 de actieve worker is. ‘Update klaar’ verschijnt pas wanneer de nieuwe installatie gereed is.
3. Na het sluiten van alle appvensters wordt v2 actief. Offline herladen werkt en bewaart de oorspronkelijke collectie.

De broncode van het oude project is niet nogmaals in dit pakket opgenomen. De pure en reguliere browsertests zijn wel meegeleverd.

## UI-testgrenzen

Getest in Chromium, met gesimuleerde mobiele viewport/touch en netwerkstatus. Dit is **geen echte iPhone-/Android-test** en geen volledige WCAG-audit. Safari, mobiele browserchrome, toetsenbord en notch/safe-area-interactie moeten op fysieke toestellen worden geverifieerd vóór productiegebruik. Er is geen publieke hosting of automatische synchronisatie opgezet.
