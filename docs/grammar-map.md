# Grammar map

Every rule the app could drill, numbered, from A1 to B2. It is a checklist:
each rule becomes one or more drills, and the status shows how far we are.

- **Level**: where the rule is usually taught (A1 = first months, B2 = upper
  intermediate). Many rules start at one level and get finished at the next.
- **★** = a rule from Carlos's known weak spots (word order, articles,
  Akkusativ/Dativ, prepositions, Präteritum). These go first.
- **Status**: ✅ drill exists · ◐ partly covered · blank = not started

The numbers are used by the pipeline, the baseline and the app (step 5
gives every sentence the numbers of the rules it shows: see
scripts/pipeline/lib/rules.mjs). **Never renumber**: add a new rule at the
end of its section. The Rule column is read as the rule's name, and the
Level column must stay in the form A1, A2–B1…

Draft 1 (2026-10-30), written from general knowledge. Still to do: compare
with the Goethe-Institut A1/A2/B1 exam lists and a grammar book's table of
contents, and add what is missing.

## 1. Nouns and articles

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 1.1 | Gender: der / die / das, and word endings that give it away (-ung → die, -chen → das) | **die** Wohnung, **das** Mädchen | A1 | ✅ |
| 1.2 | Plural forms | der Tisch → die Tisch**e**, das Buch → die B**ü**ch**er** | A1–A2 | ✅ |
| 1.3 ★ | Nominativ, definite article | **Der** Hund ist neu. | A1 | ✅ |
| 1.4 ★ | Nominativ, ein / eine / kein | Das ist **ein** Hund, **keine** Katze. | A1 | |
| 1.5 ★ | Akkusativ, definite article | Ich sehe **den** Hund. | A1 | ✅ |
| 1.6 ★ | Akkusativ, einen / eine / ein / keinen | Ich brauche **einen** Schlüssel. | A1 | |
| 1.7 ★ | Dativ, definite article | mit **dem** Auto, mit **der** Katze | A2 | ✅ |
| 1.8 ★ | Dativ, einem / einer / keinem | mit **einem** Freund | A2 | |
| 1.9 ★ | Dativ plural: den + noun with -n | mit den Kinder**n** | A2 | ✅ |
| 1.10 | Possessives: mein, dein, sein, ihr, unser, euer, Ihr (same endings as ein) | Ich suche **meinen** Schlüssel. | A1–A2 | |
| 1.11 | dieser, jeder, welcher (same endings as der) | **Welchen** Bus nimmst du? | A2 | |
| 1.12 | Genitiv: des / der, noun + -s | das Auto **des** Mann**es** | B1 | |
| 1.13 | n-Deklination: some masculine nouns get -n | Ich frage **den** Kollege**n**. | B1 | ◐ |

1.1 is the "Gender" drill: 3,000 common nouns, blocks by ending (-ung,
-heit/-keit, -chen…), days/months/seasons, and common nouns with no rule.

1.2 is the "Plural" drill: about 2,200 nouns whose plural is really used,
in patterns (-ung → -ungen, die … -e → -n, -chen → no change…) and "learn
by heart" groups (short der and das words, die Stadt → Städte).

1.3, 1.5, 1.7 and 1.9 are the "Cases" drill: about 380 concrete nouns
(people, things, places, food, animals), each in Nominativ, Akkusativ and
Dativ, singular and plural, one row under the other. The groups come from
the dictionaries (see scripts/build-nouns.mjs); the older "Articles & cases"
drill with its 21 hand-picked nouns is still there.
Each set builds new sentences from parts (src/drills/case-patterns.ts):
different subjects, verbs and prepositions, and a learning path: normal
order, then a time word first, then the noun first, then mixed. The
Nominativ also covers 8.2 (subject after the verb) along the way.

1.13 is partly covered there: nouns like der Präsident → den Präsidenten
use their Akkusativ and Dativ forms from Wiktionary, and the explanation
says why. A drill of its own is still to come.

