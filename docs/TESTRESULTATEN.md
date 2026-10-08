# Testresultaten — Helder 3.0

## Wat daadwerkelijk is gecontroleerd

- **69 pure Node-tests: geslaagd, geen overgeslagen tests.**
- **Browser-smoke:** 7 geslaagde controlegroepen, met meerdere assertions per groep.
- **Aanvullende mobiele browsercontroles:** 7 geslaagde controlegroepen.
- **Sync-integratie:** 8 geslaagde controlegroepen tegen nagebootste REST/Auth-responses, met de echte gebundelde Supabase SDK.
- **Database:** 7 geslaagde controlegroepen in echte lokale Postgres via PGlite.
- **V2 → V3:** 3 geslaagde upgradecontroles tegen de bestaande V2-broncode en bibliotheek op hetzelfde websiteadres.
- **Herimport:** 50 + 382 eerdere kaarten behouden hun zeven inhoudsvelden exact; beide Markdown-bestanden en de JSON-back-up worden door V3 geaccepteerd. De private export is niet onderdeel van dit publieke apppakket.
- **Publicatie:** starter is `[]`, config bevat geen project of secrets en geen bekende private exportbestanden zijn aanwezig.
- **Offlinebestanden:** alle 37 unieke cacheverwijzingen geven HTTP 200; scripts hebben het juiste JavaScript-contenttype. Transitive browsermodule-imports zijn versiegebonden.

Deze aantallen zijn **geen opgeteld totaal van onafhankelijke tests**: browsercontrolegroepen bevatten verschillende assertions. Alle hieronder beschreven succesvolle browserflows eindigden zonder ongehanteerde JavaScript-runtimefouten. Dit is geen volledige security-, toegankelijkheids- of schaalbaarheidscertificering.

## Pure tests

`tests/model.test.mjs`, `tests/parser.test.mjs`, `tests/v3.test.mjs`.

Bestaande parser-/model-/FSRS-tests zijn behouden: Markdown/TSV/CSV, quotes en meerdere regels, BOM/CRLF, metadata, duplicaten, invulcodes, veilige tekstweergave, roundtrip, mappen, scopes, sterren, daglimieten, sibling-burying, reset en serialized schedules.

V3 voegt onder meer toe:

- lege publicatie, optionele eigen herkennings- en toepassingsvragen;
- validatie van vraagopties, ontbrekende afsluiters en vakmetadata vóór opslag;
- numerieke niveauvolgorde, niveau/hoofdstuk/scopeselecties en onbeperkte nieuwe kaarten;
- kennismaken versus ophalen en aparte oefenlogs;
- gespreide aanwijzingen: alleen zelfstandige, actieve herhalingen, op verschillende dagen én minstens 24 uur uit elkaar; niet alleen een kalender-middernacht;
- geen prototype-keys in niveau-/hoofdstuknamen;
- tokens en apparaatspecifieke instellingen niet in cloudsnapshots;
- onafhankelijke wijzigingen samenvoegen, timestampmetadata zonder valse conflicten;
- FSRS-planning als atomair conflict, behoud van niet-actieve logtakken;
- ongeldige samengevoegde verwijzingen/cycli en accountwissels blokkeren;
- CAS-revisioncontrole op twee apparaten;
- late netwerkresponses kunnen een afgemelde collectie niet herstellen.

## Browser: normale leer- en beheerflows

`tests/browser-smoke.mjs`:

1. Nieuwe browser begint leeg; optioneel voorbeeldvak importeert vijf kaarten met extra oefeningen.
2. Niveaus en hoofdstukken hebben eigen velden en leesbare labels; selectie werkt.
3. Horizontaal slepen markeert gekend/nog niet, ongedaan maken werkt en FSRS blijft exact gelijk.
4. Kennismaken → herkenning met feedback → ophalen. Herkenning schrijft geen FSRS-beoordeling; hulp wordt bij de ophaalpoging geregistreerd.
5. Toepassingszelfcheck heeft een apart log en verandert de geheugenplanning niet.
6. Nieuwe-kaartlimiet kan uit; kennismakingssteun kan ook uit.
7. 320-pixelweergave heeft geen horizontale pagina-overflow; geen runtimefouten.

`tests/browser-mobile.mjs`:

1. Drawer houdt toetsenbordfocus binnen en Escape sluit hem met focusherstel.
2. Ongeldige import toont een fout en schrijft geen kaarten.
3. Niveau- en hoofdstukfilters snijden elkaar; lege selectie blijft bruikbaar.
4. Einde van een lang modelantwoord is bereikbaar **boven** de vaste actiebalk.
5. Chromium-touch-events voeren daadwerkelijk een horizontale swipe uit.
6. Donker/licht thema, geselecteerd niveau, tablet en 320 px worden gecontroleerd.
7. Na offlinecache-opbouw werkt een echte offline reload met de geïmporteerde inhoud.

