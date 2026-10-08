# Privésynchronisatie — Helder 3.1 met e-mail

## Jouw configuratie staat al klaar

`config.json` bevat al de verstrekte project-URL `https://eblzstvfbmvzcqylbjps.supabase.co`, de verstrekte **publishable** key en `"providers": ["email"]`. Er is geen Google/GitHub-setup nodig. Deze key is bedoeld voor de frontend; het is geen databasewachtwoord, SMTP-key of beheerderskey. De app weigert `sb_secret_` en `service_role`.

**Uitlezend live gecontroleerd:** het project accepteert de key (Auth settings HTTP 200), Email is actief, registratie is toegestaan en e-mailbevestiging staat aan. De collectietabel bestaat; een anonieme SELECT werd geweigerd. Er is geen account aangemaakt, e-mail verstuurd, collectie gewijzigd of dashboardinstelling aangepast. Deze controle bewijst niet dat SMTP werkt of dat alle live RLS/RPC-instellingen correct zijn.

## Stap 1 — Publiceer eerst de app

Upload de inhoud van de appmap naar één vast HTTPS-adres, bijvoorbeeld:

- eigen website: `https://jouwdomein.nl/leren/`
- GitHub Pages: `https://jouwnaam.github.io/helder/`

Gebruik consequent hetzelfde adres, inclusief submap en slash. De Supabase-project-URL is **niet** het adres waarop je Helder opent. Maak vóór een appupdate een JSON-back-up en sluit daarna alle oude appvensters/tabs.

## Stap 2 — Controleer de database

Open jouw Supabase-project → SQL Editor. Voer `backend/supabase.sql` uit als je dit schema nog niet precies hebt ingesteld. Het script maakt/update de noodzakelijke tabel, policies en functies; het wist geen bestaande collecties. Kopieer geen sleutel of databasewachtwoord naar SQL/ frontend.

Het schema heeft:

- één rij per account, gekoppeld aan `auth.users`;
- eigenaar-RLS voor SELECT (`auth.uid() = user_id`);
- geen toegang voor `anon` en geen directe tabelwrite voor gewone accounts;
- writes via `helder_push`, met verwachte revision (CAS) en maximaal 8 MB;
- een publieke SECURITY INVOKER-wrapper en een private, pinned SECURITY DEFINER-helper met expliciete accountcontrole;
- `ON DELETE CASCADE` bij accountverwijdering.