## 2. Pronouns

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 2.1 | Personal pronouns, Nominativ | **ich**, **du**, **er**, **sie**, **es**… | A1 | |
| 2.2 ★ | Personal pronouns, Akkusativ | Ich sehe **dich**. | A1 | |
| 2.3 ★ | Personal pronouns, Dativ | Kannst du **mir** helfen? | A2 | |
| 2.4 | Reflexive pronouns (Akkusativ and Dativ) | Ich freue **mich**. Ich wasche **mir** die Hände. | A2–B1 | |
| 2.5 | man, jemand, niemand, etwas, nichts | Hier darf **man** nicht rauchen. | A2 | |
| 2.6 | Relative pronouns | der Mann, **den** ich kenne / **dem** ich helfe | B1 | |
| 2.7 | Relative pronouns, Genitiv | die Frau, **deren** Auto… | B2 | |
| 2.8 | da- / wo- words for prepositions | Ich warte **darauf**. **Worauf** wartest du? | B1 | |

## 3. Prepositions

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 3.1 ★ | Always Akkusativ: durch, für, gegen, ohne, um, bis | **für den** Chef | A2 | ◐ |
| 3.2 ★ | Always Dativ: aus, bei, mit, nach, seit, von, zu, gegenüber | **mit dem** Bus | A2 | ◐ |
| 3.3 ★ | Two-way (in, an, auf, über, unter, vor, hinter, neben, zwischen): wo? → Dativ, wohin? → Akkusativ | Ich bin **im** Park. Ich gehe **in den** Park. | A2 | |
| 3.4 ★ | Contractions | in dem → **im**, zu der → **zur**, in das → **ins**, von dem → **vom** | A1–A2 | |
| 3.5 | Time: am, im, um, seit, vor, ab | **am** Montag, **im** Mai, **um** acht, **seit** drei Jahren | A2 | |
| 3.6 | Places: nach / zu / in, bei / aus / von | **nach** Mexiko, **zum** Arzt, **in die** Schweiz | A2 | |
| 3.7 ★ | Verbs with a fixed preposition | warten **auf** + Akk, denken **an** + Akk, Angst haben **vor** + Dat | B1 | |
| 3.8 | Genitiv prepositions: wegen, trotz, während, statt | **wegen des** Wetters | B1 | |

## 4. Adjectives

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 4.1 | After sein / werden: no ending | Der Tisch ist **neu**. | A1 | |
| 4.2 | Endings after der / die / das | der neu**e** Tisch, mit dem neu**en** Tisch | A2–B1 | |
| 4.3 | Endings after ein / kein / mein | ein neu**er** Tisch, ein neu**es** Auto | A2–B1 | |
| 4.4 | Endings with no article | kalt**es** Wasser, mit kalt**em** Wasser | B1 | |
| 4.5 | Comparative and superlative | groß → gr**ö**ß**er** → am gr**ö**ß**ten**; gut → besser → am besten | A2 | |
| 4.6 | Adjectives as nouns | der Deutsch**e**, ein Deutsch**er** | B2 | |
| 4.7 | Participles as adjectives | das gekocht**e** Ei, die schlafend**e** Katze | B2 | |

## 5. Verbs: the present

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 5.1 | Regular endings | ich mach**e**, du mach**st**, er mach**t** | A1 | |
| 5.2 | Vowel change in du / er | fahren → du f**ä**hrst, sprechen → er spr**i**cht | A1 | |
| 5.3 | sein, haben, werden | ich **bin**, du **hast**, er **wird** | A1 | |
| 5.4 | Modal verbs | können, müssen, dürfen, sollen, wollen, möchten | A1 | |
| 5.5 | Separable verbs | anrufen → Ich **rufe** dich morgen **an**. | A1 | |
| 5.6 | Inseparable prefixes (be-, ver-, er-, ent-…) | verstehen → Ich **verstehe** das. | A2 | |
| 5.7 | Imperative | **Komm!** **Kommt!** **Kommen Sie!** | A1–A2 | |
| 5.8 | Reflexive verbs | sich freuen, sich erinnern | A2 | |
| 5.9 ★ | Verbs with a Dativ object | helfen, danken, gefallen, gehören: Das gehört **mir**. | A2 | |
| 5.10 ★ | Verbs with Dativ + Akkusativ | Ich gebe **dem** Kind **den** Ball. | A2 | |

