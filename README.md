# Helder 2.0

Een rustige, gratis flashcard-webapp met twee modi: **Flashcards** en **Leren**. Je eigen kaarten handmatig maken of importeren met Markdown, Quizlet-TSV en CSV. Offline-first, volledig lokaal, zonder account of betaalmuur.

## Wat is nieuw in versie 2?

- **Mobiele navigatie onderaan:** Vandaag, Bibliotheek, Met ster en Meer. Mappen en instellingen zitten in een toegankelijke drawer met focusbeheer.
- **Focusmodus:** tijdens leren verdwijnt de gewone appnavigatie. Je ziet alleen je kaart, voortgang en de actie die nu nodig is.
- **Vaste bediening binnen duimbereik:** antwoord tonen en beoordelen blijven onderaan. De leesruimte reserveert de echte hoogte van die bediening; lange antwoorden blijven volledig bereikbaar.
- **Vier beoordelingen op één rij** op normale telefoons; een 2×2-indeling op schermen smaller dan 360 px.
- **Rustigere editors:** map/beschrijving en extra kaartopties kun je uitklappen. De opslaanknop blijft zichtbaar wanneer het formulier scrollt.
- **Offline-status:** ‘Offline gereed’ verschijnt pas na een geactiveerde offline-installatie. Het vinkje betekent géén cloudsynchronisatie.
- Een compacter startscherm, consistente typografie, licht/donker en ondersteuning voor reduced motion.

Je 432 startkaarten, FSRS, importformaten en volledige back-ups zijn behouden. De databasenaam en het dataschema zijn niet veranderd.

## Van versie 1 naar versie 2

1. Open de oude app en exporteer eerst **Instellingen → Volledige back-up**. Bewaar dat JSON-bestand buiten de appmap.
2. Stop de lokale server en vervang de bronbestanden door deze versie. Houd alle submappen intact.
3. Start op **hetzelfde adres en dezelfde poort** als voorheen (standaard `http://localhost:4173`). De browser gebruikt dan je bestaande collectie.
4. Open de nieuwe versie één keer online en wacht op **‘Update klaar’** (of ‘Offline gereed’ als de update al actief is). Bij ‘Update klaar’: sluit vervolgens **alle Helder-tabs en geïnstalleerde Helder-vensters**, en open opnieuw. De nieuwe offlinecache kan dan actief worden. Wacht op ‘Offline gereed’.
5. Zie je een lege of andere collectie? Controleer het websiteadres en je browser. Herstel alleen je eigen back-up als dat nodig is; herstellen **vervangt** de huidige collectie.

Een nieuwe map op je schijf wist je voortgang niet. Een **ander domein, protocol, poort, browser of apparaat** heeft wél aparte opslag. De meegeleverde testserver is alleen voor lokaal ontwikkelen, niet voor publieke hosting.

## Snel starten

1. Pak de volledige zip uit. Houd de submappen intact.
2. Open een terminal **in de map `helder-app`**.
3. Kies één opdracht:

```sh
node server.mjs
```

Of, als je Python 3 hebt:

```sh
python start.py
```

Op Windows heet die opdracht mogelijk `py -3 start.py`; op macOS/Linux `python3 start.py`.

4. Open **http://localhost:4173** in een recente browser.
5. Laat de terminal open tijdens het gebruik. Stoppen: Ctrl+C.

**Je hoeft geen `npm install` te doen.** Er is geen buildstap. Met Node 20+ kun je ook `npm start` en `npm test` gebruiken. Gebruik niet alleen een dubbelklik op index.html: browsers blokkeren dan de benodigde modules/opslag.

Poort bezet? `python start.py --port 4174`, of stel `PORT=4174` in voor de Node-server. Open daarna hetzelfde poortnummer. Let op: een andere poort betekent een apart websiteadres en dus aparte browseropslag.

## Wat werkt er?

