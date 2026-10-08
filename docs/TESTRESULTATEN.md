# Testresultaten — Helder 3.1

## Daadwerkelijk geslaagd

- **88 pure Node-tests**, nul mislukt/overgeslagen (69 bestaande + 19 nieuwe).
- **14 browsercontrolegroepen:** normale flow (7) en aanvullend mobiel (7).
- **4 verkenningscontrolegroepen:** definitie-eerst, apart vrij verkennen, ondersteuning/overslaan, offline.
- **9 e-mailcontrolegroepen:** echte gebundelde SDK, uitsluitend lokaal gesimuleerde Auth-responses.
- **8 synccontrolegroepen:** echte SDK en drie browsercontexten, gesimuleerde REST/Auth.
- **7 databasecontrolegroepen:** geleverd SQL-script in echte lokale Postgres/PGlite, gecontroleerde authclaims.
- **3 upgradecontroles V2 → V3.1:** behoud inhoud/planning/reviews/settings/revision; nieuwe modules met oude worker; offline na activering.
- **Herimport:** 50 + 382 eerdere kaarten, exact behoud van front/back/kind/tags/hint/explain/source; volledige 432-kaarten-JSON wordt geaccepteerd. Die bestanden zijn niet in het publieke pakket opgenomen.
- **Publicatie:** lege starter `[]`, alleen een publieke publishable key, geen bekende privé-exportbestanden.
- **41 unieke offlinebestanden:** HTTP 200 en correcte JavaScript-MIME. Browsermodule-imports/style/cache hebben versie 3.1.0.

Aantallen zijn geen opgeteld totaal van onafhankelijke toetsen: browsergroepen bevatten meerdere assertions. Succesvolle flows eindigen zonder ongehanteerde JavaScript-runtimefouten. Dit is geen security-/WCAG-/schaalcertificering en geen meting van leereffect.

## Pure tests

`tests/model.test.mjs`, `parser.test.mjs`, `v3.test.mjs`, `exploration.test.mjs`.

Bestaand: parser/import/export, invulcodes, veilige tekstweergave, maps/scopes, dagbudget, sibling-burying, reset, FSRS, curricula, snapshots/CAS, driewegmerge/conflicten, accountbinding en late reacties na logout.

Nieuw: kleine groepen blijven bij set/niveau/hoofdstuk; herhalingen eerst; overgeslagen groepen tellen niet als bekeken/hulp; daadwerkelijk bekeken steun geldt voor alle kaarten uit die groep; definitie → term met exacte masking; gewone vragen/invul niet zomaar omkeren; expliciete term; authored MC vóór reverse; geen verzonnen opties; standalone warm-up verandert planning niet; `verken-term:` roundtrip; letterlijke `Term:`-antwoordtekst blijft inhoud; geldige groepsgroottes en oude defaults; e-mailprovider/private-key-afwijzing; SDK-methoden en herstelguard.

## Browser — leer- en beheerflow

`tests/browser-smoke.mjs` controleert leeg beginnen, optioneel voorbeeld importeren, labels/niveau/hoofdstuk, swipe/undo zonder FSRS-wijziging, groepsverkenning → authored choice/feedback → reverse → recall, alleen recall schrijft geheugenreview, aparte toepassingslog, onbeperkt/steun uit, 320 px en runtimefouten.

`tests/browser-mobile.mjs` controleert drawer-focus/Escape, concrete importfout zonder opslag, filterdoorsnede, lange antwoorden bereikbaar boven gemeten dock, echte Chromium touch-swipe, licht/donker, 320/390/tablet en offline reload. Editorvelden zijn minimaal 48 px hoog/16 px tekst. Asynchrone overgangswachttijden in de tests zijn gecorrigeerd; dit verandert de appbeoordelingen niet.

## Browser — verkennen

`tests/exploration-browser.mjs` importeert drie optionele begrippen. Definitie wordt vóór term getoond. Zelfcheck en aparte ronde bewaren alleen oefenmetadata, geen FSRS-beoordeling. Skip markeert geen bekeken hulp. Instelbare groepsgrootte één en recent-help-Easy-blokkade werken. Nieuwe modules blijven beschikbaar bij werkelijk offline herladen.

## Browser — e-mail