## 6. Verbs: the past

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 6.1 | Perfekt with haben | Ich **habe** gearbeitet. | A1–A2 | |
| 6.2 | Perfekt with sein (movement, change, sein / bleiben) | Ich **bin** gefahren. Er **ist** geblieben. | A2 | |
| 6.3 | Partizip II: regular, irregular, separable, no ge- | gemacht, gegangen, an**ge**rufen, studiert, verstanden | A2 | |
| 6.4 ★ | Präteritum of sein, haben and modal verbs | ich **war**, ich **hatte**, ich **konnte** | A2 | |
| 6.5 ★ | Präteritum, regular verbs | ich mach**te**, wir mach**ten** | B1 | |
| 6.6 ★ | Präteritum, irregular verbs | gehen → ich **ging**, kommen → ich **kam** | B1 | |
| 6.7 | Plusquamperfekt | Ich **hatte** schon gegessen. | B1 | |

## 7. Future, Konjunktiv, Passiv

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 7.1 | Futur I | Ich **werde** morgen **arbeiten**. | B1 | |
| 7.2 | Konjunktiv II, present: würde, hätte, wäre, könnte | Ich **würde** gern kommen. **Hätte** ich Zeit… | A2–B1 | |
| 7.3 | Konjunktiv II, past | Ich **hätte** das **gemacht**. | B1–B2 | |
| 7.4 | lassen + infinitive | Ich **lasse** das Auto **reparieren**. | B1 | |
| 7.5 | Passiv, present | Das Haus **wird gebaut**. | B1 | |
| 7.6 | Passiv, past | Das Haus **wurde gebaut**. / **ist gebaut worden**. | B1–B2 | |
| 7.7 | Passiv with a modal verb | Das **muss gemacht werden**. | B2 | |
| 7.8 | Konjunktiv I (reported speech) | Er sagt, er **sei** krank. | B2 | |
| 7.9 | Futur II | Er **wird** schon **gegangen sein**. | B2 | |

## 8. Word order

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 8.1 ★ | The verb is always 2nd in a main clause | Ich **arbeite** heute. | A1 | |
| 8.2 ★ | Something else first → the subject comes after the verb | Heute **arbeite ich**. | A1 | |
| 8.3 | Questions: W-question and yes/no question | **Wo** wohnst du? **Wohnst** du hier? | A1 | |
| 8.4 ★ | Two-part verbs: second part at the end | Ich **kann** heute nicht **kommen**. Ich **habe** das **gemacht**. | A1–A2 | |
| 8.5 | Where nicht goes | Ich komme **nicht**. Ich komme **nicht** mit. | A2 | |
| 8.6 ★ | und, aber, oder, denn, sondern: no change in word order | …, **denn** ich **bin** müde. | A2 | |
| 8.7 ★ | weil, dass, wenn, ob, als…: verb at the end | …, **weil** ich müde **bin**. | A2–B1 | |
| 8.8 ★ | Subordinate clause first → verb, comma, verb | **Wenn** ich Zeit **habe**, **komme** ich. | A2 | |
| 8.9 ★ | deshalb, trotzdem, dann, danach…: verb right after them | …, **deshalb bleibe** ich zu Hause. | B1 | |
| 8.10 | Indirect questions | Weißt du, **wo** er **wohnt**? | B1 | |
| 8.11 | Middle of the sentence: time, reason, manner, place | Ich fahre **morgen wegen der Arbeit mit dem Zug nach Hamburg**. | B1 | |
| 8.12 | Order of the two objects | Ich gebe **dem Kind den Ball**. Ich gebe **ihn ihm**. | B1 | |
| 8.13 | zu + infinitive, um … zu, ohne … zu | Ich lerne Deutsch, **um** hier **zu arbeiten**. | B1 | |
| 8.14 | Relative clauses: verb at the end | Das ist der Mann, der hier **wohnt**. | B1 | |
| 8.15 | Two-part connectors | entweder … oder, weder … noch, sowohl … als auch, je … desto | B2 | |

## 9. Other

| # | Rule | Example | Level | Status |
|---|---|---|---|---|
| 9.1 | kein or nicht | Ich habe **kein** Auto. Das Auto ist **nicht** neu. | A1 | |
| 9.2 | Numbers, the time, dates | **halb** acht, **am** dritten Mai | A1 | |
| 9.3 | als, wenn or wann | **Als** ich jung war… / **Wenn** ich Zeit habe… / **Wann** kommst du? | B1 | |
| 9.4 | Small words that add tone: doch, mal, ja, eben | Komm **doch mal** vorbei! | B1–B2 | |
| 9.5 | Nouns from verbs | entscheiden → **die Entscheidung** treffen | B2 | |
| 9.6 | Fixed noun + verb pairs | eine Frage **stellen**, **zur Verfügung stellen** | B2 | |