- Vrij flashcards omdraaien, vorige/volgende, husselen en sterren.
- Leermodus met eigen antwoord, modelantwoord, optionele hint en begripscheck.
- Echte **FSRS**-planning: Opnieuw / Moeilijk / Goed / Makkelijk.
- Daglimiet nieuwe kaarten; meerdere rondes herhalingen mogelijk.
- Aanpasbare rondegrootte, gewenste herinnering, antwoordmodus en thema.
- Mappen/submappen, sets, meerdere tags per notitie, zoeken en dynamische filters.
- Drie kaarttypes: gewoon, beide richtingen, invulcodes.
- Handmatige editor, importvoorvertoning, exact-duplicaatcontrole en kaartwijzigingen zonder automatisch voortgang te wissen.
- Pauzeren/hervatten en één laatste beoordeling ongedaan maken.
- JSON-back-up en herstel inclusief voortgang; TSV/Markdown-export voor kaartinhoud.
- Responsive mobiele interface, systeem-/licht-/donkerthema, toetsenbordbediening.
- Installeerbare PWA en offline gebruik na een geslaagde eerste online installatie.

## Je startmateriaal

Bij het **eerste bezoek op een nieuw websiteadres** worden deze sets ingevoerd:

- **Algemene filosofie:** 50 kaarten.
- **Continentale filosofie:** 382 kaarten.

De leesinstructie uit het oude bestand is niet als studiekaart geïmporteerd. Niveau-/hoofdstukprefixen zijn omgezet naar echte tags. Kies bij het continentale deck eerst `niveau::1` om eenvoudig te beginnen. Het standaard aantal nieuwe kaarten geldt over alle sets samen.

Dit zijn je eerdere decks, geen nieuwe inhoudelijke cursuscontrole. Als je deze broncode publiek gaat delen, beslis bewust of je je persoonlijke cursuskaarten wilt meeleveren. Een bestaande collectie wordt niet veranderd als je `starter.json` aanpast; daarvoor gebruik je de import-/editfunctie. Een nieuwe lege app? Zet `data/starter.json` op `[]` vóór het eerste bezoek.

## Je eerste eigen set

Nieuwe set → Handmatig: vul een vraag en antwoord in, eventueel tags/hint. Je kunt meer kaarten aan het concept toevoegen. De laatste ingevulde kaart wordt bij Opslaan ook meegenomen.

Nieuwe set → Markdown / import:

```md
# Mijn set
map: Filosofie::Mijn notities

## Wat is epistemologie?
tags: kennisleer, niveau::1

De studie van kennis: wat we weten en hoe we dat kunnen onderbouwen.

---

## Ervaringskennis heet {{c1::a posteriori}}.
type: cloze

Bijvoorbeeld: je kijkt naar buiten en ziet dat het regent.
```

Zie `data/voorbeeld.md` en **Zo werkt het** in de app voor alle opties. TSV/CSV kan 2–7 kolommen hebben: Term, Definitie, Tags, Hint, Type, Uitleg, Bron.

## Belangrijk: lokaal betekent lokaal

Je collectie staat in **IndexedDB van deze browser op dit websiteadres**. Niet in de broncodemap, niet automatisch in de cloud. De app gebruikt geen cookies of accounts voor synchronisatie. Het wissen van browsergegevens of het verliezen van het apparaat kan je collectie verwijderen.

**Maak een volledige JSON-back-up via Instellingen.** Bewaar die buiten de gepubliceerde appmap. Herstellen op een ander apparaat vervangt de collectie daar; het voegt geen twee verschillende voortgangslogboeken samen. TSV/Markdown bewaart geen voortgang.

De opslag is gescheiden per browser en website-origin: protocol, domein en poort. Verschillende paden op hetzelfde domein kunnen de collectie dus delen. Een ander domein, andere poort, andere browser of apparaat = aparte collectie. Gebruik altijd hetzelfde adres. Privémodus kan opslag tijdelijk maken of blokkeren.

## Gratis op je telefoon

Dezelfde app kan als webapp op Android en iPhone worden gebruikt, zonder betaald mobiel pakket:

1. Publiceer de **inhoud van `helder-app`** als statische website op een HTTPS-host, bijvoorbeeld GitHub Pages, Cloudflare Pages of Netlify. Gebruik geen backend/buildcommando; publish directory is de appmap. Kies zelf een hostingplan; gratis tiers en voorwaarden kunnen veranderen.
2. Open het HTTPS-adres op je telefoon en wacht tot **‘Offline gereed’** verschijnt.
3. iPhone/Safari: Deel → **Zet op beginscherm**. Android/Chrome: menu → **App installeren** of **Toevoegen aan beginscherm**.
4. Daarna kan de gecachete app offline werken. Je telefoon heeft wel haar **eigen lokale voortgang**. Gebruik JSON om die handmatig over te zetten.