Nieuwe editorvelden worden ook gecontroleerd op minimaal 48 px veldhoogte en 16 px tekst. Kaartlijstpadding en de toegankelijke importfoutstatus worden eveneens geassert. Tijdens visuele controle is de styling van ongetypeerde tekstvelden en URL-velden gecorrigeerd en opnieuw getest.

## Sync: geïntegreerde client, nagebootste dienst

`tests/browser-sync.mjs` gebruikt twee gescheiden browsercontexten voor dezelfde testaccount en een derde voor een andere account. De officiële SDK is echt; config, OAuth-session en REST-responses zijn lokaal nagebootst. Er zijn geen echte accounts, projecten of keys gebruikt.

Gecontroleerd: expliciet verbinden vóór upload; downloaden op apparaat twee; lege andere account; offline wijzigingen aan verschillende kaarten samenvoegen; conflict op dezelfde tekst stoppen en bewust oplossen; tokens ontbreken in collectie/cloudpayload; afmelden wist lokaal maar verwijdert niet de cloudcollectie; geen runtimefouten.

**Dit bewijst niet dat een live OAuth-provider, redirects, RLS in jouw project of tokenvernieuwing op een echte telefoon juist zijn ingesteld.** Voer de acceptatielijst in [SYNC.md](SYNC.md) uit na configuratie.

## Database: echte lokale Postgres

`tests/database-security.mjs` voert het geleverde `backend/supabase.sql` uit in PGlite 0.3.14. `auth.uid()` gebruikt gecontroleerde testclaims. Gecontroleerd:

1. Eerste geauthenticeerde RPC-write.
2. Oude revision weigert overschrijven.
3. Directe tabelwrite is niet toegestaan.
4. Andere account ziet de rij van de eigenaar niet.
5. Andere account krijgt een eigen lege collectie.
6. Anonieme reads en writes worden geweigerd.
7. Ongeldige payload wordt geweigerd.

Dit is een databaseprivilegetest, **geen test van live JWT-verificatie, Supabase-infrastructuur of een volledige externe security-audit**.

## Upgrade, export en visuele inspectie

De bestaande V2-app werd eerst gebruikt om instellingen te wijzigen en één kaart te beoordelen. Daarna serveerde hetzelfde lokale websiteadres V3. Kaarten, notities, FSRS-schedules, beoordelingen, instelling en revision bleven gelijk. V3 werd correct weergegeven terwijl de V2-worker nog actief was; na het sluiten van de tabs werd de nieuwe cache actief en werkte offline herladen met dezelfde bibliotheek.

De private herimport werd apart met de V3-parser en het model gecontroleerd: twee sets, 432 kaarten, geen beoordelingen, verse planning; geen inhoudsverlies in kind/front/back/tags/hint/explain/source.

Screenshots zijn individueel bekeken voor leeg beginnen, vakoverzicht, kaartlijst, kennismaken, herkenningsvraag, ophalen, toepassen, swipen, editor, importfout, drawer, lang antwoord, syncconflict en ongeconfigureerde sync in donker thema. Formaten: 390 × 844, 320 × 844, desktop 1440 × 1000 en tablet 768 × 1024. Het screenshots-voorbeeldvak is openbaar demonstratiemateriaal, niet de eerdere private kaarten.

## Zelf uitvoeren

De app en pure tests vereisen alleen Node ≥ 20; geen dependency-installatie of frontendbuild:

```sh
npm test
npm run test:public
npm start
```

Voor de optionele browser-/Postgres-tests, in een tweede terminal:

```sh
npm install --no-save playwright @electric-sql/pglite
npx playwright install chromium
npm run test:browser
npm run test:sync
npm run test:database
```

Testtools zijn geen runtime-dependencies van de app. `test:sync` is een mocktest en meldt je niet aan bij een externe dienst. Gebruik een lokale ontwikkelserver met lege `starter.json`.

Optionele omgevingsvariabelen:

- `TEST_URL`: standaard `http://127.0.0.1:4173`, andere poort/submap mogelijk.
- `TEST_OUTPUT`: standaard `test-output/`; screenshots en alleen testdiagnostiek.
- `CHROMIUM_BIN`: bestaande Chromium-binary in plaats van de Playwright-installatie.
- `PLAYWRIGHT_MODULE` / `PGLITE_MODULE`: alternatieve geïnstalleerde modulepaden.
- `CHROMIUM_NO_SANDBOX=1`: alleen voor een afgeschermde testcontainer die dat nodig heeft; niet als normale desktopinstelling.

## Nog niet getest

- Live Supabase OAuth-aanmelding, echte productieconfiguratie en netwerkquota.
- Fysieke iPhone/Android, hun virtuele toetsenborden en geïnstalleerde PWA-gedrag.
- Alle schermlezers/browsercombinaties of een volledige WCAG-audit.
- Grote gebruikersaantallen, schadelijke belasting en externe security-penetratietests.
- Onderwijseffect van deze gehele app. De bronnen onderbouwen onderdelen; een gebruikstest en uitgestelde kennis-/transfertoets zijn nog nodig.
