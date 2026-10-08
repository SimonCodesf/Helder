# Helder 3.1

Een eenvoudige, Nederlandstalige leerapp met een echte leerflow, swipe-flashcards en optionele privésynchronisatie. Geen build nodig om te starten. Geen AI-API, advertenties of abonnement in de app.

**De publicatieversie begint leeg.** `data/starter.json` bevat `[]`. Het voorbeeldvak wordt alleen toegevoegd wanneer je het zelf importeert. Je bestaande 432 kaarten horen in het afzonderlijke privé-importpakket, niet in deze repository.

## Starten

```sh
node server.mjs
```

Open `http://localhost:4173`. Laat de terminal open. Python kan ook: `python start.py`. Dubbelklikken op `index.html` werkt niet vanwege modules en browseropslag.

## Wat is nieuw?

1. **E-mailaanmelding voor privésync:** aanmelden met wachtwoord, account maken met e-mailbevestiging en wachtwoordherstel. De verstrekte project-URL en publieke key zijn al ingevuld, met `providers: ["email"]`. Het project accepteert de key; echte mailbezorging en account-sync moet je nog accepteren. Zie [SYNC.md](docs/SYNC.md).
2. **Swipe-flashcards:** rechts = gekend, links = nog niet. Dezelfde acties werken met knoppen/toetsen. Marks blijven bewaard; moeilijke kaarten kun je opnieuw oefenen. Geen verborgen wijziging aan je FSRS-planning.
3. **Vakstructuur:** vakmappen → sets → niveaus → hoofdstukken. Een eigen overzicht en een aparte kaartenweergave. Bestaande `niveau::…`/`hoofdstuk::…`-tags worden automatisch herkend; eigen namen via Set beheren.
4. **Echte verkenningsrondes:** eerst een kleine samenhangende groep (1/3/5 kaarten). Meerkeuze met geschreven opties/feedback waar beschikbaar, definitie → term bij geschikte begrippen, of uitleg als veilige terugval. Daarna pas term/vraag → eigen uitleg zonder opties. Een aparte knop **Verkennen** werkt ook zonder de geheugenplanning te veranderen. Herhalingen slaan de opwarming standaard over.
5. **15 is geen maximum:** een aanpasbare startinstelling voor nieuwe kaarten. Zet de daglimiet uit voor onbeperkt nieuwe kaarten. Herhalingen vallen niet onder die daglimiet; “kaarten per ronde” is apart.
6. **Mobile-first product-UI:** rustige vakoverzichten, vaste duimbediening, zelfstandig scrollende editors, focusmodus, dark mode, toetsenbord/focus en reduced motion.

## Op je telefoon, ook buitenshuis

Publiceer deze map op één vast **HTTPS-adres**. Open op je telefoon één keer volledig online en wacht op “Offline gereed”. Installeer daarna via Safari → Deel → Zet op beginscherm (iPhone), of via Chrome → App installeren (Android). De app kan daarna ook zonder verbinding werken. Browsergegevens wissen verwijdert je lokale kopie.

`localhost` op je computer is niet buitenshuis bereikbaar. Je eigen HTTPS-website werkt prima, ook in een submap. De cache en imports gebruiken relatieve paden.

### Gratis GitHub Pages

Voor een openbare, niet-commerciële statische projectsite kan GitHub Pages met een gratis GitHub-account gebruikt worden. Upload de **inhoud** van deze map naar een nieuwe openbare repository. Zet onder Settings → Pages de publicatiebron op je branch en `/ (root)`. Het adres wordt bijvoorbeeld `https://jouwnaam.github.io/helder/`. Upload ook het meegeleverde lege `.nojekyll`-bestand: zo blijven de JavaScript-, Markdown- en offlinebestanden ongewijzigd beschikbaar.

GitHub Pages serveert alleen de frontend, **geen** database of syncserver. Voor optionele sync staat de database apart in jouw Supabase-project. De statische app heeft een e-mail/wachtwoordformulier; de officiële SDK verstuurt de invoer via HTTPS naar jouw Supabase Auth, niet naar GitHub Pages. Wachtwoorden gaan niet in kaartdata, exports of syncpayloads. Hou rekening met de voorwaarden en gebruikslimieten van beide providers.

