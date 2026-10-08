# Helder 3 — architectuur

## Platform

Statische HTML/CSS/ES-modules; geen bundlestap voor de app. Alleen de officiële Supabase SDK is vooraf als één browsermodule gebundeld. Geen runtime-CDN, fonts, advertenties of AI-diensten. Node/Python dienen uitsluitend als ontwikkelserver; productie kan statische HTTPS-hosting zijn.

## Data en compatibiliteit

Schema blijft `version: 1`, IndexedDB `helder-v1`, store `state`, key `collection`. V1/V2-back-ups blijven leesbaar. Nieuwe optionele velden: activities, note.learning, set.curriculum, card.practiceMark/practiceAt en instellingen dailyLimit/scaffold/application. Validatie vult ontbrekende defaults aan. Nieuwe publieke browsers starten leeg; een update wist bestaande lokale kaarten niet.

`saveCollection(value, expectedRevision)` gebruikt een IndexedDB-transactie met CAS. Mutaties lopen via een promise-chain. BroadcastChannel meldt gewijzigde andere tabs; een stale tab schrijft niet over nieuwere data.

`folders → sets → notes → cards → reviews/activities`. Een reverse/cloze-notitie maakt meerdere kaarten. Scopefilters snijden set/folder/tag/level/chapter/search. Nieuwe kaarten: bestaande setvolgorde, numeriek niveau, dan invoervolgorde. Urgente leer-/herhaalkaarten komen eerst. Siblings worden tot volgende lokale kalenderdag begraven.

## Twee leerlagen

- `scheduler.js` / `vendor/fsrs.mjs`: echte geheugenplanner. Alleen recall-ratings veranderen de FSRS-state.
- `learning.js`: lesfasen, recent gebruikte hulp en gespreide ophaalevidentie. Geen getraind tutoringmodel.
- `study.js`: UI-sessiequeue/ronde, geen tweede geheugenmodel.
- `study-ui.js`: orientation/introduction/recognition/recall/application en flashcards.
- `activities`: recognition/application/practice-uitkomsten. Geen getypte vrije antwoorden of fake semantische scores.

Nieuwe vraagvormen vragen betrouwbare content. Choice: auteur schrijft prompt, options, correct-index, feedback. Application: prompt, modelantwoord, rubric. De front/back-canonieke recallprompt blijft gelijk voor een consistente FSRS-planning. Reverse templates gebruiken geen forward-only extra oefening.

## Voortgang

Een swipe-mark is geen FSRS-rating. Een first-time of geholpen poging is geen uitgestelde onafhankelijke toets. Gespreide evidentieregel: twee verschillende kalenderdagen en minstens 24 uur tussen zonder steun als correct beoordeelde reviews; geen beheersingsgarantie. Inactieve parallelle reviews na syncconflict worden uitgesloten van statistieken.

## Sync

`sync-core.js` is transportonafhankelijk en puur testbaar. Het maakt een tokenvrije cloudsnapshot en een driewegmerge tussen laatst opgehaalde base, lokale wijzigingen en remote. Deviceprefs theme/answerMode blijven lokaal. Cloudtransport gebruikt Supabase REST via de officiële SDK; PKCE, authopslag en vernieuwing komen van de SDK.

Nieuwe opt-in binding: userId + project-URL. Binding aan ander account/project blokkeert sync. Metadata/OAuth-sessie staan in aparte `device:`-keys, nooit in de exporteerbare collectie. Na afmelden worden de lokale collectie/binding/conflictkopie gewist.

Normale sync: kleine revisiecheck → zo nodig snapshot lezen → 3-way merge → CAS toepassen lokaal → checkpoint remote base → push met verwachte serverrevision. Een raced remote push herhaalt met nieuwe base. Een raced local write wordt niet overschreven. Sync is gepauzeerd tijdens studie/editor. Batches na 30s rust; polling van metadata iedere zichtbare minuut. Bij netwerkfout blijft data lokaal.

Conflicten: tekstveld expliciete keuze; schedule atomair met consistente reviewbranch; overige parallelle attempts inactief maar bewaard. Structurele verwijdering/template-/mappencyclus vraagt whole-collectionkeuze. Herstelkopieën/downloads beschikbaar. Stop/cancel bij logout voorkomt dat een late netwerkreply lokale kaarten terugplaatst.

SQL: eigenaar-RLS voor reads, gecontroleerde versioned push via publieke INVOKER-wrapper/private DEFiner-helper met pinned search_path en auth.uid. Geen schrijfgrant voor anon/authenticated op de tabel. 8 MB payloadlimiet. Zie SYNC.md voor live beveiligingstests en schaalgrenzen.

## Offline releaseversies

Alle gewijzigde browsermodule-imports en stylesheets hebben een releasequery. Een nog actieve V2-worker kan geen unversioned V2-model aan de V3-entry serveren. De V3-worker precachet alle gebruikte modules/SDK/lege starter/documentatie; config.json is netwerk-eerst met lokale fallback. API-antwoorden en OAuth-tokens worden niet in de serviceworkercache geplaatst.

Geen forced skipWaiting tijdens leren. Bestaande worker blijft tot tabs gesloten worden; nieuw geladen versioned modules werken wel bij online update. Update readiness controleert de actuele releasecache, niet alleen navigator.serviceWorker.ready.

## Verder uitbreiden

1. Persoonlijke FSRS-optimizer met voldoende echte reviews.
2. Delta-sync/outbox, servervalideerde eventlog en compaction voor schaal.
3. Expliciete prerequisite-graph/voorbeeldrelaties, niet alleen numerieke niveaus.
4. Docent-/auteurtools om afleiders, scenario’s en rubrics inhoudelijk te controleren.
5. Echte uitgestelde leerproeven: begrip/transfer apart van engagement.

Geen onveilige shortcuts: geen secret keys in frontend, geen willekeurige generatie van antwoordopties, geen keywordgrade voor vrije uitleg, geen stil verlies bij syncconflict.
