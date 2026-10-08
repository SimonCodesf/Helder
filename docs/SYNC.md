# Privésynchronisatie — setup en grenzen

## Wat geleverd is

Een werkende optionele client, officiële lokaal gebundelde Supabase JavaScript SDK 2.117.3, SQL-schema, Postgres-eigenaarafscherming en CAS-RPC. Geen project, keys of live account van de gebruiker zijn aangemaakt. `config.json` staat bewust leeg. De default-app verstuurt geen kaarten naar een backend.

## Gratis beginnen, niet onbeperkt

Supabase biedt momenteel een gratis plan met onder meer 500 MB database, 5 GB egress, maximaal twee actieve projecten en pauzering na een week inactiviteit. Voor een persoonlijke app is dat een bruikbaar startpunt, maar het is geen garantie op gratis productiehosting of onbeperkte gebruikers. Controleer de actuele voorwaarden/quota. [Prijzen](https://supabase.com/pricing).

De standaard mailserver is **niet voor publieke productie**: hij verstuurt alleen naar teamadressen, met een zeer laag uurquotum. Daarom gebruikt deze app Google/GitHub OAuth, zonder wachtwoord- of magische-linkformulier op de statische site. Wil je later email-login toevoegen, configureer eerst eigen SMTP, verificatie en herstelstromen. Zet emailverificatie niet uit als “oplossing”. [SMTP-beperkingen](https://supabase.com/docs/guides/auth/auth-smtp).

## Instellen

### 1. Eigen project

Maak op Supabase een project aan. Kies een geschikte regio. Beveilig het beheerdersaccount, bewaar het databasewachtwoord privé. Projectaanmaak en eventuele kosten zijn jouw keuze; dit pakket doet niets automatisch.

### 2. Schema

Plak `backend/supabase.sql` in de SQL-editor en voer uit.

- `public.helder_collections`: één rij per geauthenticeerde gebruiker.
- RLS SELECT: alleen wanneer `auth.uid() = user_id`.
- `anon`: geen tabeltoegang en geen push-RPC.
- `authenticated`: alleen SELECT op de tabel; schrijven gaat via de gecontroleerde RPC.
- Publieke RPC `helder_push`: SECURITY INVOKER.
- Private helper: SECURITY DEFINER in het **niet-exposed** schema `private`, lege/pinned search_path, alle tabelnamen volledig gekwalificeerd, expliciete `auth.uid()`-controle. Voeg `private` niet toe aan Exposed schemas.
- `p_expected` voorkomt stale writes; maximaal 8 MB per payload.
- `auth.users`-verwijdering ruimt de gekoppelde rij op via ON DELETE CASCADE.

[RLS-documentatie](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 3. Loginproviders

Activeer Google en/of GitHub onder Authentication → Sign In / Providers.

Voor GitHub: maak een OAuth App aan. De callback-URL is de URL die Supabase toont, gewoonlijk `https://PROJECT.supabase.co/auth/v1/callback`, **niet** je Pages-URL. Vul client-ID en client-secret alleen in het Supabase-dashboard in. Voor Google maak je een OAuth-client aan met de door Supabase opgegeven callback. Publiceer/controleer de OAuth-consentinstellingen voor externe gebruikers.

Zet onder Authentication → URL Configuration:

- Site URL: je vaste HTTPS-adres, inclusief submap.
- Redirect URLs: exact hetzelfde appadres (en eventueel een exacte `index.html`-variant die je gebruikt).
- Lokale tests: optioneel exact `http://localhost:4173/`; productie blijft HTTPS.

De client gebruikt PKCE, de officiële SDK verzorgt code-uitwisseling, tokenopslag, vernieuwing en de authstatus. De redirect gaat terug naar dezelfde app; er is geen backendroute nodig op GitHub Pages.

[GitHub OAuth](https://supabase.com/docs/guides/auth/social-login/auth-github), [Supabase Auth](https://supabase.com/docs/guides/auth).

### 4. Publieke frontendconfiguratie

```json
{
  "supabaseUrl": "https://JOUWPROJECT.supabase.co",
  "publishableKey": "sb_publishable_JOUW_PUBLIEKE_KEY",
  "providers": ["google", "github"]
}
```

Haal URL/publishable key uit je eigen projectinstellingen. Een oude `anon` JWT-key is ook ondersteund; de client weigert `service_role` en `sb_secret_` keys. Een publieke key is **geen** vervanging voor RLS. Plaats nooit databasewachtwoorden, OAuth-secrets, service-role-keys of aanmeldtokens in config, chat of git.

`config.json` wordt netwerk-eerst geladen en offline gecachet. Publiceer de aangepaste configuratie en open eenmaal online opnieuw. Bij wijzigingen aan de appcode volg je de gezamenlijke versiebump uit README.

### 5. Bewust verbinden

Instellingen → Je apparaten → Aanmelden met Google/GitHub. Daarna **Verbind deze bibliotheek**. Bestaande lokale kaarten worden pas na die bevestiging naar je eigen account gestuurd. Meld op elk apparaat dezelfde account aan.

Lege browser + bestaande cloudaccount → cloudcollectie komt terug. Een nieuwe account → lege cloudcollectie, tenzij jij bewust je bestaande lokale kaarten eraan verbindt. Dezelfde inhoud met verschillende kaart-ID’s wordt niet “slim” ontdubbeld; exporteer eerst en controleer bij het samenvoegen.

## Syncgedrag

- Elke kaart/grade wordt eerst atomair lokaal opgeslagen; leren blijft offline werken.
- Na circa 30 seconden rust, bij terugkeer naar de app/verbinding, of via Nu synchroniseren, wordt gecontroleerd.
- Tijdens een leerbeurt of open editor wordt geen inkomende collectie toegepast. Sync wacht tot je buiten de studie/editor bent.
- Iedere zichtbare minuut wordt alleen de kleine revisiemetadata gecontroleerd. De hele snapshot wordt pas opgehaald als die revisie verandert, of verstuurd bij eigen wijzigingen.
- Verschillende kaarten of verschillende tekstvelden worden drieweg samengevoegd. `updatedAt`-metadata veroorzaakt geen vals conflict.
- Gelijktijdige wijzigingen aan hetzelfde tekstveld vragen om een keuze.
- FSRS-planning is een **atomair geheel**: stabiliteit/moeilijkheid/vervaldatum worden niet uit twee plannen gemixt of gemiddeld. Voor twee offline beoordelingen van dezelfde kaart kiest de gebruiker een consistente branche. Andere pogingen blijven in het logboek, expliciet inactief en uitgesloten van voortgang/statistiek.
- Bij onverenigbare verwijderingen/structuur/templatewijzigingen pauzeert sync en vraagt om een hele-collectiekeuze. Er wordt niets stilzwijgend weggegooid.
- Beide oorspronkelijke versies kunnen vanuit het conflictvenster als tokenvrije JSON worden gedownload; de laatste conflictsnapshots blijven lokaal bewaard tot afmelden.
- Een lokale wijziging tijdens fetch wordt via revision-CAS gedetecteerd. Een stale tab moet herladen; ze kan niet over een nieuwere IndexedDB-snapshot heen schrijven.
- Afmelden & lokaal wissen laat de cloudcollectie staan, maar wist de lokale collectie, binding en lokale conflictkopie. Maak een back-up van nog niet gesyncte werk voordat je dat bevestigt.
- Ander account/project dan de lokale binding: sync wordt geblokkeerd. De app uploadt niet zomaar de kaarten van de vorige gebruiker.
- Thema en typ-/denkmodus blijven per apparaat. Kaarten, niveaus/hoofdstukken, overige leerinstellingen en leerlogboek worden gedeeld.

## Wat je zelf moet accepteren vóór publicatie

Dit zijn **live acceptatietests**, niet iets wat dit pakket al namens jou heeft uitgevoerd:

1. Twee echte gebruikers: gebruiker B kan geen kaarten van A lezen, ook niet met aangepaste REST-URL’s en zijn eigen token.
2. Twee echte apparaten: kaart op computer toevoegen → telefoon; telefoon beoordelen → computer; dagbudget en due dates controleren.
3. Beide apparaten offline: verschillende kaarten aanpassen, opnieuw verbinden, geen verlies.
4. Dezelfde vraag/kaart tegelijkertijd veranderen/beoordelen: conflictvenster, downloads en keuze testen.
5. Afmelden en accountwissel: geen upload van een vorige lokale account.
6. PKCE-login, tokenvernieuwing, providerfouten, blokkade van niet-toegestane redirect-URL.
7. Installeren/offline op echte iPhone Safari en Android Chrome, inclusief opslag-/quota-/inactiviteitsgedrag.
8. Opt-in, accountafscherming en eventuele privacyverklaring passend bij jouw publieke website.

## Grenzen

- Offline apparaten kunnen samen meer nieuwe kaarten introduceren dan één daglimiet; de teller wordt na sync samengevoegd. Dit is geen harde, servergereserveerde quota. Kalenderdagen volgen de tijdzone van het apparaat.
- Dit is gebatchte **snapshot-sync**, niet een record-delta-/CRDT-systeem. Geschikt als basis voor persoonlijk gebruik, niet bewezen schaalbaar voor duizenden actieve gebruikers. Een efficiënte delta-outbox/compaction is een volgende schaalstap.
- Lang logboek → grotere payload. Boven 8 MB faalt cloud-push zonder lokale data te wissen. Exporteren/lokaal leren blijft beschikbaar.
- Netwerkverlies/free-projectpauze kan sync verhinderen; lokaal werk blijft staan. Controleer providerquota en maak backups.
- Sync is geen historische backup: verwijderingen, resets en JSON-herstel gaan ook naar andere apparaten. Handmatige JSON-export bewaart een onafhankelijke kopie.
- Tokens worden in aparte IndexedDB-devicekeys bewaard, niet versleuteld met een eigen app-PIN. Browser-/apparaatbeveiliging en XSS-preventie blijven essentieel. Geen end-to-end encryptie: jij en je hostingprovider kunnen de serverdata beheren.
- Het lokale SQL-testmodel gebruikt twee gecontroleerde authclaims in Postgres; dit test RLS/CAS, **niet** de echte externe OAuth/JWT-verificatie van Supabase. De officiële SDK is gebruikt, maar de live providerkoppeling is nog niet bevestigd.
