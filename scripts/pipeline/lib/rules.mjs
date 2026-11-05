// Which rules of docs/grammar-map.md a labelled sentence shows.
// The numbers are the map's: never renumber the map, add new rules at the end
// of a section instead (the baseline and the learner's progress use them).
//
// Each rule looks at the step 5 tags ("mit+Dativ", "Präteritum-regelmäßig"…)
// and at the preposition phrases (slots with case, gender, number).

const has = (s, tag) => s.labels.includes(tag);
const tagMatches = (s, re) => s.labels.some((l) => re.test(l));
// Clear phrases only: the case is right for the preposition.
const phrase = (s, test) => s.phrases.some((p) => p.ok && test(p));
const article = (p) => p.slots[1] ?? {};

export const RULES = {
  "1.7": (s) => phrase(s, (p) => p.case === "Dat" && article(p).role === "def"),
  "1.8": (s) => phrase(s, (p) => p.case === "Dat" && (article(p).role === "indef" || /^kein/i.test(article(p).text ?? ""))),
  "1.9": (s) => phrase(s, (p) => p.case === "Dat" && /^den$/i.test(article(p).text ?? "") && p.slots.at(-1).number === "Plur"),
  "1.10": (s) => phrase(s, (p) => p.slots.some((x) => x.role === "poss")),
  "3.1": (s) => tagMatches(s, /^(durch|für|gegen|ohne|um|bis)\+Akkusativ$/),
  "3.2": (s) => tagMatches(s, /^(aus|bei|mit|nach|seit|von|zu|gegenüber)\+Dativ$/),
  "3.3": (s) => tagMatches(s, /^(in|an|auf|über|unter|vor|hinter|neben|zwischen)\+(Akkusativ|Dativ)$/),
  "3.4": (s) => phrase(s, (p) => p.slots[0].role === "prepart"),
  "3.8": (s) => tagMatches(s, /^(wegen|trotz|während|statt|anstatt)\+Genitiv$/),
  "5.4": (s) => has(s, "Modalverb"),
  // "Seid ihr …?" looks like an imperative to the parser, but it is a question.
  "5.7": (s) => has(s, "Imperativ") && !has(s, "Frage"),
  "5.9": (s) => has(s, "Dativ-Objekt"),
  "5.10": (s) => has(s, "Dativ-Objekt") && has(s, "Akkusativ-Objekt"),
  "6.1": (s) => has(s, "Perfekt-haben"),
  // Edge case, not solved: "ist + Partizip" can also be a state (Zustandspassiv):
  // "Das Fenster ist geöffnet." looks exactly like "Er ist gegangen."
  "6.2": (s) => has(s, "Perfekt-sein"),
  "6.4": (s) => has(s, "Präteritum-sein/haben/Modal"),
  "6.5": (s) => has(s, "Präteritum-regelmäßig"),
  "6.6": (s) => has(s, "Präteritum-unregelmäßig"),
  "6.7": (s) => has(s, "Plusquamperfekt"),
  "7.2": (s) => has(s, "Konjunktiv-II"),
  "7.3": (s) => has(s, "Konjunktiv-II-Vergangenheit"),
  // 7.8 (Konjunktiv I) is not trusted yet: imperatives ("Bitte leihe mir…",
  // "Nutze es aus") look the same to the parser. The tag "Konjunktiv-I" stays
  // on the sentences, so it can come back once it finds the right ones.
  "8.3": (s) => has(s, "Frage"),
  "8.7": (s) => tagMatches(s, /^(weil|dass|wenn|ob|als|obwohl|damit|nachdem|bevor|während|bis|seit|seitdem|sobald|falls)-Nebensatz$/),
  "8.8": (s) => has(s, "Nebensatz-vorne"),
  "8.14": (s) => has(s, "Relativsatz"),
  "2.6": (s) => has(s, "Relativsatz"),
  "9.3": (s) => tagMatches(s, /^(als|wenn)-Nebensatz$/),
};

/** The grammar map rules this sentence shows, in map order. */
export function rulesOf(s) {
  return Object.keys(RULES).filter((id) => RULES[id](s)).sort(byNumber);
}

export function byNumber(a, b) {
  const [a1, a2] = a.split(".").map(Number);
  const [b1, b2] = b.split(".").map(Number);
  return a1 - b1 || a2 - b2;
}

/**
 * The rules from docs/grammar-map.md: [{ id, title, level, star }].
 * Reads the table rows: "| 3.2 ★ | Always Dativ: … | mit dem Bus | A2 | ◐ |"
 */
export function parseGrammarMap(markdown) {
  const rules = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(/^\|\s*(\d+\.\d+)\s*(★)?\s*\|([^|]+)\|[^|]*\|\s*([AB][12](?:–[AB][12])?)\s*\|/);
    if (m) rules.push({ id: m[1], title: m[3].trim(), level: m[4], star: !!m[2] });
  }
  return rules;
}
