// Foto-Challenges für die Party. Jede Aufgabe = ein Foto mit jemandem/etwas.
// Ziel: die Gemeinschaft stärken, verbinden, Spaß haben — niemanden bloßstellen.
// Jede Aufgabe hat eine Kategorie (cat) und einen Text (text).
//
// `id` ist die stabile Identität einer Aufgabe (referenziert von
// guest_task_done, photos.task_id, task_stats) — NIE wiederverwenden, NIE
// vorhandene ids ändern. Neue Aufgaben bekommen die nächste fortlaufende id
// ans Ende des Arrays; bestehende Zeilen nicht umsortieren.

export const TASKS = [
  // — Der Klassiker —
  { id: 0, cat: 'Der Klassiker', text: 'Finde jemanden, den du noch nicht kennst, und posiert zusammen wie Rockstars.' },
  { id: 1, cat: 'Der Klassiker', text: 'Macht ein klassisches Gruppenfoto zu dritt – Arme umeinander, breites Grinsen.' },
  { id: 2, cat: 'Der Klassiker', text: 'Findet die perfekte Ecke für ein gemeinsames Selfie mit mindestens vier Leuten.' },
  { id: 3, cat: 'Der Klassiker', text: 'Macht ein Foto, auf dem alle in die Luft springen – gleichzeitig!' },
  { id: 4, cat: 'Der Klassiker', text: 'Stellt ein berühmtes Albumcover zu zweit nach.' },
  { id: 5, cat: 'Der Klassiker', text: 'Findet jemanden für ein feierliches Anstoßen und haltet den Moment fest.' },
  { id: 6, cat: 'Der Klassiker', text: 'Baut eine kleine Menschenpyramide (sitzend zählt auch!) und lasst euch ablichten.' },
  { id: 7, cat: 'Der Klassiker', text: 'Zwei Personen tragen eine dritte huckepack – festhalten!' },
  { id: 8, cat: 'Der Klassiker', text: 'Stellt eine berühmte Filmszene nach, die alle sofort erkennen.' },
  { id: 9, cat: 'Der Klassiker', text: 'Findet fünf Leute für ein Foto im Kreis, alle Köpfe zur Mitte geneigt.' },
  { id: 10, cat: 'Der Klassiker', text: 'Macht ein Fußball-Team-Jubelfoto, als hättet ihr gerade ein Tor geschossen.' },
  { id: 11, cat: 'Der Klassiker', text: 'Baut eine Reihe wie ein Sportteam vorm Anpfiff und grinst in die Kamera.' },
  { id: 12, cat: 'Der Klassiker', text: 'Macht ein Rücken-an-Rücken-Foto wie auf einem Actionfilm-Poster.' },
  { id: 13, cat: 'Der Klassiker', text: 'Stellt zu dritt das Cover eines Magazins nach – einer hält ein imaginäres Mikro.' },
  { id: 14, cat: 'Der Klassiker', text: 'Findet einen Spiegel und macht ein Spiegel-Selfie mit mindestens zwei Leuten.' },
  { id: 15, cat: 'Der Klassiker', text: 'Macht ein Foto, bei dem alle in dieselbe Richtung schauen – nur einer blickt in die Kamera.' },
  { id: 16, cat: 'Der Klassiker', text: 'Stellt eine altmodische Familienfoto-Pose nach, steif und ernst – dann alle lachen lassen.' },
  { id: 17, cat: 'Der Klassiker', text: 'Findet die größte Gruppe, die noch aufs Foto passt, und zählt laut mit.' },

  // — Der Zufall —
  { id: 18, cat: 'Der Zufall', text: 'Finde jemanden, der im selben Monat Geburtstag hat wie du. Gratuliert euch gegenseitig.' },
  { id: 19, cat: 'Der Zufall', text: 'Finde jemanden mit denselben Anfangsbuchstaben im Vornamen wie du.' },
  { id: 20, cat: 'Der Zufall', text: 'Finde jemanden, der genauso große (oder kleine) Schuhe trägt wie du.' },
  { id: 21, cat: 'Der Zufall', text: 'Finde jemanden, der im selben Sternzeichen geboren ist wie du.' },
  { id: 22, cat: 'Der Zufall', text: 'Finde jemanden, der aus demselben Ort kommt oder dort schon mal gewohnt hat.' },
  { id: 23, cat: 'Der Zufall', text: 'Finde jemanden, der dasselbe Lieblingsgetränk hat wie du. Prost!' },
  { id: 24, cat: 'Der Zufall', text: 'Finde jemanden, der heute dasselbe Verkehrsmittel benutzt hat wie du.' },
  { id: 25, cat: 'Der Zufall', text: 'Finde jemanden mit derselben Augenfarbe wie du.' },
  { id: 26, cat: 'Der Zufall', text: 'Finde jemanden, der denselben Beruf hat oder dasselbe studiert wie du.' },
  { id: 27, cat: 'Der Zufall', text: 'Finde jemanden, der heute ungefähr zur gleichen Uhrzeit aufgestanden ist wie du.' },
  { id: 28, cat: 'Der Zufall', text: 'Finde jemanden mit derselben Anzahl an Geschwistern wie du.' },
  { id: 29, cat: 'Der Zufall', text: 'Finde jemanden, der denselben Vornamen wie ein Familienmitglied von dir trägt.' },
  { id: 30, cat: 'Der Zufall', text: 'Finde jemanden, der schon mal im selben Land im Urlaub war wie du.' },
  { id: 31, cat: 'Der Zufall', text: 'Finde jemanden mit derselben Lieblingsjahreszeit wie du.' },
  { id: 32, cat: 'Der Zufall', text: 'Finde jemanden, der dieselbe Anzahl an Haustieren hat (oder hatte) wie du.' },
  { id: 33, cat: 'Der Zufall', text: 'Finde jemanden, der genauso oft schon auf einer Hochzeit war wie du.' },
  { id: 34, cat: 'Der Zufall', text: 'Finde jemanden mit demselben Lieblingsfach aus der Schulzeit.' },
  { id: 35, cat: 'Der Zufall', text: 'Finde jemanden, der dasselbe Betriebssystem auf dem Handy nutzt wie du.' },

  // — Das Outfit —
  { id: 36, cat: 'Das Outfit', text: 'Finde jemanden, der etwas in deiner Lieblingsfarbe trägt. Zeigt stolz auf die Kleidung.' },
  { id: 37, cat: 'Das Outfit', text: 'Finde jemanden mit den coolsten Schuhen des Abends und fotografiert sie zusammen.' },
  { id: 38, cat: 'Das Outfit', text: 'Finde zwei Leute, die zufällig etwas Ähnliches tragen – Partnerlook!' },
  { id: 39, cat: 'Das Outfit', text: 'Finde jemanden mit einem auffälligen Accessoire (Hut, Kette, Brille) und posiert damit.' },
  { id: 40, cat: 'Das Outfit', text: 'Tauscht für ein Foto ein Kleidungsstück oder Accessoire miteinander.' },
  { id: 41, cat: 'Das Outfit', text: 'Findet die eleganteste Person im Raum und macht ein Foto auf dem roten Teppich (auch ohne Teppich).' },
  { id: 42, cat: 'Das Outfit', text: 'Finde jemanden, der Karos, Streifen oder Punkte trägt, und feiert das Muster.' },
  { id: 43, cat: 'Das Outfit', text: 'Finde jemanden mit demselben Schmuckstück-Typ (Ohrring, Kette, Ring) wie du.' },
  { id: 44, cat: 'Das Outfit', text: 'Findet die auffälligste Frisur des Abends und lasst sie im Foto glänzen.' },
  { id: 45, cat: 'Das Outfit', text: 'Finde jemanden mit einer Uhr am Handgelenk und vergleicht die Uhrzeit fürs Foto.' },
  { id: 46, cat: 'Das Outfit', text: 'Finde zwei Personen mit komplett unterschiedlichem Stil und stellt sie nebeneinander.' },
  { id: 47, cat: 'Das Outfit', text: 'Finde jemanden, der etwas Selbstgemachtes trägt (Schmuck, Kleidung), und fragt nach der Geschichte dazu.' },
  { id: 48, cat: 'Das Outfit', text: 'Tauscht für ein Foto die Schuhe – auch wenn sie nicht passen.' },
  { id: 49, cat: 'Das Outfit', text: 'Findet die längste Kette aus Accessoires, die ihr an einer Person entdeckt, und zählt sie im Bild.' },
  { id: 50, cat: 'Das Outfit', text: 'Finde jemanden mit Hut oder Mütze und tauscht kurz die Kopfbedeckung fürs Foto.' },
  { id: 51, cat: 'Das Outfit', text: 'Findet zwei Personen in derselben Farbfamilie (nicht identisch, aber ähnlich) und stellt einen Farbverlauf nach.' },
  { id: 52, cat: 'Das Outfit', text: 'Finde die Person mit dem coolsten Outfit-Detail aus zweiter Hand (Vintage, geerbt, geliehen) und hört die Geschichte dazu.' },

  // — Das Talent —
  { id: 53, cat: 'Das Talent', text: 'Finde jemanden mit einem versteckten Talent und haltet es im Bild fest.' },
  { id: 54, cat: 'Das Talent', text: 'Finde jemanden, der jonglieren, pfeifen oder eine Grimasse ziehen kann – Beweisfoto!' },
  { id: 55, cat: 'Das Talent', text: 'Findet jemanden, der einen kleinen Tanzschritt zeigt, und tanzt mit.' },
  { id: 56, cat: 'Das Talent', text: 'Finde jemanden, der ein Tier täuschend echt imitieren kann. Macht das Foto im Moment.' },
  { id: 57, cat: 'Das Talent', text: 'Findet jemanden, der die Zunge rollen oder mit den Ohren wackeln kann.' },
  { id: 58, cat: 'Das Talent', text: 'Finde jemanden, der euch einen Zaubertrick zeigt, und fangt die Überraschung ein.' },
  { id: 59, cat: 'Das Talent', text: 'Finde jemanden, der ein Gedicht oder einen Zungenbrecher aufsagen kann.' },
  { id: 60, cat: 'Das Talent', text: 'Finde jemanden, der rückwärts zählen kann, während er balanciert.' },
  { id: 61, cat: 'Das Talent', text: 'Finde jemanden, der mit geschlossenen Augen deine Nase treffen kann.' },
  { id: 62, cat: 'Das Talent', text: 'Finde jemanden, der einen Akzent nachmachen kann, und lasst ihn kurz auftreten.' },
  { id: 63, cat: 'Das Talent', text: 'Finde jemanden, der pfeifen und gleichzeitig tanzen kann.' },
  { id: 64, cat: 'Das Talent', text: 'Finde jemanden, der einen Karten- oder Fingertrick kennt.' },
  { id: 65, cat: 'Das Talent', text: 'Finde jemanden, der ein Tier-Geräusch perfekt imitieren kann.' },
  { id: 66, cat: 'Das Talent', text: 'Finde jemanden, der einen Zungenbrecher schnell sprechen kann, ohne sich zu verhaspeln.' },
  { id: 67, cat: 'Das Talent', text: 'Finde jemanden, der euch eine Mini-Choreografie beibringt – nachmachen und festhalten.' },

  // — Die Crew —
  { id: 68, cat: 'Die Crew', text: 'Sammelt alle mit derselben Haarfarbe wie du für ein Team-Foto.' },
  { id: 69, cat: 'Die Crew', text: 'Findet alle, die heute zum ersten Mal hier sind, und macht ein Neulings-Foto.' },
  { id: 70, cat: 'Die Crew', text: 'Bildet eine Kette aus Händen mit mindestens fünf Leuten und fotografiert sie.' },
  { id: 71, cat: 'Die Crew', text: 'Findet drei Leute, die dasselbe Hobby haben wie du.' },
  { id: 72, cat: 'Die Crew', text: 'Versammelt alle, die schon einmal gemeinsam gereist sind, für ein Erinnerungsfoto.' },
  { id: 73, cat: 'Die Crew', text: 'Bildet die längste Menschenreihe, die ihr auf ein Foto bekommt.' },
  { id: 74, cat: 'Die Crew', text: 'Sammelt alle, die heute mit demselben Verkehrsmittel angereist sind.' },
  { id: 75, cat: 'Die Crew', text: 'Findet alle mit demselben Sternzeichen-Monat und bildet eine kleine Truppe.' },
  { id: 76, cat: 'Die Crew', text: 'Bildet eine Gruppe aus allen, die schon mal zusammen auf einer anderen Feier waren.' },
  { id: 77, cat: 'Die Crew', text: 'Sammelt alle mit Brille für ein „Durchblicker“-Gruppenfoto.' },
  { id: 78, cat: 'Die Crew', text: 'Findet die Crew, die gemeinsam angereist ist, und macht ein Ankunfts-Foto.' },
  { id: 79, cat: 'Die Crew', text: 'Bildet ein Team aus den lautesten Fans des Abends.' },
  { id: 80, cat: 'Die Crew', text: 'Versammelt alle mit demselben Vornamen-Anfangsbuchstaben zu einer Buchstaben-Gang.' },
  { id: 81, cat: 'Die Crew', text: 'Findet die größte Familien- oder Freundesgruppe im Raum und zählt laut mit für das Foto.' },
  { id: 82, cat: 'Die Crew', text: 'Bildet einen Kreis aus mindestens sechs Personen und fasst euch an den Schultern.' },
  { id: 83, cat: 'Die Crew', text: 'Findet zwei Personen, die sich heute zum ersten Mal treffen, und macht ihr Kennenlern-Foto.' },

  // — Die Geste —
  { id: 84, cat: 'Die Geste', text: 'Mach ein Kompliment und halte das Lächeln der Person im Foto fest.' },
  { id: 85, cat: 'Die Geste', text: 'Finde jemanden, dem du heute noch nicht Hallo gesagt hast, und begrüßt euch herzlich.' },
  { id: 86, cat: 'Die Geste', text: 'Umarmt euch zur Begrüßung und lasst den Moment fotografieren.' },
  { id: 87, cat: 'Die Geste', text: 'Bring jemandem einen Drink oder Snack und haltet die Übergabe im Bild fest.' },
  { id: 88, cat: 'Die Geste', text: 'Findet jemanden, dem ihr für etwas danken möchtet, und macht ein Dankeschön-Foto.' },
  { id: 89, cat: 'Die Geste', text: 'Bildet mit den Händen gemeinsam ein Herz und fotografiert es.' },
  { id: 90, cat: 'Die Geste', text: 'High five mit einer Person, die du heute zum ersten Mal triffst – im richtigen Moment ausgelöst.' },
  { id: 91, cat: 'Die Geste', text: 'Verschenke ein spontanes Kompliment an eine Person, die du kaum kennst, und haltet die Reaktion fest.' },
  { id: 92, cat: 'Die Geste', text: 'Bringt jemandem einen Stuhl oder Platz zum Sitzen und haltet die Geste fest.' },
  { id: 93, cat: 'Die Geste', text: 'Findet jemanden, der Hilfe beim Tragen oder Halten braucht, und packt mit an.' },
  { id: 94, cat: 'Die Geste', text: 'Stellt jemandem eine neue Person vor und macht ein Vorstellungs-Foto zu dritt.' },
  { id: 95, cat: 'Die Geste', text: 'Findet jemanden, der allein steht, und holt ihn in die Runde – Foto vom neuen Trio.' },
  { id: 96, cat: 'Die Geste', text: 'Schenkt jemandem ein Lächeln, das er nicht erwartet – Reaktion einfangen.' },
  { id: 97, cat: 'Die Geste', text: 'Findet zwei Leute, die schon lange befreundet sind, und lasst euch ihr Geheimnis fürs Zusammenhalten verraten – Foto dazu.' },
  { id: 98, cat: 'Die Geste', text: 'Fragt jemanden nach seinem Lieblingskompliment und schenkt es ihm für das Foto.' },

  // — Das Detail —
  { id: 99, cat: 'Das Detail', text: 'Findet zwei Leute mit demselben Getränk und stellt die Gläser nebeneinander.' },
  { id: 100, cat: 'Das Detail', text: 'Sucht das schönste Detail der Location und stellt euch davor.' },
  { id: 101, cat: 'Das Detail', text: 'Findet etwas Herzförmiges im Raum und posiert damit.' },
  { id: 102, cat: 'Das Detail', text: 'Findet die schönsten Blumen oder Deko und macht ein Foto damit.' },
  { id: 103, cat: 'Das Detail', text: 'Findet jemanden mit einem interessanten Ring oder Armband und rückt es ins Bild.' },
  { id: 104, cat: 'Das Detail', text: 'Baut aus Dingen auf dem Tisch ein kleines Kunstwerk und fotografiert es mit jemandem.' },
  { id: 105, cat: 'Das Detail', text: 'Findet das kleinste Detail der Deko und rückt es ganz nah ins Bild.' },
  { id: 106, cat: 'Das Detail', text: 'Sucht zwei Gläser mit demselben Füllstand und stellt sie wie Zwillinge nebeneinander.' },
  { id: 107, cat: 'Das Detail', text: 'Sucht die schönste Lichtquelle im Raum (Kerze, Lampe, Lichterkette) und posiert davor.' },
  { id: 108, cat: 'Das Detail', text: 'Findet ein Detail, das an den Anlass der Feier erinnert, und fotografiert es mit Bezug dazu.' },
  { id: 109, cat: 'Das Detail', text: 'Baut aus Servietten oder Deko eine kleine Skulptur und lasst jemanden stolz daneben posieren.' },
  { id: 110, cat: 'Das Detail', text: 'Findet das ungewöhnlichste Getränk auf dem Tisch und stellt es ins Rampenlicht.' },
  { id: 111, cat: 'Das Detail', text: 'Sucht ein Detail in Gold oder Glitzer und macht ein Glamour-Foto damit.' },
  { id: 112, cat: 'Das Detail', text: 'Findet zwei Dinge auf dem Tisch, die zufällig zusammenpassen, und arrangiert sie fürs Foto.' },
  { id: 113, cat: 'Das Detail', text: 'Sucht das gemütlichste Sitzplatz-Detail (Kissen, Decke, Kerze) und macht dort ein Foto.' },

  // — Der Moment —
  { id: 114, cat: 'Der Moment', text: 'Fangt einen ehrlichen Lachmoment zu zweit ein – erst quatschen, dann auslösen.' },
  { id: 115, cat: 'Der Moment', text: 'Findet jemanden zum Anstoßen und drückt genau beim „Kling“ ab.' },
  { id: 116, cat: 'Der Moment', text: 'Haltet den Moment fest, in dem ihr gemeinsam etwas Neues probiert.' },
  { id: 117, cat: 'Der Moment', text: 'Macht ein Foto mitten im Gespräch – natürlich, nicht gestellt.' },
  { id: 118, cat: 'Der Moment', text: 'Findet die gemütlichste Ecke der Party und macht dort ein entspanntes Foto zu zweit.' },
  { id: 119, cat: 'Der Moment', text: 'Fangt einen gemeinsamen Tanzmoment ein.' },
  { id: 120, cat: 'Der Moment', text: 'Fangt den Moment ein, in dem jemand zum ersten Mal heute richtig lacht.' },
  { id: 121, cat: 'Der Moment', text: 'Haltet fest, wie zwei Leute sich eine Geschichte erzählen – mitten im Erzählen.' },
  { id: 122, cat: 'Der Moment', text: 'Fangt einen Moment der Überraschung ein – etwa wenn jemand etwas Unerwartetes hört.' },
  { id: 123, cat: 'Der Moment', text: 'Haltet den Moment fest, in dem die Musik wechselt und alle reagieren.' },
  { id: 124, cat: 'Der Moment', text: 'Fangt ein Foto ein, während jemand singt oder mitsummt.' },
  { id: 125, cat: 'Der Moment', text: 'Haltet einen stillen, ruhigen Moment abseits der Party fest – zu zweit.' },
  { id: 126, cat: 'Der Moment', text: 'Fangt den Moment ein, in dem ein Drink nachgeschenkt wird.' },
  { id: 127, cat: 'Der Moment', text: 'Haltet fest, wie jemand herzlich über einen Witz lacht – Timing ist alles.' },
  { id: 128, cat: 'Der Moment', text: 'Fangt einen Moment gemeinsamer Konzentration ein, etwa bei einem Spiel oder Rätsel.' },
  { id: 129, cat: 'Der Moment', text: 'Haltet den Moment kurz vor einem herzlichen Lachanfall fest – bevor er richtig losbricht.' },

  // — Die Verbindung —
  { id: 130, cat: 'Die Verbindung', text: 'Finde jemanden und findet drei Gemeinsamkeiten heraus – dann ein Foto zusammen.' },
  { id: 131, cat: 'Die Verbindung', text: 'Lass dir von jemandem seinen Lieblingsort auf dem Handy zeigen und macht ein Foto dazu.' },
  { id: 132, cat: 'Die Verbindung', text: 'Finde die Person, die von am weitesten weg angereist ist, und feiert das im Bild.' },
  { id: 133, cat: 'Die Verbindung', text: 'Finde jemanden, der ein Instrument spielt, und macht ein Foto mit „Luftinstrument“.' },
  { id: 134, cat: 'Die Verbindung', text: 'Finde jemanden, der denselben Film liebt wie du, und stellt eine Szene nach.' },
  { id: 135, cat: 'Die Verbindung', text: 'Finde jemanden mit demselben Lieblingsessen und träumt gemeinsam davon (Foto!).' },
  { id: 136, cat: 'Die Verbindung', text: 'Lass dir einen Trick oder Life-Hack zeigen und haltet ihn im Bild fest.' },
  { id: 137, cat: 'Die Verbindung', text: 'Finde jemanden und tauscht die lustigste Anekdote der letzten Woche aus – dann ein Foto.' },
  { id: 138, cat: 'Die Verbindung', text: 'Finde jemanden, der dieselbe Lieblingsserie schaut wie du, und stellt eine Szene nach.' },
  { id: 139, cat: 'Die Verbindung', text: 'Finde jemanden mit einer ähnlichen Kindheitserinnerung und erzählt sie euch gegenseitig.' },
  { id: 140, cat: 'Die Verbindung', text: 'Finde jemanden, mit dem du ein Lieblingswort teilst (Dialekt, Running Gag), und benutzt es fürs Foto.' },
  { id: 141, cat: 'Die Verbindung', text: 'Finde jemanden, der dich an eine Person aus deinem Leben erinnert, und erklärt warum.' },
  { id: 142, cat: 'Die Verbindung', text: 'Finde jemanden mit einem ähnlichen Traumreiseziel und plant es kurz gemeinsam (Foto als „Buchung“).' },
  { id: 143, cat: 'Die Verbindung', text: 'Finde jemanden, der dir spontan ein Kompliment für dein bestes Talent gibt.' },
  { id: 144, cat: 'Die Verbindung', text: 'Finde jemanden und findet gemeinsam eine Sache, die ihr beide noch nie gemacht habt.' },

  // — Die Stimmung —
  { id: 145, cat: 'Die Stimmung', text: 'Macht gemeinsam die dramatischste Pose, die euch einfällt.' },
  { id: 146, cat: 'Die Stimmung', text: 'Findet das beste Licht im Raum und macht dort ein Foto zu zweit.' },
  { id: 147, cat: 'Die Stimmung', text: 'Zeigt zu dritt drei verschiedene Gefühle auf einem Foto.' },
  { id: 148, cat: 'Die Stimmung', text: 'Macht ein „So cool sind wir“-Foto mit Sonnenbrille (oder so getan als ob).' },
  { id: 149, cat: 'Die Stimmung', text: 'Stellt gemeinsam eure Lieblings-Emoji nach.' },
  { id: 150, cat: 'Die Stimmung', text: 'Findet jemanden für ein „Vorher/Nachher“ – erst ernst, dann albern, in einem Bild-Duo.' },
  { id: 151, cat: 'Die Stimmung', text: 'Macht ein Foto, das die gute Laune des Abends perfekt einfängt.' },
  { id: 152, cat: 'Die Stimmung', text: 'Macht ein „Geheimagent“-Foto – cool, lässig, mit Trinkglas als Requisite.' },
  { id: 153, cat: 'Die Stimmung', text: 'Stellt gemeinsam eine Filmplakat-Pose nach, dramatisch übertrieben.' },
  { id: 154, cat: 'Die Stimmung', text: 'Macht ein Foto, das nur Lachfalten zeigt – so nah wie möglich dran.' },
  { id: 155, cat: 'Die Stimmung', text: 'Baut mit den Händen einen Rahmen und „fotografiert“ eine dritte Person hindurch.' },
  { id: 156, cat: 'Die Stimmung', text: 'Macht ein Foto, das komplett übertrieben glücklich wirkt – Zähne blitzen lassen.' },
  { id: 157, cat: 'Die Stimmung', text: 'Stellt eine Zeitlupen-Bewegung nach und friert für das Foto genau mittendrin ein.' },
  { id: 158, cat: 'Die Stimmung', text: 'Macht ein Model-Shooting-Foto – ernster Blick, eine Hand in der Hüfte.' },
  { id: 159, cat: 'Die Stimmung', text: 'Findet die schrägste Pose, die euch spontan einfällt, und haltet sie für die Kamera.' },
  { id: 160, cat: 'Die Stimmung', text: 'Macht ein Foto, das zeigt, wie sehr ihr euch auf den Rest des Abends freut.' },

  // — Die Musik —
  { id: 161, cat: 'Die Musik', text: 'Finde jemanden, der gerade denselben Ohrwurm im Kopf hat wie du – summt ihn gemeinsam.' },
  { id: 162, cat: 'Die Musik', text: 'Spielt Luftgitarre zu zweit, so als stündet ihr auf der großen Bühne.' },
  { id: 163, cat: 'Die Musik', text: 'Finde jemanden, der schon mal auf einem Festival war, und tauscht die beste Konzert-Erinnerung aus.' },
  { id: 164, cat: 'Die Musik', text: 'Nennt gleichzeitig euren Lieblingssong des Abends – Treffer oder nicht, Foto dazu.' },
  { id: 165, cat: 'Die Musik', text: 'Stellt ein Album-Cover eurer Lieblingsband nach.' },
  { id: 166, cat: 'Die Musik', text: 'Finde jemanden und tanzt eine Sekunde lang wild, bevor die Kamera klickt.' },
  { id: 167, cat: 'Die Musik', text: 'Macht ein Foto, als wärt ihr eine Boygroup beim großen Gruppenfoto.' },
  { id: 168, cat: 'Die Musik', text: 'Finde die Person mit dem besten Tanzmove des Abends und lernt ihn kurz.' },
  { id: 169, cat: 'Die Musik', text: 'Lip-syncet gemeinsam eine Songzeile für die Kamera.' },
  { id: 170, cat: 'Die Musik', text: 'Finde jemanden, der Karaoke liebt, und haltet einen imaginären Mikro-Moment fest.' },
  { id: 171, cat: 'Die Musik', text: 'Findet die Person, die am längsten schon Musik macht oder gemacht hat, und feiert das im Bild.' },
  { id: 172, cat: 'Die Musik', text: 'Macht ein Foto mitten in einer spontanen Polonaise.' },
  { id: 173, cat: 'Die Musik', text: 'Findet zwei Leute mit gegensätzlichem Musikgeschmack und lasst sie sich die Hand geben – Waffenstillstand fürs Foto.' },
  { id: 174, cat: 'Die Musik', text: 'Stellt eine Rockstar-Landung nach – Sprung, imaginäre Gitarre, große Geste.' },
  { id: 175, cat: 'Die Musik', text: 'Finde jemanden, der schon mal in einem Chor oder einer Band war, und fragt nach der besten Bühnen-Erinnerung.' },

  // — Das Spiel —
  { id: 176, cat: 'Das Spiel', text: 'Macht einen Stein-Schere-Papier-Wettkampf – haltet den Siegermoment fest.' },
  { id: 177, cat: 'Das Spiel', text: 'Balanciert einen Löffel auf der Nase, so lange es geht – Foto vom Versuch.' },
  { id: 178, cat: 'Das Spiel', text: 'Macht einen Blickkontakt-Wettbewerb – wer zuerst lacht, verliert. Foto vom Moment des Lachens.' },
  { id: 179, cat: 'Das Spiel', text: 'Spielt kurz Armdrücken (fair und vorsichtig!) und haltet den Einsatz fest.' },
  { id: 180, cat: 'Das Spiel', text: 'Macht ein Foto von einem spontanen Daumenkrieg (Thumb War).' },
  { id: 181, cat: 'Das Spiel', text: 'Stellt eine Standbild-Challenge: Wer kann am längsten in einer lustigen Pose einfrieren?' },
  { id: 182, cat: 'Das Spiel', text: 'Spielt „Wer lacht zuerst“ zu zweit – Kamera bereit für den Verlierer-Moment.' },
  { id: 183, cat: 'Das Spiel', text: 'Macht ein Foto von einem improvisierten Tauziehen mit einem Schal oder Gürtel.' },
  { id: 184, cat: 'Das Spiel', text: 'Spielt kurz Schnick-Schnack-Schnuck um den letzten Snack auf dem Teller.' },
  { id: 185, cat: 'Das Spiel', text: 'Baut gemeinsam einen möglichst hohen Turm aus Bierdeckeln oder Servietten und fotografiert ihn, bevor er umfällt.' },
  { id: 186, cat: 'Das Spiel', text: 'Spielt eine Runde Fingerhakeln (sanft!) und haltet den Sieger fest.' },
  { id: 187, cat: 'Das Spiel', text: 'Versucht zu zweit, ohne Hände ein Stück Papier weiterzugeben – Foto vom Versuch.' },
  { id: 188, cat: 'Das Spiel', text: 'Macht einen spontanen Grimassen-Wettbewerb – wer die lustigste Fratze zieht, gewinnt.' },
  { id: 189, cat: 'Das Spiel', text: 'Spielt kurz Blinde Kuh mit verbundenen Augen (ein Schal reicht) – haltet die Verwirrung fest.' },
  { id: 190, cat: 'Das Spiel', text: 'Baut mit den Händen ein Schatten-Tier an der Wand und fotografiert den Schatten mit euch.' },

  // — Der Ort —
  { id: 191, cat: 'Der Ort', text: 'Findet den lautesten Ort der Party und macht dort ein Foto mit zugehaltenen Ohren.' },
  { id: 192, cat: 'Der Ort', text: 'Findet den ruhigsten Fleck der Location und genießt dort kurz die Stille – Foto dazu.' },
  { id: 193, cat: 'Der Ort', text: 'Macht ein Foto direkt vor der Musikanlage oder dem DJ-Pult.' },
  { id: 194, cat: 'Der Ort', text: 'Findet den höchsten Punkt der Location (Treppe, Bühne, Stufe) und posiert von oben.' },
  { id: 195, cat: 'Der Ort', text: 'Macht ein Foto direkt am Eingang – als Willkommensgruß für später.' },
  { id: 196, cat: 'Der Ort', text: 'Findet die schönste Aussicht (Fenster, draußen, Balkon) und haltet sie mit Menschen davor fest.' },
  { id: 197, cat: 'Der Ort', text: 'Macht ein Foto direkt neben der Tanzfläche, bevor ihr selbst tanzt.' },
  { id: 198, cat: 'Der Ort', text: 'Findet den Ort mit dem besten Essen und posiert stolz davor.' },
  { id: 199, cat: 'Der Ort', text: 'Macht ein Foto am Getränketisch – Prost auf die Location!' },
  { id: 200, cat: 'Der Ort', text: 'Findet eine Ecke, die noch niemand fotografiert hat, und macht das erste Bild dort.' },
  { id: 201, cat: 'Der Ort', text: 'Macht ein Foto direkt unter einer Lichterkette oder einem Deko-Element an der Decke.' },
  { id: 202, cat: 'Der Ort', text: 'Findet den gemütlichsten Sitzbereich und macht dort ein entspanntes Gruppenfoto.' },
  { id: 203, cat: 'Der Ort', text: 'Macht ein Foto draußen, falls möglich – frische Luft, freie Sicht.' },
  { id: 204, cat: 'Der Ort', text: 'Findet den Ort, an dem heute schon am meisten gelacht wurde, und fragt kurz warum.' },
  { id: 205, cat: 'Der Ort', text: 'Macht ein Foto direkt vor der Kuchen- oder Dessert-Station.' },
  { id: 206, cat: 'Der Ort', text: 'Findet den Ort, den ihr euch für den Rest des Abends als Stammplatz aussucht, und markiert ihn mit einem Foto.' },

  // — Der Morgen danach — (ab 08:00 Uhr am Tag nach dem Event, siehe dateutil.js)
  { id: 207, cat: 'Der Morgen danach', phase: 'day-after', text: 'Fotografiert das Katerfrühstück-Buffet, so wie es gerade aussieht.' },
  { id: 208, cat: 'Der Morgen danach', phase: 'day-after', text: 'Findet das lustigste Überbleibsel der Nacht und verewigt es.' },
  { id: 209, cat: 'Der Morgen danach', phase: 'day-after', text: 'Macht ein Aufräum-Team-Foto mit Putzlappen oder Mülltüte in der Hand.' },
  { id: 210, cat: 'Der Morgen danach', phase: 'day-after', text: 'Sucht das müdeste Gesicht am Frühstückstisch.' },
  { id: 211, cat: 'Der Morgen danach', phase: 'day-after', text: 'Ein Abschieds-Umarmungsfoto mit jemandem auf dem Heimweg.' },
  { id: 212, cat: 'Der Morgen danach', phase: 'day-after', text: 'Zeigt die Kaffeetasse, die euch heute Morgen gerettet hat.' },
  { id: 213, cat: 'Der Morgen danach', phase: 'day-after', text: 'Findet die Person mit der besten Restlaune trotz wenig Schlaf.' },
  { id: 214, cat: 'Der Morgen danach', phase: 'day-after', text: 'Macht ein Foto vom traurigsten Rest-Buffet.' },
  { id: 215, cat: 'Der Morgen danach', phase: 'day-after', text: 'Fotografiert zwei Leute, die sich gerade an gestern Abend erinnern — Gesichtsausdruck einfangen.' },
  { id: 216, cat: 'Der Morgen danach', phase: 'day-after', text: 'Ein letztes Gruppenfoto mit allen, die noch da sind.' },
  { id: 217, cat: 'Der Morgen danach', phase: 'day-after', text: 'Zeigt euren Blick nach draußen — wie sieht der Morgen danach aus?' },
  { id: 218, cat: 'Der Morgen danach', phase: 'day-after', text: 'Findet das kaputteste (aber ungefährliche) Deko-Teil und posiert damit.' },
];

