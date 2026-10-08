# Helder 2 — product- en UI-ontwerp

## Doel

Een webapp die op een telefoon als een rustige leerplek aanvoelt, niet als een verkleinde desktopsite. Niet meer decoratie, wel een duidelijker onderscheid tussen **oriënteren**, **een set kiezen**, **zelf antwoorden** en **controleren**.

## 1. Navigatie die voorspelbaar blijft

Op desktop biedt de sidebar overzicht. Op mobiel staan vier stabiele bestemmingen onderaan: Vandaag, Bibliotheek, Met ster en Meer. Dat maakt hoofdacties met één hand bereikbaar. De actieve bestemming heeft een tekstlabel, kleur én een zachte achtergrond achter het icoon.

Meer opent een ruime drawer voor mappen, moeilijke kaarten, uitleg en instellingen. De achtergrond wordt inert; focus blijft in de drawer. Escape en het sluiticoon brengen de focus terug. De mappen blijven dezelfde hiërarchische mappen uit versie 1 — geen tweede organisatie- of filtermodel.

## 2. Vandaag is een startpunt, geen scorebord

De blauwe module toont de **werkelijke eerstvolgende ronde** en haar verdeling tussen nieuwe kaarten en herhalingen. De drie rustige cijfers eronder tonen de huidige dagplanning. ‘Gedaan’ telt beoordelingen, niet gegarandeerd beheerste begrippen. We gebruiken geen streaks, punten of ‘100% geleerd’-claims.

Setnamen, locatie en kaartenaantal hebben voorrang op beschrijving. In het mobiele startscherm verdwijnen herhalende beschrijvingen; de volledige bibliotheek bewaart ze. De hele set-tegel is een klik-/tapdoel.

## 3. Leren heeft een andere chrome

Tijdens een ronde verdwijnen bovenbalk, bottom tabs en desktopsidebar. Stoppen, setnaam, positie en voortgang blijven duidelijk. De mobiele kop blijft tijdens scrollen bovenaan beschikbaar. Zo verandert de gebruiker niet per ongeluk van bestemming terwijl die nadenkt.

De kaart heeft één taak: vraag → eigen poging → modelantwoord. De leermodus vergelijkt geen letterlijke strings en pretendeert geen filosofische antwoorden automatisch te beoordelen. De bestaande hintregels, kennismaking en FSRS-beoordeling zijn behouden.

## 4. De vaste leerbediening mag niets verbergen

Op een normale telefoon staan de vier ratings op één rij. Onder 360 px worden het twee rijen: geen kleinere tekst of te kleine knoppen. Elke knop toont zowel een naam als het volgende interval; kleur is aanvullend. Goed krijgt de blauwe primaire stijl, maar is geen automatisch gegeven antwoord.

De bediening wordt gemeten, niet op een magisch vast getal gegokt. De leesruimte krijgt via `--study-dock-height` voldoende onderruimte. Lange uitleg, uitgeklapte begripschecks en eigen antwoorden kunnen dus volledig boven die bediening scrollen. Een toetsenbord dat via `visualViewport` zichtbaar ruimte inneemt, schakelt naar normale flow. Test dit gedrag altijd op echte telefoons vóór een productie-release.

## 5. Editors zijn sheets met geleidelijke opties

De mobiele editor gebruikt de breedte van het scherm, met afgeronde bovenrand en een vaste header en footer. Alleen de formulierinhoud scrollt. Eerst komen naam, invoermethode, kaarttype en vraag/antwoord. Map/beschrijving en hint/bron/extra begripsvraag zijn uitklapbaar. Bestaande extra waarden openen hun sectie automatisch bij het bewerken.

Het oorspronkelijke importcontract blijft geldig: Markdown, TSV/Quizlet en CSV, met dezelfde foutmeldingen en preview. Opslaan bewaart ook de laatste kaart die nog niet expliciet aan het concept is toegevoegd.

## 6. Eén visuele taal

- System-sans; geen externe fontbestanden.
- Body 16 px, uitleg tijdens leren 17–18 px; kleine tekst minimaal 14 px.
- Neutrale warme canvas, witte kaarten en één blauwe primaire accentkleur.
- Groen, oranje en rood uitsluitend voor betekenisvolle status of beoordeling.
- Spatiëring in 4/8/12/16/24/32/48; standaard radii 8 px, grotere oppervlakken 12 px.
- Raakvlakken minimaal 44 × 44 px, zichtbare focus, safe-area-insets, reduced motion en donker thema.
- Invoerveldgrenzen hebben meer contrast dan decoratieve kaartranden. De geteste tekst- en controlkleurparen voldoen aan de gebruikte AA-drempels; dit is geen volledige toegankelijkheidscertificering.

## 7. Onderweg, zonder valse synchronisatie

Een HTTPS-site maakt de app buitenshuis bereikbaar. De status ‘Offline gereed’ volgt de geactiveerde offline-installatie; zonder netwerk verandert die naar ‘Je bent offline’. Bij een bestaande installatie toont ‘Update klaar’ dat de nieuwe cache gereed is maar nog op activatie wacht. Sluit dan alle appvensters en open opnieuw. Het vinkje betekent **niet** dat er een cloudback-up is. Via de statusknop krijgt de gebruiker de installatie- en back-upuitleg.

De voortgang blijft lokaal, per browser-origin. Geen account, backend, automatische synchronisatie of tracking. Als je later sync toevoegt, ontwerp dan eerst conflictoplossing en back-upgedrag — niet alleen een ‘sync’-icoon.

## Verder bouwen

- `styles.css`: tokens en component-/responsive stijlen. Geen tweede stylesysteem nodig.
- `src/interface.js`: chrome, focus en viewportmetingen. Houd datamodel en scheduler erbuiten.
- `src/app.js`: schermen en editors.
- `tests/browser-mobile.mjs`: regressies voor drawer, dock, sheets, thema en offline gebruik.

Geen publiek beschikbare ‘beste leerapp’-garantie: deze versie is een zorgvuldig gebouwde, lokaal werkende basis. Echte iPhone-/Android-tests en eventueel synchronisatie blijven vervolgstappen.
