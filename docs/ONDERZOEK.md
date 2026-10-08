# Hoe Helder 3 leren ondersteunt

## Conclusie vooraf

Niet “meer vraagsoorten = automatisch beter”. De sterkste basis is **succesvol actief ophalen, feedback en gespreide herhaling**. Voor nieuwe, complexe stof zijn begrijpelijke uitleg, voorbeelden en afbouw van hulp zinvol. Voor toepassing moet je ook toepassing oefenen; herkenning van een definitie meet dat niet. Het beste programma is materiaal- en doelafhankelijk. Helder 3 is een onderbouwde productkeuze, geen experimenteel gevalideerde universele winnaar.

Onderzoek is gescheiden van productinspiratie. Bij publicaties zijn de beschikbare volledige passages/overzichten of het abstract gebruikt; beperkingen worden niet weggewerkt. Geen claim dat alleen een app populariteit bewijst of een algoritme inzicht “meet”.

## 1. Ophalen, niet alleen opnieuw zien

Roediger & Karpicke (2006) vonden in tekstleertaken dat herlezen korte-termijnprestaties/vertrouwen kan verhogen, terwijl ophalen op latere toetsen juist voordeel oplevert. Dunlosky et al. (2013) beoordelen practice testing en distributed practice als technieken met hoge algemene bruikbaarheid, op basis van een brede literatuurreview. Hun oordeel geldt niet automatisch voor iedere vraag, leeftijd of app. [^https://profiles.wustl.edu/en/publications/test-enhanced-learning-taking-memory-tests-improves-long-term-ret][^https://www.whz.de/fileadmin/lehre/hochschuldidaktik/docs/dunloskiimprovingstudentlearning.pdf]

**Implementatie:** in een gewone herhaling zie je alleen de vraag. Je antwoordt vóór het model verschijnt. Typen is optioneel; een inhoudelijk serieus hardop antwoord is ook mogelijk. Er is geen trefwoordmatching die een filosofische parafrase fout noemt of losse sleutelwoorden als begrip goedkeurt.

**Niet verwarren:** antwoordopties helpen herkennen; dat is geen bewijs dat je het zonder die opties kunt produceren. Swipe-“gekend” heeft daarom geen automatische FSRS-rating.

## 2. Eerst begrijpen, dan hulp afbouwen

Atkinson, Renkl & Merrill (2003) onderzochten de overgang van uitgewerkte voorbeelden naar zelf problemen oplossen. Alleen stapsgewijs weghalen van oplossingsstappen hielp niet betrouwbaar voor verre transfer; combinatie met uitlegprompts voor het onderliggende principe gaf in hun twee experimenten betere transfer. Dit waren specifieke probleemoplossingstaken, geen bewijs voor een universele flashcardladder. Hier is het institutionele abstract geraadpleegd, niet de volledige methodedetails. [^https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-]

**Implementatie:**

1. Nieuwe kaart: kies uitleg of direct proberen. Bekende stof hoeft niet telkens opnieuw uitgelegd.
2. Uitleg: kern/model en verband leggen met bestaande kennis.
3. Indien door de auteur beschikbaar: een herkenningsvraag met 3–5 plausibele opties en feedback. Deze oefening schrijft geen FSRS-review.
4. Uitleg/opties verdwijnen; je haalt de kern zelf op.
5. Eerlijk vergelijken en een eerste FSRS-planning starten.

Dit is **onze ontwerpvertaling**, geen letterlijk uit de paper gekopieerd of gevalideerd protocol. Wie uitleg of antwoordopties net heeft gezien krijgt geen “Makkelijk”. Een expliciete hint dwingt “Opnieuw”. De poging wordt als ondersteund geregistreerd en telt niet als gespreide zelfstandige ophaalevidentie.

Geen willekeurige afleiders uit andere kaarten: een verwant filosofisch begrip kan deels waar zijn; een absurd antwoord meet gokgedrag, niet onderscheid. De auteur schrijft en controleert opties en uitleg. Zonder extra inhoud valt de app terug op uitleg + open ophalen, niet op verzonnen kwaliteit.

## 3. Gespreid terugkomen

Dunlosky’s overzicht ondersteunt spreiding boven massed practice voor veel materiaal. Het hangt van de beoogde onthoudduur en taak af welke intervallen handig zijn; er is geen enkel optimaal interval voor alle kennis. [^https://www.whz.de/fileadmin/lehre/hochschuldidaktik/docs/dunloskiimprovingstudentlearning.pdf]

**Implementatie:** de echte `ts-fsrs`-bibliotheek 5.4.2 kiest volgende geheugenoefeningen op basis van de beoordeling en de bestaande memory state. Standaard gewenste herinnering 0,90; learning steps 1m/10m, relearning step 10m, geen fuzz. De korte leerstappen worden niet kunstmatig naar voren gehaald om een ronde “af” te kunnen maken. [^https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md]

**Grenzen:** standaardgewichten, geen persoonlijke optimizer. FSRS schat herinnering van een prompt, niet inzicht, argumentkwaliteit of een examencijfer. “90%” is een modeldoel voor recall; niet 90% begrip. Een juiste onmiddellijke herhaling is niet hetzelfde als duurzame kennis.

## 4. Begrip en transfer vragen andere oefening

Butler (2010) vond voordelen van herhaalde tests met feedback op nieuwe inferentie-/toepassingsvragen. Pan & Rickard (2018) laten in een meta-analyse zien dat transfer van retrieval practice kan optreden, maar sterk afhangt van onder meer elaboratie, response congruency en succes op de oorspronkelijke toets. Publicatiebiasanalyses/condities maken simpele “testen draagt altijd overal over”-claims onhoudbaar. [^https://andymatuschak.org/files/papers/Butler%20-%202010%20-%20Repeated%20Testing%20Produces%20Superior%20Transfer%20of%20Learning%20Relative%20to%20Repeated.pdf][^https://pdf.retrievalpractice.org/transfer/Pan_Rickard_2018.pdf]

**Implementatie:** een apart scenario of vergelijking met modelredenering en kernpunten. Na gespreide correcte recall kan een door de auteur geschreven toepassing verschijnen. Los toepassen oefenen kan altijd. Zonder geschreven scenario geeft de app een open voorbeeld-/uitlegprompt en de oorspronkelijke definitie als referentie: er wordt dan géén nieuw objectief antwoord verzonnen.

Toepassingspogingen hebben hun eigen oefenlogboek. Ze verlengen niet automatisch de planning van de oorspronkelijke definitie. Vrije redeneringen vergelijk je zelf; geen AI-model dat overtuigend klinkende onzin als waarheid goedkeurt. Dit houdt geldkosten en privacy eenvoudiger, maar zelfbeoordeling blijft subjectief.

De producttrigger “ten minste twee dagen én 24 uur ertussen zonder hulp” en de wekelijkse heraanbieding zijn uitlegbare heuristieken. Geen specifiek gevalideerde beheersingsdrempels. Ze voorkomen in elk geval dat drie makkelijke antwoorden in één minuut als blijvende beheersing worden gepresenteerd.

## 5. Mengen, maar niet blind

Brunmair & Richter (2019) beschrijven in hun meta-analyse dat interleaving sterk taakafhankelijk is. Vooral onderscheid tussen categorieën kan profiteren; het is geen algemene instructie om nieuwe teksten of woordparen willekeurig door elkaar te gooien. Hier is de abstract-/metadataweergave gebruikt; niet de volledige betaalde paper. [^https://pubmed.ncbi.nlm.nih.gov/31556629/]

**Implementatie:** selecteer urgente herhalingen eerst, meng die vervolgens optioneel. Nieuwe stof volgt setvolgorde en daarbinnen numerieke niveauvolgorde. Een niveau is een **inhoudsgroep**, geen automatisch gemeten persoonlijke vaardigheid. Je kunt altijd een ander niveau/hoofdstuk kiezen; geen arbitraire slotjes op basis van meerkeuzescores.

Er is nog geen formele prerequisite-graph of automatisch cursusbegrip. Niveaus van een slecht opgebouwd deck maken geen goed curriculum; de auteur blijft verantwoordelijk.

## 6. Wat we van andere producten nemen

Dit zijn **productfuncties**, geen onafhankelijke effectiviteitsvergelijking. Productpagina’s kunnen marketingclaims bevatten. Geen ranglijst “beste app”.

| Product | Bruikbare ontwerpkeuze | Wat niet blind wordt overgenomen |
|---|---|---|
| Anki | Collection/decks/subdecks; notitie ≠ kaart; omgekeerd/cloze; tags; sibling-burying; echte planning. | Eén map voor elk klein thema; begrip reduceren tot een kaartrating. |
| Quizlet | Lage instap, duidelijke flip/swipe-bediening, herkenning naar geschreven vragen. | Betalen om een eenvoudige leerflow te krijgen; één impliciete “geleerd”-score voor alle vraagsoorten. |
| RemNote | Context/hiërarchie, kleine concept-/descriptorvragen en verbanden. | Iedere marketingclaim over “near-optimal” planning of “nooit vergeten”. |
| Mochi | Markdown-first, snelle import, tags/filters, linked context en cross-device idee. | Een complex tweede notitiesysteem opdringen voor een gewone set. |
| Duolingo | Korte sessies, passende uitdaging; **wanneer herhalen** scheiden van **wat/hoe oefenen**. | Birdbrain nabouwen zonder gelabelde oefeningen en grootschalige data; engagement gelijkstellen aan leren. |
| Brilliant | Eén kernconcept, actieve problemen, feedback, afbouw van steigers in zelfstandige oefening. | Stem-/wiskundetaken zonder meer generaliseren naar open filosofie; gamification als leerbewijs. |

Bronnen bij de tabel: Anki [editing](https://docs.ankiweb.net/editing.html) en [deck options](https://docs.ankiweb.net/deck-options.html); Quizlet [Learn-featurebeschrijving](https://quizlet.com/features/learn) (zoekresultaat geraadpleegd, live pagina time-out); RemNote [CDF](https://help.remnote.com/en/articles/6026154-structuring-knowledge-with-the-concept-descriptor-framework); Mochi [docs](https://mochi.cards/docs); Duolingo [Birdbrain](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/) en [HLR-paper](https://research.duolingo.com/papers/settles.acl16.pdf); Brilliant [learning principles](https://www.brilliant.org/about).

Helder heeft nu twee algoritmische lagen: **FSRS voor geheugenmomenten**, een expliciete, controleerbare **lesregisseur voor ondersteuning/vraagvorm**. Er wordt niet beweerd dat die tweede laag een getraind intelligent-tutorsysteem is.

## 7. Waarom niet gewoon meer gamification?

Een app moet herhaald gebruik gemakkelijk maken, maar een streak of veel swipes is geen kennistoets. Helder toont een concrete volgende ronde, kleine voortgangssignalen en wat nog aandacht vraagt. Geen levens, ranglijsten of verliesaversie om extra interacties af te dwingen. Dit is een ontwerp-/waardekeuze, geen aangetoonde wetenschappelijke superioriteit.

## 8. Wat is die 15 per dag?

15 is een **aanpasbare productdefault**, niet een onderzoeksuitkomst, betaalmuur of harde capaciteit. Ze beperkt alleen het aantal nieuw beoordeelde kaarten dat wordt ingepland. Onderhoudslast groeit met eerdere nieuwe kaarten; een bescheiden start voorkomt een onbedoelde reviewberg. “Bescheiden” is persoonlijk: vijf nieuwe complexe begrippen kunnen meer werk zijn dan vijftien eenvoudige termen.

- Aanpassen via Instellingen, presets 5/10/15/25 of eigen getal.
- Daglimiet uit = alle beschikbare nieuwe kaarten mogen gekozen worden.
- Daglimiet aan en 0 = alleen herhalen.
- Herhalingen hebben geen dagelijkse bovengrens; rondelimiet is apart.
- Offline sync heeft geen serverreservering: twee apparaten kunnen gezamenlijk boven één daginstelling uitkomen. Niet verkocht als harde quota.

## 9. Eerlijke voortgangstaal

| Signaal | Betekenis | Geen bewijs van |
|---|---|---|
| Gekend bij swipen | Jij herkent de kaart tijdens vrije oefening. | Zelfstandig recall later, toepassing. |
| Herkenningsvraag juist | Je koos de juiste geschreven optie. | Zonder opties produceren. |
| In opbouw | Kaart heeft al een geheugenplanning. | Beheersing. |
| Gespreid opgehaald | Op minimaal twee dagen en 24 uur uit elkaar zonder recente steun zelf als correct beoordeeld. | Een objectieve inhoudstoets of permanente beheersing. |
| Toepassing gelukt | Jij vergelijkt je redenering met model/kernpunten. | Gegarandeerde verre transfer. |

## 10. Aanbevolen volgende empirische stap

Test deze combinatie daadwerkelijk: zelfde inhoud/tijd, vooraf afgesproken uitgestelde toets (bijv. later zelfstandig uitleggen én een nieuw scenario), niet alleen clicks, tevredenheid of dagstreaks. Meet eerste-poging-correct, retentie na vertraging, kwaliteit van toepassingsredeneringen, tijd en ervaren belasting. Analyseer beginners/gevorderden apart. De huidige implementatie levert logboekstructuur, maar geen bewijs dat Helder 3 beter is dan alle alternatieven.

## Bronnen

[^https://profiles.wustl.edu/en/publications/test-enhanced-learning-taking-memory-tests-improves-long-term-ret]: Roediger & Karpicke (2006), Test-enhanced learning. https://profiles.wustl.edu/en/publications/test-enhanced-learning-taking-memory-tests-improves-long-term-ret
[^https://www.whz.de/fileadmin/lehre/hochschuldidaktik/docs/dunloskiimprovingstudentlearning.pdf]: Dunlosky et al. (2013), Improving Students’ Learning With Effective Learning Techniques. https://www.whz.de/fileadmin/lehre/hochschuldidaktik/docs/dunloskiimprovingstudentlearning.pdf
[^https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-]: Atkinson, Renkl & Merrill (2003), Transitioning From Studying Examples to Solving Problems. https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-
[^https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md]: ts-fsrs library documentation. https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md
[^https://andymatuschak.org/files/papers/Butler%20-%202010%20-%20Repeated%20Testing%20Produces%20Superior%20Transfer%20of%20Learning%20Relative%20to%20Repeated.pdf]: Butler (2010), Repeated Testing Produces Superior Transfer… https://andymatuschak.org/files/papers/Butler%20-%202010%20-%20Repeated%20Testing%20Produces%20Superior%20Transfer%20of%20Learning%20Relative%20to%20Repeated.pdf
[^https://pdf.retrievalpractice.org/transfer/Pan_Rickard_2018.pdf]: Pan & Rickard (2018), Transfer of Test-Enhanced Learning: Meta-Analytic Review and Synthesis. https://pdf.retrievalpractice.org/transfer/Pan_Rickard_2018.pdf
[^https://pubmed.ncbi.nlm.nih.gov/31556629/]: Brunmair & Richter (2019), Similarity Matters: A Meta-Analysis of Interleaved Learning and Its Moderators. https://pubmed.ncbi.nlm.nih.gov/31556629/