Bronnen: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [limieten](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Supabase prijzen](https://supabase.com/pricing).

### Controle vóór publicatie

```sh
node scripts/public-check.mjs
```

Controleert dat het starterbestand leeg is, de configuratie geen geheime key bevat en bekende privé-export/bestandspatronen niet in de appmap staan. Dit is een vangnet, geen volledige secretscanner. Controleer ook zelf je repository en eventuele gitgeschiedenis.

**Upload nooit:** privékaartbestanden, persoonlijke JSON-back-ups, `.env`, aanmeldtokens, private keys of het 432-kaarten-importpakket. Een publieke publishable/anon key mag wél in `config.json`; RLS en de eigenaarcontrole beschermen de gegevens.

## Sync kort — jouw e-mailproject

`config.json` is al ingevuld met `https://eblzstvfbmvzcqylbjps.supabase.co` en de door jou verstrekte **publishable** key. Je hoeft geen Google/GitHub-provider te activeren. Een key is geen SMTP-instelling en geen vervanging voor eigenaarafscherming.

1. Publiceer de app op je vaste HTTPS-adres.
2. Voer `backend/supabase.sql` uit in je eigen SQL Editor (als het schema nog niet precies is ingesteld). Dit script wist geen collecties.
3. Laat Email onder Authentication aan staan en laat e-mailbevestiging ingeschakeld.
4. Zet **Authentication → URL Configuration → Site URL op het appadres**, niet op de Supabase-project-URL. Voeg datzelfde adres én de variant met `?auth_recovery=1` toe aan Redirect URLs.
5. Configureer **eigen SMTP** als andere gebruikers accounts mogen maken. De standaard maildienst is beperkt tot projectteamadressen en een laag quota.
6. Voor bevestigings-/herstellinks die ook in een andere browser werken: plak de meegeleverde HTML uit `backend/email-templates/` in de betreffende Supabase Email Templates. Zie `docs/SYNC.md`.
7. Open de app opnieuw online → Instellingen → Je apparaten → **Aanmelden met e-mail**. Maak/bevestig een account, meld aan en kies daarna bewust **Verbind deze bibliotheek**.
8. Herhaal met dezelfde account op je telefoon. Test ook een tweede account: die mag jouw kaarten niet zien.

De URL/key en publieke Auth-instellingen zijn **alleen uitlezend live gecontroleerd**: Email is actief, registratie toegestaan en bevestiging vereist. De tabel bestaat en anonieme tabellezing werd geweigerd. Er is geen echte account aangemaakt of mail aangevraagd; SMTP, echte aanmelding en jouw live RLS/RPC moeten nog worden gecontroleerd. Lokaal zijn SDK-aanmelding/herstel, sync met gesimuleerde apparaten en het SQL-script afzonderlijk getest.

## Kaarten maken en importeren

Nieuwe set → Handmatig of Markdown/import. Gewone vraag/antwoord, omgekeerd, en Anki-achtige invulcodes (`{{c1::antwoord}}`). Niveau/hoofdstuk zijn gewone velden in de editor. Markdown, TSV en CSV zijn ondersteund.

[Het optionele voorbeeldvak](data/voorbeeld.md) laat herkennings- en toepassingsvragen zien. [Drie voorbeeldbegrippen](data/verkennen.md) tonen definitie → term. Beide zijn optioneel; de app start leeg. Een herkenningsvraag moet 3–5 door jou gecontroleerde opties hebben, met precies één juiste optie. Er worden **geen willekeurige afleiders uit andere kaarten verzonnen**. Een toepassing heeft een scenario, modelredenering en optionele kernpunten. Een korte begripstitel wordt conservatief als term herkend. Voor een gewone vraag kun je expliciet een **Term voor verkennen** invullen (Markdown: `verken-term:`); invulteksten worden niet automatisch omgekeerd. De term wordt waar mogelijk in de definitie verborgen, maar een slecht geschreven definitie kan alsnog te veel weggeven. Zonder geschikte term of meerkeuze blijft uitleg/ophalen werken; los toepassen geeft dan een open zelfcheck, niet een automatisch juist/fout-oordeel.

Markdown-structuur:

```md
# Mijn vak
map: Studie::Mijn vak

## Wat betekent 25%?
tags: niveau::1, hoofdstuk::H1
verken-term: Een kwart

Een kwart: 25 van de 100.

:::herkennen
vraag: Welk deel is 25%?
- [x] Een kwart
- [ ] Een derde
- [ ] Een helft
uitleg: 25/100 = 1/4.
:::

:::toepassen
vraag: Een klas telt 28 leerlingen. Hoeveel is een kwart?
antwoord:
28 / 4 = 7 leerlingen.
kernpunten:
- Je deelt de hele groep door 4.
- Je antwoord heeft de juiste eenheid.
:::
```

`---` scheidt notities. Optionele metadata: `hint:`, `uitleg:`, `bron:`, `verken-term:`, `type: reverse` of `type: cloze`. Gebruik één regel voor vragen/opties/metadata; modelantwoorden mogen meerdere regels hebben. Reserveer `:::` voor oefenblokken. Setnamen/niveaulabels gaan mee met Markdown via optionele `structuur:`-JSON-metadata. HTML wordt niet uitgevoerd.

TSV/CSV: `Term, Definitie, Tags, Hint, Type, Uitleg, Bron, Oefeningen`. Eerste twee verplicht (bij cloze mag Definitie leeg zijn). Achtste kolom is optionele JSON voor de extra oefeningen. Oude exports met 2–7 kolommen blijven werken.

## Geheugen ≠ begrip

- **Gekend:** jouw swipe tijdens vrij oefenen.
- **In opbouw:** er is een FSRS-planning, maar nog geen gespreide ophaalevidentie volgens onze productregel.
- **Gespreid opgehaald:** op ten minste twee dagen, ten minste 24 uur uit elkaar, zonder recente uitleg/hint als correct beoordeeld. Dit is een transparante ontwerpregel, **geen gevalideerde beheersingsscore**.
- **Toepassen:** apart geoefend; vrije antwoorden vergelijk je zelf met het model.

FSRS gebruikt standaardparameters uit `ts-fsrs 5.4.2`. Gewenste herinnering 90% is geen garantie op 90% begrip of examenresultaat. Een fout antwoord is **Opnieuw**, niet Moeilijk. Het complete onderzoek en de beperkingen staan in [ONDERZOEK.md](docs/ONDERZOEK.md).

## Back-up en updates

Instellingen → Volledige back-up exporteert kaarten, structuur, FSRS, swipe-marks, beoordelingen en oefenlogboek. **Nooit aanmeldtokens of wachtwoorden.** Back-up herstellen vervangt de huidige collectie. Bij actieve sync wordt die vervanging ook gesynchroniseerd; de bevestiging waarschuwt daarvoor.

Een Markdown/TSV-export bevat inhoud en extra oefeningen, geen planning. Volledige JSON is de veilige keuze voor exact behoud van alle velden en geschiedenis. Sync is geen versiearchief: een verwijdering synchroniseert ook.

Bij “Update klaar”: sluit **alle** Helder-tabs en geïnstalleerde appvensters, en open opnieuw. De bestaande IndexedDB-collectie blijft staan. De lege publicatiestart wist bestaande lokale gebruikersdata niet.

## Verder vibecoden

- `src/model.js`: collectie, scopefilters, daglimiet, queue en validatie.
- `src/learning.js`: lesfasen en scheiding tussen herkenning/geheugenevidentie/toepassing.
- `src/study-ui.js`: studeer- en swipe-schermen.
- `src/exploration-ui.js`: groepsverkenning, definitie-eerst en brug naar zelf ophalen.
- `src/email-ui.js`: aanmelden, registratie en herstel zonder secrets in de collectie.
- `src/curriculum*.js`: niveaus, hoofdstukken, namen en vakoverzicht.
- `src/sync-core.js`: pure driewegmerge, snapshot-CAS, conflicten, accountbinding.
- `src/cloud.js`: optionele Supabase-client; `backend/supabase.sql`: eigenaarafscherming.
- `styles.css`: basistokens/chrome; `product.css`: V3.1-productcomponenten.
- `src/parser.js`: Markdown/TSV/CSV import/export.
- `vendor/`: lokaal gebundelde FSRS en officiële Supabase SDK, met licenties.

`npm test` draait pure Node-tests zonder extra installatie. Browser-/databasetests vereisen optionele testtools; zie [TESTRESULTATEN.md](docs/TESTRESULTATEN.md).

Bij een volgende release: verander versie, alle browser-importquery’s, stylesheets en de cache in `sw.js` samen. V3.1 versieert **alle** gewijzigde module-imports zodat een nog actieve V2-cache geen oude modellen aan de nieuwe UI kan geven. Gebruik geen `skipWaiting` midden in een leerbeurt.

## Bewuste grenzen

Geen AI-semantische beoordeling, automatische persoonlijke FSRS-optimalisatie, media-upload, openbaar setplatform, pushmeldingen of docentdashboard. De sync gebruikt gebatchte collectiesnapshots, geen schaalbaar record-delta-protocol. Maximaal 8 MB per cloudsnapshot; grotere collecties blijven lokaal werken. Geen universeel “beste leerapp”-bewijs: de onderzoeksbasis onderbouwt onderdelen, niet deze volledige combinatie.
