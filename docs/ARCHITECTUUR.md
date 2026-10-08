# Architectuur en verder vibecoden

## Stack

- HTML + CSS + gewone JavaScript ES-modules.
- Geen framework, buildstap, bundler of verplichte npm-dependencies.
- IndexedDB bewaart de collectie.
- Een Service Worker cachet de app voor offline gebruik.
- ts-fsrs 5.4.2 staat vendored in `vendor/fsrs.mjs` met licentie en typebeschrijvingen.
- `server.mjs`: kleine Node-server voor ontwikkelen. `start.py`: Python-alternatief.

De eerste versie is bewust eenvoudig overdraagbaar: een editor kan iedere module los lezen en aanpassen. React/Vue/Svelte is later mogelijk, maar niet nodig om nu te starten.

## Waar staat wat?

| Bestand | Verantwoordelijkheid |
| --- | --- |
| `index.html` | Shell, mobiele bovenbalk en bottom tabs, sidebar, main en native dialog. |
| `styles.css` | Design tokens, responsive layout, donker/licht, focus en reduced motion. |
| `src/app.js` | Routing, schermen, editors, events en mutatiecoördinatie. |
| `src/interface.js` | Responsive chrome, drawerfocus, offline-status, virtual-viewportgedrag en gemeten study-dockhoogte. Geen datamutaties. |
| `src/model.js` | Collectie, mappen, sets, notities, gegenereerde kaarten, scopes, queue en validatie. |
| `src/parser.js` | Markdown/TSV/CSV lezen en inhoud exporteren. |
| `src/scheduler.js` | Smalle wrapper rond FSRS, date-hydration en intervalvoorvertoningen. |
| `src/study.js` | Tijdelijke rondes en navigatie; géén tweede scheduler. |
| `src/storage.js` | IndexedDB en atomische revision-checked writes. |
| `src/markdown.js` | Veilige kleine Markdown-subset; HTML wordt ontsnapt. |
| `src/guide.js` | In-app handleiding. |
| `src/icons.js` | Lokale SVG-iconen. |
| `src/utils.js` | ID's, tijd, downloads, escaping en URL-checks. |
| `src/start-check.js` | Duidelijke melding voor file:// zonder afhankelijk te zijn van ES-modules. |
| `data/starter.json` | De 50 + 382 kaarten, uitsluitend ingevoerd bij eerste bezoek. |
| `data/voorbeeld.md` | Copy-paste voorbeeld met invulkaart. |
| `tests/*.test.mjs` | Pure tests met Node's ingebouwde testrunner. |

IndexedDB is per browser-origin (protocol, host en poort), niet per projectmap of URL-pad. Twee kopieën onder hetzelfde origin gebruiken dezelfde database `helder-v1`. Gebruik gescheiden origins of pas de databasenaam aan als je bewust meerdere onafhankelijke installaties wilt.

## Data (schema version 1)

Eén snapshot met `version`, `revision`, `folders`, `sets`, `notes`, `cards`, `reviews`, `settings`, `seeded` en `lastBackup`.

Een **note** bewaart de tekst, hint, bron, begripscheck en tags. `kind` is `basic`, `reverse` of `cloze`. Een **card** verwijst naar die note en een template: `forward`, `reverse`, `cloze:1`, enzovoort. Elke card heeft een onafhankelijke FSRS-state en `buriedUntil`/`suspended`.

FSRS-datums worden als milliseconden opgeslagen en pas aan de library-grens terug naar `Date` omgezet. `createEmptyCard()` levert de nieuwe state; gebruik geen zelfbedachte defaults.

Een review bewaart kaart-ID, tijdstip, lokale kalenderdag, rating, new-status, hintgebruik, antwoordtijd (max. 15 minuten), FSRS-log en vorige schedule. Getypte antwoorden worden niet bewaard. Lokale kalenderdagen volgen de tijdzone van het apparaat; een klok-/tijdzonewijziging kan daggrenzen veranderen.

## Schrijven zonder stille overschrijvingen

Mutaties worden binnen één tab in volgorde gezet. Er wordt eerst een clone veranderd en naar IndexedDB geschreven; pas na succesvolle commit wordt de live state vervangen. Een fout schrijft dus niet alvast half je UI-state om.

`saveCollection` gebruikt een enkele read/write-transaction: de opgeslagen revision moet overeenkomen met de gelezen revision. Een concurrerende tab krijgt anders een ConflictError en moet herladen. BroadcastChannel toont daarbij een melding. Dit is bescherming tegen verloren updates, geen live samenwerking. Een cross-tab melding onderbreekt geen nog-niet-opgeslagen concept; de volgende write blijft geblokkeerd door de revisioncheck.

Back-upherstel valideert IDs, verwijzingen, types, kaarttemplates, planning en instellingen voordat het huidige snapshot wordt vervangen. Een toekomstige schemawijziging hoort expliciete migraties te krijgen. Onbekende versies worden nu geweigerd; ze worden nooit stil met een nieuwe lege collectie vervangen.

## Leerqueue

1. Uitgesloten: gepauzeerde kaarten en (bij gewone leermodus) verwante kaarten die vandaag doorgeschoven zijn.
2. Eerst echte vervallen kaarten; korte leer-/herleerstappen krijgen voorrang, andere reviews worden geordend op geschatte herinneringskans.
3. Nieuwe kaarten in invoervolgorde, begrensd door het aantal vandaag reeds geïntroduceerde kaarten in de hele collectie.
4. Eén sibling per note in de selectie.
5. Een ronde pakt maximaal `sessionSize`; herhalingen binnen die selectie kunnen door elkaar komen.
6. De beoordeling laat alleen FSRS de nieuwe vervaldatum berekenen. Korte stappen worden niet te vroeg aangeboden.