const BY_ID = new Map(TASKS.map((t) => [t.id, t]));

export function taskById(id) {
  return BY_ID.get(id) ?? null;
}

export function taskCount() {
  return TASKS.length;
}

// Pure Auswahl-Pool für assignNextTask (src/server.js): Aufgaben derselben
// Phase (Party vs. day-after), ohne bereits erledigte (doneIds) und ohne die
// zuletzt zugewiesene (avoidId) — mit Fallback-Kaskade, falls diese Filter
// den Pool innerhalb der Phase leerlaufen lassen:
//   1. ohne done + ohne avoid
//   2. ohne avoid (falls 1. leer)
//   3. ohne Filter (falls 2. immer noch leer) — jeweils innerhalb der Phase.
export function eligibleTaskIds({ doneIds = new Set(), avoidId = null, wantDayAfter = false } = {}) {
  const phaseOk = (t) => (t.phase === 'day-after') === wantDayAfter;
  const idsWhere = (predicate) => TASKS.filter((t) => phaseOk(t) && predicate(t)).map((t) => t.id);

  let pool = idsWhere((t) => !doneIds.has(t.id) && t.id !== avoidId);
  if (pool.length === 0) pool = idsWhere((t) => t.id !== avoidId);
  if (pool.length === 0) pool = idsWhere(() => true);
  return pool;
}