`tests/email-browser.mjs` gebruikt de **echte officiële SDK**, maar onderschept alle Auth-verzoeken met fake `.test`-accounts/keys/tokens. Geen echte registratie, mail of Supabase-write.

Gecontroleerd: Email-only knop; gelabelde passwordformulieren/touchtargets; registratie vraagt bevestiging; veilige credentialfout en leegmaken passwordvelden; generieke herstelmelding zonder accountenumeratie; login blijft unbound vóór expliciete sync; token-hash-recovery op een nieuwe browser met URL-cleanup; wachtwoordwijziging vóór sync; bevestiging zonder lokale PKCE-verifier; verlopen token geeft geen herstelsessie; smalle dark-dialog zonder overflow. Passwords/tokens ontbreken in collectie/export. Standaard live PKCE-mail, SMTP en echte JWT-verificatie zijn hiermee niet bewezen.

## Sync en database

`tests/browser-sync.mjs`: twee apparaten dezelfde account + derde andere account. Expliciete opt-in vóór upload; download; lege andere account; verschillende offline edits samenvoegen; hetzelfde veld vraagt een keuze; tokenvrije payload; logout wist lokaal maar niet cloud; geen runtimefouten.

`tests/database-security.mjs`: eerste geauthenticeerde RPC-write; stale revision afgewezen; directe tabelwrite verboden; account B ziet A niet; eigen lege collectie B; anon reads/writes verboden; malformed payload geweigerd. Authclaims zijn lokaal gecontroleerd, niet extern geverifieerde Supabase-JWT’s.

## Live alleen uitlezend gecontroleerd

Met de verstrekte publishable key gaf de publieke Auth-settings-endpoint HTTP 200: alleen Email actief, signup toegestaan, bevestiging aan. De tabel bestaat en anon SELECT werd geweigerd. Geen account/mail aangemaakt, geen kaarten geüpload, geen beheerinstellingen gewijzigd. **Niet bewezen:** SMTP, authenticated RLS/RPC van jouw live project, echte apparaat-sync/redirects. Zie de acceptatielijst in [SYNC.md](SYNC.md).

## Visuele controle

Individueel geïnspecteerde echte appbeelden: lege start, verkenningsstart, MC + foutfeedback, definitie-eerst + zelfcheck, bridge/rondeeinde, recall, toepassen, swipe, kaartenlijst, editor, importfout, drawer, lang antwoord, geconfigureerde e-mailstatus in donker, login/register/notices/herstel/verlopen link, 320 px, tablet en desktop. Mobiel 390 × 844, smal 320 × 844, tablet 768 × 1024, desktop 1440 × 1000. De verplichte capture-helper renderde ook de echte lokale app in een 390-px-frame. Geen stockbeelden; alleen taakgerichte UI/iconen.

Tijdens QA aangepast en opnieuw gerenderd: verkenning begint op 0/n, niet op een misleidend n/n; foutoptie heeft een rood X naast de tekst/rode grens, juiste optie een groen vinkje. Geen bekende overflows/overlappen in de geïnspecteerde states. Dit is geen volledige WCAG-audit.

## Zelf uitvoeren

App en pure tests hebben geen build/dependency-installatie nodig (Node ≥ 20):

```sh
npm test
npm run test:public
npm start
```

Voor optionele browser/database-tests, in een tweede terminal:

```sh
npm install --no-save playwright @electric-sql/pglite
npx playwright install chromium
npm run test:browser
npm run test:exploration
npm run test:email
npm run test:sync
npm run test:database
```

Testtools zijn geen runtime-dependencies. Default `TEST_URL=http://127.0.0.1:4173`; screenshots naar `test-output/`. Optioneel: `TEST_OUTPUT`, `CHROMIUM_BIN`, `PLAYWRIGHT_MODULE`, `PGLITE_MODULE`. `CHROMIUM_NO_SANDBOX=1` alleen in een afgeschermde testcontainer.

## Niet getest / niet beweren

Live mailaanmelding/bezorging/tokenvernieuwing en productiequota; fysieke iPhone/Android/virtueel toetsenbord/PWA-opslag; volledige schermlezer/WCAG-dekking; duizenden gebruikers/penetratietest; daadwerkelijke verbetering van uitgestelde kennis of transfer door deze hele app. Bronnen onderbouwen onderdelen, niet het volledige product.