`localhost` op je laptop is niet bereikbaar op je telefoon. Gewone netwerk-HTTP voldoet niet aan de PWA/offline-eisen. Browserinstallatie verschilt per versie; fysieke mobiele installatie is bij deze oplevering niet op echte toestellen getest.

Als je alleen privé wilt gebruiken, publiceer dan geen back-ups of persoonlijke data in de appmap. Hosting maakt de bronbestanden en het meegeleverde startermateriaal meestal publiek toegankelijk, niet je lokale IndexedDB.

## Verder vibecoden

Start met `styles.css` voor het uiterlijk en `docs/ONTWERP.md` voor de ontwerpkeuzes. `src/interface.js` beheert de mobiele chrome, het focusbeheer en de hoogte van de leerbediening. `src/app.js` bevat de schermen en interacties; `src/model.js` het kaart-/mapmodel; `src/scheduler.js` de FSRS-grens. De meegeleverde library staat in `vendor/`, niet op een CDN.

- `docs/ONDERZOEK.md`: onderbouwing, bronnen, productkeuzes en beperkingen.
- `docs/ARCHITECTUUR.md`: datamodel, importcontract, veilige opslag en uitbreidingspunten.
- `docs/ONTWERP.md`: responsive ontwerp, tokens, focusmodus en mobiele interacties.
- `docs/TESTRESULTATEN.md`: daadwerkelijk uitgevoerde tests en grenzen daarvan.
- `tests/*.test.mjs`: uitbreidbare pure tests.

Na een wijziging:

```sh
npm test
```

Optionele browsertests (voor verder ontwikkelen, niet nodig om de app te gebruiken):

```sh
npm install --no-save playwright@1.58.2
npx playwright install chromium
```

Start daarna de lokale server in een andere terminal en voer uit:

```sh
node tests/browser-smoke.mjs
node tests/browser-extra.mjs
```

De browsertests gebruiken tijdelijke profielen en maken screenshots in `test-results/`. Met `CHROMIUM_BIN` kun je een bestaande Chromium-binary gebruiken; `TEST_URL` wijzigt het testadres.

Bij een release: verander de cachenaam in `sw.js`, houd de assetlijst bij en sluit oude tabs voordat je de nieuwe versie test. Anders kan een oude Service Worker nog oude modules leveren. Je leerdata blijven in IndexedDB.

## Wat is bewust nog niet gebouwd?

Geen accounts, automatische cloudsynchronisatie, AI-beoordeling, .apkg-import, afbeeldingen/audio of pushmeldingen. FSRS gebruikt standaardparameters; persoonlijke parameteroptimalisatie zit er nog niet in. De browser geeft zelf de toestemming voor blijvende opslag; een verzoek garandeert niet dat hij die toekent.

Deze app ondersteunt goed leren, maar het onthouden van kaartantwoorden is niet hetzelfde als het volledig begrijpen van een cursus. Gebruik ook langere uitleg, eigen voorbeelden en echte oefenvragen.

## Licenties

Nieuwe appcode: MIT, zie `LICENSE`. Vendored ts-fsrs: MIT, zie `vendor/FSRS-LICENSE.txt`. Jouw persoonlijke kaartinhoud valt niet automatisch onder de applicentie.


### V2-UI-tests

Met Playwright en Chromium beschikbaar en een draaiende lokale server:

```sh
node tests/browser-mobile.mjs
```

Deze extra flow test 320 / 390 / 430 / 768 px, de onderste navigatie, focusbeheer, leesruimte boven de vaste leerbediening, sheets, donker thema, reduced motion en offline herladen. Je kunt `TEST_URL`, `TEST_OUTPUT`, `PLAYWRIGHT_MODULE` en `CHROMIUM_BIN` instellen voor je eigen omgeving.

Bij latere releases: verhoog de cacheversie in `sw.js` en de versieparameters van CSS/entrymodule in `index.html` samen. Pas ook de assetlijst in `sw.js` aan. Een bestaande offline-app moet de nieuwe bestanden eerst online installeren.