Voeg het schema `private` **niet** toe aan Exposed schemas. Een publieke key zonder goede policies beschermt niets. [RLS-documentatie](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Stap 3 — E-mailprovider en app-URL

In Authentication → Sign In / Providers: laat Email ingeschakeld. Laat bevestiging van het e-mailadres aan. Je hoeft geen OAuth-provider te activeren.

In Authentication → URL Configuration:

1. **Site URL:** jouw echte gepubliceerde appadres, bijvoorbeeld `https://jouwdomein.nl/leren/`. Niet `https://eblzstvfbmvzcqylbjps.supabase.co`.
2. **Redirect URLs:** voeg datzelfde exacte appadres toe.
3. Voeg ook de herstelvariant toe: `https://jouwdomein.nl/leren/?auth_recovery=1`.
4. Alleen voor lokale tests kun je apart `http://localhost:4173/` en `http://localhost:4173/?auth_recovery=1` toevoegen. Productie blijft HTTPS.

De frontend gebruikt de officiële Supabase SDK (lokaal meegeleverd). E-mail/wachtwoord gaat naar Supabase Auth over HTTPS. Aanmelden blijft per apparaat bewaard; op een gedeeld apparaat meld je na gebruik af. Wachtwoorden staan niet in de kaarten, de cloudcollectie of exports. [Password Auth](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Stap 4 — Mailbezorging: eigen SMTP voor andere gebruikers

De standaard Supabase-maildienst is niet voor publieke productie: alleen teamadressen, momenteel twee e-mails per uur en geen productiegarantie. Voor andere gebruikers moet je een eigen SMTP-provider instellen onder de Auth/email-/SMTP-instellingen van het project. Dashboardlabels kunnen veranderen.

Vul daar de SMTP-host/poort, afzender en SMTP-credentials van jouw mailprovider in. Die credentials blijven **alleen in het Supabase-dashboard**, nooit in `config.json` of de repository. Controleer afzender-/domeinverificatie, spam, quota en actuele kosten van de mailprovider. Zet e-mailbevestiging niet uit om bezorging te omzeilen. [SMTP-documentatie](https://supabase.com/docs/guides/auth/auth-smtp).

Deze SMTP-configuratie kan ik niet afleiden uit een publishable key; ze is nog niet live gecontroleerd.

## Stap 5 — Links die ook in een andere browser werken

De standaard PKCE-link kan een verifier uit de browser van de registratie nodig hebben. Je wilt vaak de mail op je telefoon openen terwijl je op de computer registreerde. Daarom zijn token-hash-templates meegeleverd:

- **Authentication → Email Templates → Confirm signup:** plak `backend/email-templates/confirm-email.html`.
- **Reset password:** plak `backend/email-templates/reset-password.html`.

Deze templates gebruiken `{{ .SiteURL }}` en een eenmalige `{{ .TokenHash }}`. De client controleert die hash met `verifyOtp`. Kopieer de templatevariabelen letterlijk; vervang ze niet door een echte token. Stel Site URL dus eerst correct in. Bevestiging opent de accountinstellingen; herstel vraagt om een nieuw wachtwoord. De token wordt daarna uit de URL verwijderd. Een verlopen link geeft een duidelijke fout, geen herstelsessie.

Behandel echte bevestigings-/herstellinks als privé; stuur ze niet door of in chat. Bevestiging/herstel met mocks is getest, maar de echte template-uitrol en mailbezorging nog niet.

## Stap 6 — Bewust verbinden op beide apparaten

1. Open Helder online → Instellingen → Je apparaten → **Aanmelden met e-mail**.
2. Kies **Account maken** als je nog geen account hebt. Bevestig via de e-mail. Registratie/herstel geven een generieke melding; die onthult niet of een account bestaat.
3. Meld aan. Klik vervolgens **Verbind deze bibliotheek** en bevestig. Pas nu mogen bestaande lokale kaarten naar jouw eigen account.
4. Open Helder op het tweede apparaat en meld aan met dezelfde account. Kies daar ook verbinden; een lege browser downloadt dan jouw cloudcollectie.
5. Test een tweede, andere account: die begint leeg en mag jouw kaarten niet zien.

Afmelden & lokaal wissen verwijdert de lokale collectie/binding/conflictkopie, niet de cloudcollectie. Exporteer eerst nog niet gesyncte wijzigingen. Een ander account/project dan de opgeslagen binding wordt geblokkeerd; er wordt niet stilzwijgend werk van een vorige gebruiker geüpload.

## Syncgedrag en grenzen

- Iedere kaart/grade wordt eerst lokaal opgeslagen. Offline leren blijft mogelijk.
- Na circa 30 seconden rust, bij terugkeer/verbinding, of via Nu synchroniseren wordt gecontroleerd. Iedere zichtbare minuut is er slechts een kleine revisioncheck.
- Geen inkomende toepassing tijdens leren of een open editor; sync wacht daarop.
- Verschillende velden/kaarten worden drieweg samengevoegd. Hetzelfde tekstveld op twee apparaten vraagt om een keuze, met downloads van beide versies.
- FSRS-planning is één atomair geheel, niet een gemiddelde van twee plannen. Niet-gekozen parallelle pogingen blijven inactief bewaard.
- Onverenigbare structuur/verwijderingen vragen om een expliciete keuze; geen stil verlies.
- Thema en typ-/denkmodus blijven per apparaat. Kaarten, structuur, overige leerinstellingen en logboek worden gedeeld.
- Dit is **snapshot-sync**, geen grootschalig delta-/CRDT-platform. Boven 8 MB stopt cloud-push zonder lokale data te wissen.
- Twee offline apparaten kunnen gezamenlijk boven een ingestelde nieuwe-kaartlimiet uitkomen; er is geen serverreservering van dat dagbudget.
- Sync is geen historisch back-upbestand: verwijderingen/resets/herstel synchroniseren mee. Maak ook onafhankelijke JSON-back-ups.
- Tokens staan in aparte IndexedDB-devicekeys. Geen eigen PIN-encryptie of end-to-end encryptie; browserveiligheid/XSS en hostingbeheer blijven relevant.
- Het gratis Supabase-plan heeft quota/inactiviteitspauze; controleer de actuele [prijzen](https://supabase.com/pricing). Geen belofte van onbeperkte gratis productie.

## Nog uit te voeren live acceptatie

1. Registratie, bevestiging op ander apparaat, onjuiste login, herstel en verlopen links via **echte mail**.
2. Twee echte accounts: B kan ook via een aangepaste REST-request met zijn eigen token geen gegevens van A lezen.
3. Twee apparaten: kaart toevoegen, beoordelen, opnieuw openen; vervaldatum en dagbudget kloppen.
4. Offline beide apparaten: verschillende kaarten wijzigen → terug online → geen verlies; dezelfde kaart wijzigen → conflictkeuze.
5. Afmelden/accountwissel, tokenvernieuwing en niet-toegestane redirect-URL.
6. Echte iPhone Safari/Android Chrome, toetsenbord, installatie, offline en opslagquota.
7. Eigen privacyverklaring/accountverwijdering en passend beheer als anderen de app gebruiken.

Lokaal zijn de officiële SDK en gesimuleerde Auth/REST-responses getest; het SQL-script is uitgevoerd in echte lokale Postgres/PGlite met gecontroleerde authclaims. Dat is geen bewijs van jouw live JWT-/SMTP-/policy-configuratie.
