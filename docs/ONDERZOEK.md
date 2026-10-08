# Waarom deze leermodus zo werkt

Onderzoeks- en ontwerpnotitie voor Helder 1.0. Onderzoek geraadpleegd op 7 oktober 2026. Dit is een onderbouwde ontwerpkeuze, niet de claim dat één app voor alle leerlingen en vakken bewezen de beste is.

## 1. Het doel: zelfstandig kunnen ophalen én begrijpen

Een kaart herkennen is niet hetzelfde als haar antwoord zelfstandig kunnen geven. In twee experimenten met teksten vonden Roediger en Karpicke dat opnieuw lezen beter kon werken op een test vijf minuten later, maar ophalen uit het geheugen beter werkte op tests na twee dagen of een week. Opnieuw lezen verhoogde bovendien het vertrouwen, ook wanneer het op de latere test slechter uitpakte. [^https://profiles.wustl.edu/en/publications/test-enhanced-learning-taking-memory-tests-improves-long-term-ret]

**In de app:** het antwoord blijft eerst verborgen; je typt of spreekt je eigen antwoord. Flashcards zijn een vrije verkenmodus zonder invloed op de planning. Bij een nieuw begrip kun je de uitleg eerst lezen en daarna weer verbergen. Die kennismaking is een praktische ondersteuning voor beginners, niet een afzonderlijk bewezen optimaal leerprotocol.

**Bewuste beperking:** geen automatische meerkeuzevragen met willekeurige filosofische definities als afleiders. Die kunnen verwarring veroorzaken en meten eerder herkenning. Meerkeuze is niet altijd slecht, maar goede afleiders vragen inhoudelijk ontwerp. Voor deze eerste versie krijgen zelfstandig formuleren en vergelijken prioriteit.

## 2. Gespreid oefenen is de basis

Dunlosky en collega's beoordeelden oefentoetsen en gespreide oefening als breed bruikbare technieken, op basis van hun overzicht van onderzoek. Dat ondersteunt het principe van oefenen over de tijd, maar bewijst niet dat een specifieke computerplanner voor ieder vak optimaal is. [^https://www.whz.de/fileadmin/lehre/hochschuldidaktik/docs/dunloskiimprovingstudentlearning.pdf]

**In de app:** niet elk begrip elke dag herhalen; vervallen kaarten krijgen voorrang. Nieuwe kaarten zijn begrensd op 15 per kalenderdag als praktische begininstelling. Een ronde bevat maximaal 20 kaarten, maar er is geen harde daglimiet op herhalingen. Beide getallen zijn aanpasbare productkeuzes, geen wetenschappelijk universele normen.

Een verkeerde kaart krijgt een echte toekomstige herhaaltijd. De app toont haar niet direct opnieuw om een leeg slot te vullen. Als de korte leerstap nog niet aan de beurt is, geeft de app dat aan. Dit voorkomt dat kortetermijnherkenning wordt voorgesteld als duurzame beheersing.

## 3. De planner: echte FSRS, geen zelfbedachte imitatie

Helder gebruikt de open-source bibliotheek **ts-fsrs 5.4.2**, lokaal meegeleverd onder de MIT-licentie. De bibliotheek houdt per oefenkaart onder meer moeilijkheid, stabiliteit en eerdere herhalingen bij. De openbare documentatie beschrijft `repeat()` voor voorvertoningen en `next()` voor een specifieke beoordeling. [^https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md]

De app gebruikt:

- gewenste herinnering: **0,90**;
- korte leerstappen: **1 minuut, 10 minuten**;
- herleren na vergeten: **10 minuten**;
- maximale interval: 36.500 dagen;
- standaard FSRS-parameters;
- `enable_fuzz: false` voor voorspelbare, testbare intervalvoorvertoningen.

De Anki-handleiding noemt 90% een redelijk startpunt tussen herinnering en hoeveelheid werk, adviseert korte leerstappen onder één dag en waarschuwt dat hogere gewenste herinnering de werklast sterk verhoogt. [^https://docs.ankiweb.net/deck-options.html]

**Wat dit niet betekent:** 90% is een doel van het herinneringsmodel bij geplande herhalingen; het is geen gemeten zekerheid, begripsscore of examenvoorspelling. Een adaptieve geheugenstaat per kaart is niet hetzelfde als een persoonlijk geoptimaliseerde parameterset. Parameteroptimalisatie op het eigen leerlogboek zit nog niet in deze app. Het getal moet dus niet als een belofte worden gelezen.

Aanpassen van gewenste herinnering beïnvloedt nieuwe beoordelingen. Bestaande vervaldata worden niet zonder toestemming retroactief herschreven.

## 4. Feedback en eerlijke zelfbeoordeling

Butler onderzocht in vier experimenten herhaald oefenen met ophalen versus opnieuw bestuderen. Na een week hielp ophalen niet alleen bij dezelfde vragen, maar ook bij nieuwe gevolgtrekkingsvragen. De studie benadrukt tevens het belang van feedback om fouten te corrigeren. Dit is steun voor retrieval practice met inhoudelijke feedback, geen bewijs dat een willekeurige app automatisch diep filosofisch inzicht oplevert. [^https://andymatuschak.org/files/papers/Butler%20-%202010%20-%20Repeated%20Testing%20Produces%20Superior%20Transfer%20of%20Learning%20Relative%20to%20Repeated.pdf]

**In de app:** eigen antwoord en modelantwoord staan naast elkaar in de leerstap. De app verlangt geen letterlijke kopie en gebruikt geen trefwoordscore als oordeel over lange definities. Je kiest:

| Keuze | Betekenis |
| --- | --- |
| Opnieuw | Vergeten, verkeerd of een belangrijk onderdeel ontbreekt. |
| Moeilijk | Inhoudelijk correct, maar met veel moeite. |
| Goed | Zelfstandig en voldoende volledig. |
| Makkelijk | Meteen en overtuigend correct. |

De Anki-handleiding maakt een cruciaal onderscheid: **Hard/Moeilijk betekent geslaagde herinnering**. Het gebruiken voor een vergeten antwoord geeft FSRS misleidende informatie. [^https://docs.ankiweb.net/deck-options.html]

Een gebruikte hint schakelt de drie geslaagde scores daarom uit. Na een kennismakingsstap is Makkelijk uitgeschakeld. Dat is een conservatieve productkeuze, niet een automatische diagnose. Eén laatste beoordeling kan ongedaan worden gemaakt; de vorige geheugenstaat en het doorschuiven van verwante kaarten worden dan teruggezet.

Typed antwoorden worden niet opgeslagen in het logboek; beoordelingen, tijdstip en kaartplanning wel. Zo bewaren we minder persoonlijke tekst.

## 5. Begrip vraagt ook uitleg, toepassing en vergelijkingen

Dunlosky en collega's beoordeelden zelfuitleg als veelbelovend maar minder breed onderbouwd dan ophalen en spreiding. Ze wijzen ook op de extra tijd die zulke oefeningen kosten. [^https://www.whz.de/fileadmin/lehre/hochschuldidaktik/docs/dunloskiimprovingstudentlearning.pdf]

**In de app:** een optionele begripscheck na het modelantwoord. Een kaart kan een specifieke opdracht bevatten, bijvoorbeeld: “Geef een eigen voorbeeld” of “Waarom is dit geen inductie?”. Een algemene prompt vervangt geen goed ontworpen vergelijkingsvraag. Wie toepassing wil oefenen, maakt het best expliciete toepassing-/contrastkaarten met een eigen modelantwoord.

**Niet gebouwd:** automatische analyse van argumenten, automatisch gegenereerde afleiders of een AI-begripsscore. Die zouden een model, extra kosten, toestemming voor gegevensverwerking en inhoudelijke kwaliteitscontrole vereisen.

## 6. Mengen: nuttig, niet magisch

Een meta-analyse van Brunmair en Richter laat zien dat het effect van afwisselend oefenen sterk afhangt van de aard van de leerstof. Voor visuele categorieën was de steun sterker; voor uiteenzettende teksten waren resultaten niet eenduidig en bij woorden kon geblokt oefenen gunstiger uitpakken. Daarom is “alles altijd willekeurig mengen” geen universele regel. Voor deze bron is de uitgevers-/PubMed-samenvatting uit zoekresultaten gebruikt; de volledige tekst was niet toegankelijk via de gebruikte lezer. [^https://pubmed.ncbi.nlm.nih.gov/31556629]

**In de app:** beschikbare herhalingen kunnen binnen de gekozen ronde door elkaar komen. Nieuwe kaarten volgen de invoervolgorde zodat het basisniveau niet willekeurig wordt ingehaald door examenvragen. Mengen kan uit. Via tags kun je gericht een onderwerp oefenen; via een bovenliggende map kun je meerdere sets samen bekijken.

Willekeurig mengen van kaarten is bovendien niet automatisch hetzelfde als de zorgvuldig ontworpen afwisseling van categorieën of probleemtypen in experimenten.

## 7. Wat we overnemen uit Anki's organisatie

De Anki-handleiding onderscheidt een collectie, decks/subdecks, notities en kaarten. Een notitie kan meerdere kaarten voortbrengen. Met `::` worden niveaus in een deckboom weergegeven; oefenen op een bovenliggend deck kan onderliggende decks meenemen. [^https://docs.ankiweb.net/getting-started.html]

Veel kleine decks kunnen onbedoeld de context van het antwoord weggeven. De handleiding raadt tags aan voor flexibele categorisatie; een notitie mag meerdere tags hebben, terwijl een kaart één deck heeft. Voor tijdelijke combinaties gebruikt Anki gefilterde decks. [^https://docs.ankiweb.net/editing.html]

**Helder vertaalt dat naar:**

- **Mappen:** brede hiërarchie, bijvoorbeeld Filosofie → Vakken.
- **Sets:** een stabiele verzameling notities; een set hoort bij één map.
- **Tags:** meerdere per notitie, met ondersteuning voor `niveau::1` of `hoofdstuk::H1`.
- **Dynamische filters:** tag, ster, moeilijkheid, zoektekst. Geen duplicatie of tijdelijk verplaatsen van kaarten nodig.
- **Notities en kaarten:** een gewone notitie maakt één kaart; een omgekeerde notitie twee; invulcodes kunnen meerdere kaarten maken.
- **Verwante kaarten:** na een beoordeling worden andere kaarten van diezelfde notitie tot de volgende lokale middernacht verborgen in de gewone leermodus. Dit sluit aan bij Anki's principe van het doorschuiven van siblings om directe antwoordaanwijzingen te voorkomen. Vrij oefenen kan ze wel laten zien. [^https://docs.ankiweb.net/deck-options.html]

Dit is een **geïnspireerd, vereenvoudigd systeem**, geen volledige Anki-kloon. Er is geen .apkg-import, geen template-editor, geen gedeeld kaarttype-register en geen compatibele Anki-synchronisatie. Mappen in Helder zijn containers; in Anki zijn parent decks zelf ook decks.

## 8. Grenzen en vervolgstappen

Helder 1.0 is een werkende lokale basis, geen onbeperkt geteste productieplatform.

1. Zelfbeoordeling kan te optimistisch zijn; goede kaarten, modelantwoorden en eerlijk scoren blijven belangrijk.
2. Lokaal opslaan is privacyvriendelijk, maar kwetsbaar voor het wissen van browsergegevens. JSON-back-ups zijn essentieel.
3. Verschillende apparaten/browsers/websiteadressen synchroniseren niet automatisch. Herstellen vervangt de collectie en voegt geen concurrerende logboeken samen.
4. De PWA-installatie en caching zijn gebouwd en lokaal in Chromium getest. Er is geen fysieke iPhone- of Androidtest uitgevoerd.
5. Default FSRS-parameters zijn nog niet persoonlijk getraind. Een optimizer zou een zinvolle volgende stap kunnen zijn.
6. De oorspronkelijke 432 filosofiekaarten zijn startmateriaal uit de vorige decks, geen nieuwe inhoudelijke audit van het volledige vak. Prefixtags werden omgezet naar echte tags; één duidelijke tikfout in “aporie” is verbeterd.
7. Audio, afbeeldingen, notifications, accounts en live samenwerking zijn bewust niet toegevoegd.

## Bronnen

- Roediger & Karpicke (2006), *Test-enhanced learning*, Psychological Science. DOI: 10.1111/j.1467-9280.2006.01693.x.
- Dunlosky et al. (2013), *Improving Students' Learning With Effective Learning Techniques*. DOI: 10.1177/1529100612453266.
- Butler (2010), *Repeated testing produces superior transfer of learning relative to repeated studying*. DOI: 10.1037/a0019902.
- Brunmair & Richter (2019), *Similarity matters*. DOI: 10.1037/bul0000209; samenvatting geraadpleegd.
- Officiële Anki-handleiding: Getting Started, Adding/Editing en Deck Options.
- Open Spaced Repetition, ts-fsrs: documentatie en meegeleverde broncode van versie 5.4.2.