Flashcards en “Extra oefenen” veranderen de queue/planning in de database niet. Je kunt in die modi ook vooruit oefenen en doorgeschoven siblings bekijken. Extra oefenen beoordeelt alleen de huidige ronde en komt niet in het FSRS-logboek; zo vervuilt oefendrift niet onbedoeld het normale schema.

## Importcontract

Markdown gebruikt `#` als settitel, `##` als kaartvraag en `---` als separator. Gebruik `###` voor subkopjes in een antwoord. Metadata staat op losse regels en heet `map`, `beschrijving`, `tags`, `hint`, `type`, `uitleg`, `bron`. Dit is een kleine gedocumenteerde markup-taal, niet willekeurig Markdown omzetten naar kaarten.

Invulcodes: `{{c1::antwoord::optionele hint}}`. Meerdere codes met hetzelfde nummer vormen één kaart. Geneste codes worden expliciet geweigerd.

TSV/CSV ondersteunt geciteerde velden, escaped quotes en meerregelige antwoorden. Exact dezelfde `kind + front + back` wordt binnen een import en bij toevoegen aan een set overgeslagen. Inhoudelijk vergelijkbare kaarten worden niet automatisch samengevoegd. Voeg je bewust een variant toe, verander dan de vraag of het antwoord.

Importlimieten: tekst 5 MB, maximaal 10.000 notities per import. Back-upherstel: 50 MB, maximaal 100.000 notities/300.000 kaarten/1.000.000 reviews. Deze bovengrenzen zijn veiligheidslimieten, geen geteste prestatiegaranties. De in-memory snapshotarchitectuur is bedoeld voor persoonlijke collecties; bij zeer grote collecties zijn geïndexeerde stores een logische verbetering.

## Veiligheid en offline

Alle gebruikersvelden worden ontsnapt voordat ze in HTML terechtkomen. De kleine Markdown-renderer ondersteunt geen raw HTML. Bron-/Markdown-links accepteren alleen http/https. Externe links openen met `noopener noreferrer`.

Er zijn geen externe fonts/CDNs, telemetry, wachtwoorden of API-sleutels. Eerste bezoek haalt alleen lokale assets en het meegeleverde starterbestand op.

`sw.js` cachet alle opgegeven bestanden tijdens installatie. Verander bij releases de cachenaam en houd de assetlijst bij. Een nieuwe worker activeert nadat oude tabs gesloten zijn; de app forceert geen update midden in een sessie. IndexedDB staat los van de cache, zodat een app-update je voortgang niet verwijdert.

Bij installatiefouten blijft de app online bruikbaar, maar claim niet dat ze offline gereed is. Controleer DevTools → Application → Service Workers/Cache Storage. HTTPS of localhost is vereist. Er is geen server-side API of authenticatie.

## Nuttige volgende uitbreidingen

- De renderfuncties uit `app.js` opsplitsen in aparte viewmodules als die file verder groeit.
- Persoonlijke FSRS-parameteroptimalisatie met de officiële optimizer; implementeer geen regressie uit de losse pols.
- Cloudsync met expliciete toestemming: logboekmerge, conflicten, authenticatie en encryptie eerst ontwerpen.
- Afbeeldingen/audio in IndexedDB; quota, export en mobiele toegang daarbij meebouwen.
- Een volledige Markdown-parser combineren met een betrouwbare sanitizer, als de kleine subset te beperkt wordt.
- .apkg-import met een dedicated parser; huidige CSV/TSV-import is geen .apkg-compatibiliteit.
- Toegankelijke formulieren en PWA expliciet op fysieke iPhone/Android testen.

## Testen

`npm test` draait zonder package-installatie de pure Node-tests. Browserflows zijn tijdens oplevering ook uitgevoerd in sandbox-Chromium: import, CRUD, leren, ongedaan maken, persistentie, backupherstel, offline reload, thema en mobiele navigatie. Zie `docs/TESTRESULTATEN.md` voor het daadwerkelijk uitgevoerde overzicht; voeg eigen tests toe voor elke gedragswijziging.


## UI-release 2.0: compatibiliteit

Deze release verandert alleen presentatie en interacties. `model.js`, `parser.js`, `scheduler.js`, `storage.js`, `study.js` en de 432 starterkaarten zijn inhoudelijk gelijk aan versie 1. IndexedDB blijft `helder-v1` met schema 1. Een upgrade op hetzelfde origin laadt dus de bestaande snapshot; startmateriaal wordt niet opnieuw geïmporteerd.

CSS en de entrymodule hebben in `index.html` een versieparameter. Daardoor kan een v1-Service Worker niet zijn oude CSS/JS op de nieuwe v2-shell plakken. De bijbehorende query-URL's zitten ook in de v2-cache, zodat offline herladen werkt. Een wachtende Service Worker wordt niet geforceerd actief midden in een ronde; sluit alle appvensters na de online update.

`interface.js` meet `.study-dock` met `ResizeObserver` en publiceert `--study-dock-height`. De mobiele leeskolom reserveert die hoogte plus witruimte. Bij een zichtbare virtuele toetsenbordverkleining via `visualViewport` wordt de leerbediening onderdeel van de normale documentflow. Dat is een browser-afhankelijke fallback en moet bij verdere releases op echte iOS-/Android-toestellen worden getest.
