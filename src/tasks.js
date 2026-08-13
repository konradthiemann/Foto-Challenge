// Foto-Challenges für die Party. Jede Aufgabe = ein Foto mit jemandem/etwas.
// Ziel: die Gemeinschaft stärken, verbinden, Spaß haben — niemanden bloßstellen.
// Jede Aufgabe hat eine Kategorie (cat) und einen Text (text).

export const TASKS = [
  // — Der Klassiker —
  { cat: 'Der Klassiker', text: 'Finde jemanden, den du noch nicht kennst, und posiert zusammen wie Rockstars.' },
  { cat: 'Der Klassiker', text: 'Macht ein klassisches Gruppenfoto zu dritt – Arme umeinander, breites Grinsen.' },
  { cat: 'Der Klassiker', text: 'Findet die perfekte Ecke für ein gemeinsames Selfie mit mindestens vier Leuten.' },
  { cat: 'Der Klassiker', text: 'Macht ein Foto, auf dem alle in die Luft springen – gleichzeitig!' },
  { cat: 'Der Klassiker', text: 'Stellt ein berühmtes Albumcover zu zweit nach.' },
  { cat: 'Der Klassiker', text: 'Findet jemanden für ein feierliches Anstoßen und haltet den Moment fest.' },
  { cat: 'Der Klassiker', text: 'Baut eine kleine Menschenpyramide (sitzend zählt auch!) und lasst euch ablichten.' },

  // — Der Zufall —
  { cat: 'Der Zufall', text: 'Finde jemanden, der im selben Monat Geburtstag hat wie du. Gratuliert euch gegenseitig.' },
  { cat: 'Der Zufall', text: 'Finde jemanden mit denselben Anfangsbuchstaben im Vornamen wie du.' },
  { cat: 'Der Zufall', text: 'Finde jemanden, der genauso große (oder kleine) Schuhe trägt wie du.' },
  { cat: 'Der Zufall', text: 'Finde jemanden, der im selben Sternzeichen geboren ist wie du.' },
  { cat: 'Der Zufall', text: 'Finde jemanden, der aus demselben Ort kommt oder dort schon mal gewohnt hat.' },
  { cat: 'Der Zufall', text: 'Finde jemanden, der dasselbe Lieblingsgetränk hat wie du. Prost!' },
  { cat: 'Der Zufall', text: 'Finde jemanden, der heute dasselbe Verkehrsmittel benutzt hat wie du.' },

  // — Das Outfit —
  { cat: 'Das Outfit', text: 'Finde jemanden, der etwas in deiner Lieblingsfarbe trägt. Zeigt stolz auf die Kleidung.' },
  { cat: 'Das Outfit', text: 'Finde jemanden mit den coolsten Schuhen des Abends und fotografiert sie zusammen.' },
  { cat: 'Das Outfit', text: 'Finde zwei Leute, die zufällig etwas Ähnliches tragen – Partnerlook!' },
  { cat: 'Das Outfit', text: 'Finde jemanden mit einem auffälligen Accessoire (Hut, Kette, Brille) und posiert damit.' },
  { cat: 'Das Outfit', text: 'Tauscht für ein Foto ein Kleidungsstück oder Accessoire miteinander.' },
  { cat: 'Das Outfit', text: 'Findet die eleganteste Person im Raum und macht ein Foto auf dem roten Teppich (auch ohne Teppich).' },
  { cat: 'Das Outfit', text: 'Finde jemanden, der Karos, Streifen oder Punkte trägt, und feiert das Muster.' },

  // — Das Talent —
  { cat: 'Das Talent', text: 'Finde jemanden mit einem versteckten Talent und haltet es im Bild fest.' },
  { cat: 'Das Talent', text: 'Finde jemanden, der jonglieren, pfeifen oder eine Grimasse ziehen kann – Beweisfoto!' },
  { cat: 'Das Talent', text: 'Findet jemanden, der einen kleinen Tanzschritt zeigt, und tanzt mit.' },
  { cat: 'Das Talent', text: 'Finde jemanden, der ein Tier täuschend echt imitieren kann. Macht das Foto im Moment.' },
  { cat: 'Das Talent', text: 'Findet jemanden, der die Zunge rollen oder mit den Ohren wackeln kann.' },
  { cat: 'Das Talent', text: 'Finde jemanden, der euch einen Zaubertrick zeigt, und fangt die Überraschung ein.' },

  // — Die Crew —
  { cat: 'Die Crew', text: 'Sammelt alle mit derselben Haarfarbe wie du für ein Team-Foto.' },
  { cat: 'Die Crew', text: 'Findet alle, die heute zum ersten Mal hier sind, und macht ein Neulings-Foto.' },
  { cat: 'Die Crew', text: 'Bildet eine Kette aus Händen mit mindestens fünf Leuten und fotografiert sie.' },
  { cat: 'Die Crew', text: 'Findet drei Leute, die dasselbe Hobby haben wie du.' },
  { cat: 'Die Crew', text: 'Versammelt alle, die schon einmal gemeinsam gereist sind, für ein Erinnerungsfoto.' },
  { cat: 'Die Crew', text: 'Bildet die längste Menschenreihe, die ihr auf ein Foto bekommt.' },

  // — Die Geste —
  { cat: 'Die Geste', text: 'Mach ein Kompliment und halte das Lächeln der Person im Foto fest.' },
  { cat: 'Die Geste', text: 'Finde jemanden, dem du heute noch nicht Hallo gesagt hast, und begrüßt euch herzlich.' },
  { cat: 'Die Geste', text: 'Umarmt euch zur Begrüßung und lasst den Moment fotografieren.' },
  { cat: 'Die Geste', text: 'Bring jemandem einen Drink oder Snack und haltet die Übergabe im Bild fest.' },
  { cat: 'Die Geste', text: 'Findet jemanden, dem ihr für etwas danken möchtet, und macht ein Dankeschön-Foto.' },
  { cat: 'Die Geste', text: 'Bildet mit den Händen gemeinsam ein Herz und fotografiert es.' },
  { cat: 'Die Geste', text: 'High five mit einer Person, die du heute zum ersten Mal triffst – im richtigen Moment ausgelöst.' },

  // — Das Detail —
  { cat: 'Das Detail', text: 'Findet zwei Leute mit demselben Getränk und stellt die Gläser nebeneinander.' },
  { cat: 'Das Detail', text: 'Sucht das schönste Detail der Location und stellt euch davor.' },
  { cat: 'Das Detail', text: 'Findet etwas Herzförmiges im Raum und posiert damit.' },
  { cat: 'Das Detail', text: 'Findet die schönsten Blumen oder Deko und macht ein Foto damit.' },
  { cat: 'Das Detail', text: 'Findet jemanden mit einem interessanten Ring oder Armband und rückt es ins Bild.' },
  { cat: 'Das Detail', text: 'Baut aus Dingen auf dem Tisch ein kleines Kunstwerk und fotografiert es mit jemandem.' },

  // — Der Moment —
  { cat: 'Der Moment', text: 'Fangt einen ehrlichen Lachmoment zu zweit ein – erst quatschen, dann auslösen.' },
  { cat: 'Der Moment', text: 'Findet jemanden zum Anstoßen und drückt genau beim „Kling“ ab.' },
  { cat: 'Der Moment', text: 'Haltet den Moment fest, in dem ihr gemeinsam etwas Neues probiert.' },
  { cat: 'Der Moment', text: 'Macht ein Foto mitten im Gespräch – natürlich, nicht gestellt.' },
  { cat: 'Der Moment', text: 'Findet die gemütlichste Ecke der Party und macht dort ein entspanntes Foto zu zweit.' },
  { cat: 'Der Moment', text: 'Fangt einen gemeinsamen Tanzmoment ein.' },

  // — Die Verbindung —
  { cat: 'Die Verbindung', text: 'Finde jemanden und findet drei Gemeinsamkeiten heraus – dann ein Foto zusammen.' },
  { cat: 'Die Verbindung', text: 'Lass dir von jemandem seinen Lieblingsort auf dem Handy zeigen und macht ein Foto dazu.' },
  { cat: 'Die Verbindung', text: 'Finde die Person, die von am weitesten weg angereist ist, und feiert das im Bild.' },
  { cat: 'Die Verbindung', text: 'Finde jemanden, der ein Instrument spielt, und macht ein Foto mit „Luftinstrument“.' },
  { cat: 'Die Verbindung', text: 'Finde jemanden, der denselben Film liebt wie du, und stellt eine Szene nach.' },
  { cat: 'Die Verbindung', text: 'Finde jemanden mit demselben Lieblingsessen und träumt gemeinsam davon (Foto!).' },
  { cat: 'Die Verbindung', text: 'Lass dir einen Trick oder Life-Hack zeigen und haltet ihn im Bild fest.' },

  // — Die Stimmung —
  { cat: 'Die Stimmung', text: 'Macht gemeinsam die dramatischste Pose, die euch einfällt.' },
  { cat: 'Die Stimmung', text: 'Findet das beste Licht im Raum und macht dort ein Foto zu zweit.' },
  { cat: 'Die Stimmung', text: 'Zeigt zu dritt drei verschiedene Gefühle auf einem Foto.' },
  { cat: 'Die Stimmung', text: 'Macht ein „So cool sind wir“-Foto mit Sonnenbrille (oder so getan als ob).' },
  { cat: 'Die Stimmung', text: 'Stellt gemeinsam eure Lieblings-Emoji nach.' },
  { cat: 'Die Stimmung', text: 'Findet jemanden für ein „Vorher/Nachher“ – erst ernst, dann albern, in einem Bild-Duo.' },
  { cat: 'Die Stimmung', text: 'Macht ein Foto, das die gute Laune des Abends perfekt einfängt.' },
];

export function taskById(id) {
  return TASKS[id] ? { id, ...TASKS[id] } : null;
}

export function taskCount() {
  return TASKS.length;
}
