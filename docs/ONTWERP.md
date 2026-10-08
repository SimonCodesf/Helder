# Productontwerp — Helder 3

## Richting

Een rustig gereedschap, geen gamified dashboard. Eén duidelijke actie per studiecontext. Neutralen en één blauw accent; groen/oranje/rood uitsluitend voor herkenbare feedbackbetekenissen. System sans, body 16 px, bijtekst minimaal 14 px, touch targets minimaal 44 px. Geen foto’s/stockillustraties die niets aan de taak toevoegen.

## Mobiele informatiearchitectuur

- Lege app: een echte startpagina, niet een dashboard met zes nulstatistieken. Maak een set of importeer kaarten.
- Vandaag: één volgende ronde, drie simpele tellers, vakken om verder te gaan.
- Bibliotheek: vakmappen en sets. In een set: Overzicht en Kaarten, niet alle categorieën verborgen in een dropdown.
- Overzicht: niveaukaarten, uitleg wat de selectie doet, hoofdstukken met een directe leeractie.
- Kaarten: zoekveld, niveau/hoofdstuk en overige tags; filters gelden ook voor de oefenknoppen.
- Onderste hoofdnavigatie blijft in duimbereik. Studie verbergt de algemene chrome en houdt stop/progress/context bovenin.

## Studie

Kennismaken, herkennen en ophalen hebben eigen schermen; hulp wordt niet in een onoverzichtelijke alles-in-één-card gepropt. Herkenning heeft expliciete antwoordfeedback; daarna verdwijnen de opties. Toepassingen hebben scenario/model/kernpunten en een aparte zelfcheck. Geen impliciete "mastery percentage".

De fixed study-dock wordt gemeten met ResizeObserver. De body reserveert die werkelijke hoogte zodat het laatste deel van een lang model scrollbaar blijft. Via visualViewport kan de dock bij een open schermtoetsenbord terug in de flow; fysieke iPhone/Android-acceptatie blijft nodig. Bij 320 px worden ratings 2×2, bij 390 px één rij. Safe-area insets zijn ondersteund.

Swipe-kaarten gebruiken pointer-events met horizontale drempel/dominantie en `touch-action: pan-y`. Verticaal lezen mag geen markering geven. Een horizontale beweging krijgt een tekststempel, niet alleen kleur. Knoppen en toetsen doen exact dezelfde sorteeractie. Undo is zichtbaar; de status zegt dat dit geen herplanning is.

## Editors

Mobile bottom sheet, vaste kop/voettekst en eigen scrollbody. Niveau/hoofdstuk zijn gewone velden. Hint, herkenning en toepassing zijn optionele uitklapsecties: beginners worden niet gedwongen om tien extra velden in te vullen. Een tussentijdse invoer wordt bij tabwissel niet verloren. Import heeft preview en concrete foutmeldingen.

## Sync

Offline-readiness en sync zijn verschillende toestanden. De optionele apparatenknop verschijnt alleen bij backendconfiguratie. Instellingen toont echte statuses: unbound, pending, synced, offline, conflict, error of account-mismatch. Niet-geconfigureerde sync wordt niet voorgesteld als werkende live koppeling. Eerste upload is een bewuste bevestiging. Conflictvenster vergelijkt beide versies, heeft downloads en vereist een keuze.

## Toegankelijkheid en grenzen

Semantische headers/nav/buttons/progress/labels/details/dialog. Zichtbare focus, Escape/focus-terugkeer voor drawer/dialog, background inert bij drawer, keyboardalternatieven voor swipes. Donker thema en reduced motion. Contrast gebruikt de gecontroleerde basistokens; de laatste code-/browserchecks staan in TESTRESULTATEN.md. Geen volledige WCAG-audit of native telefoonclaim.
